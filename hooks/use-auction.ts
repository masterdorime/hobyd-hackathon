"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import {
  AuctionApiError,
  closeItemRequest,
  fetchAuctionSnapshot,
  getCurrentUserId,
  postBid,
  startItemRequest,
} from "@/lib/client/auction-api";
import {
  createAuctionRealtime,
  type AuctionConnectionState,
  type AuctionRealtimeController,
  type AuctionSnapshot,
} from "@/lib/client/auction-realtime";
import type { BidWithName, Item } from "@/lib/types";
import { resolveAuthoritativeWinner } from "@/lib/auction-winner";

export type AuctionFeedback = {
  kind: "success" | "error" | "info";
  code: string;
} | null;

const ACTIVE = new Set(["live", "ending", "extended"]);

export function useAuction({
  roomId,
  initialItems,
  initialBids,
}: {
  roomId: string;
  initialItems: Item[];
  initialBids: BidWithName[];
}) {
  const initialActive = initialItems.find((item) => ACTIVE.has(item.status));
  const [snapshot, setSnapshot] = useState<AuctionSnapshot>({ items: initialItems, bids: initialBids });
  const [selectedItemId, setSelectedItemId] = useState(initialActive?.id ?? initialItems[0]?.id ?? null);
  const [connection, setConnection] = useState<AuctionConnectionState>("idle");
  const [pending, setPending] = useState(false);
  const [closePending, setClosePending] = useState(false);
  const [feedback, setFeedback] = useState<AuctionFeedback>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const controllerRef = useRef<AuctionRealtimeController | null>(null);
  const closingRef = useRef(new Set<string>());
  const redirectedRef = useRef(new Set<string>());
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    let active = true;
    void getCurrentUserId()
      .then((userId) => { if (active) setCurrentUserId(userId); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const activeItems = snapshot.items.filter((item) => ACTIVE.has(item.status));
  const selectedItem = snapshot.items.find((item) => item.id === selectedItemId)
    ?? activeItems[0]
    ?? snapshot.items[0]
    ?? null;
  const selectedBids = selectedItem
    ? snapshot.bids.filter((bid) => bid.item_id === selectedItem.id)
    : [];

  useEffect(() => {
    const controller = createAuctionRealtime({
      roomId,
      initialSnapshot: snapshot,
      onChange: setSnapshot,
      onConnection: setConnection,
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controllerRef.current = null;
      void controller.dispose();
    };
    // Reconnect only on room change; item/bid updates flow through the controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const refetchAndSync = useCallback(async () => {
    try {
      const latest = await fetchAuctionSnapshot(roomId);
      if (controllerRef.current) controllerRef.current.sync(latest);
      else setSnapshot(latest);
      return latest;
    } catch {
      setConnection("disconnected");
      return null;
    }
  }, [roomId]);

  const closeById = useCallback(async (itemId: string) => {
    if (closingRef.current.has(itemId)) return null;
    closingRef.current.add(itemId);
    try {
      const result = await closeItemRequest(itemId);
      const latest = await refetchAndSync();
      const winner = resolveAuthoritativeWinner(itemId, result.winner, latest?.items);
      if (winner && currentUserId === winner && !redirectedRef.current.has(itemId)) {
        redirectedRef.current.add(itemId);
        router.push(`/${locale}/win/${itemId}`);
      }
      return { result, latest };
    } finally {
      closingRef.current.delete(itemId);
    }
  }, [currentUserId, locale, refetchAndSync, router]);

  useEffect(() => {
    if (!currentUserId) return;
    const wonItem = snapshot.items.find((item) =>
      item.status === "closed" &&
      item.winner === currentUserId &&
      !redirectedRef.current.has(item.id),
    );
    if (wonItem) {
      redirectedRef.current.add(wonItem.id);
      router.push(`/${locale}/win/${wonItem.id}`);
    }
  }, [currentUserId, locale, router, snapshot.items]);

  useEffect(() => {
    const timers = activeItems.flatMap((item) => {
      if (!item.ends_at) return [];
      const delay = Math.max(0, Date.parse(item.ends_at) - Date.now());
      return [window.setTimeout(() => { void closeById(item.id); }, delay + 100)];
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activeItems, closeById]);

  const placeBid = useCallback(async (amount: number) => {
    if (!selectedItem || pending || !ACTIVE.has(selectedItem.status)) return null;
    setPending(true);
    setFeedback(null);
    try {
      const result = await postBid(selectedItem.id, amount);
      await refetchAndSync();
      setFeedback({ kind: result.extended ? "info" : "success", code: result.extended ? "EXTENDED" : "ACCEPTED" });
      return result;
    } catch (error) {
      setFeedback({ kind: "error", code: error instanceof AuctionApiError ? error.code : "UPSTREAM_ERROR" });
      return null;
    } finally {
      setPending(false);
    }
  }, [pending, refetchAndSync, selectedItem]);

  const startItem = useCallback(async (itemId: string) => {
    setPending(true);
    setFeedback(null);
    try {
      const started = await startItemRequest(itemId);
      setSelectedItemId(started.id);
      await refetchAndSync();
      return started;
    } catch (error) {
      setFeedback({ kind: "error", code: error instanceof AuctionApiError ? error.code : "UPSTREAM_ERROR" });
      return null;
    } finally {
      setPending(false);
    }
  }, [refetchAndSync]);

  const closeItem = useCallback(async () => {
    if (!selectedItem || closePending) return null;
    setClosePending(true);
    try {
      return await closeById(selectedItem.id);
    } catch (error) {
      setFeedback({ kind: "error", code: error instanceof AuctionApiError ? error.code : "UPSTREAM_ERROR" });
      return null;
    } finally {
      setClosePending(false);
    }
  }, [closeById, closePending, selectedItem]);

  return {
    items: snapshot.items,
    bids: snapshot.bids,
    activeItems,
    selectedItem,
    selectedBids,
    selectItem: setSelectedItemId,
    connection,
    pending,
    closePending,
    feedback,
    currentUserId,
    placeBid,
    startItem,
    closeItem,
  };
}
