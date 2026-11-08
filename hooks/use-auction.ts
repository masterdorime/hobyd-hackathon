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
  const controllerRef = useRef<AuctionRealtimeController | null>(null);
  const closingRef = useRef(new Set<string>());
  const router = useRouter();
  const locale = useLocale();

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
      if (result.winner) {
        const currentUserId = await getCurrentUserId();
        if (currentUserId === result.winner && selectedItemId === itemId) {
          router.push(`/${locale}/win/${itemId}`);
        }
      }
      return { result, latest };
    } finally {
      closingRef.current.delete(itemId);
    }
  }, [locale, refetchAndSync, router, selectedItemId]);

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
    placeBid,
    startItem,
    closeItem,
  };
}
