"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AuctionApiError,
  closeItemRequest,
  fetchAuctionSnapshot,
  postBid,
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

export function useAuction({
  roomId,
  initialItem,
  initialBids,
}: {
  roomId: string;
  initialItem: Item | null;
  initialBids: BidWithName[];
}) {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot>({
    item: initialItem,
    bids: initialBids,
  });
  const [connection, setConnection] = useState<AuctionConnectionState>("idle");
  const [pending, setPending] = useState(false);
  const [closePending, setClosePending] = useState(false);
  const [feedback, setFeedback] = useState<AuctionFeedback>(null);
  const controllerRef = useRef<AuctionRealtimeController | null>(null);

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
    // The controller reconnects only for a room change; bid/item updates flow through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const refetchAndSync = useCallback(async () => {
    try {
      const latest = await fetchAuctionSnapshot(roomId);
      if (controllerRef.current) {
        controllerRef.current.sync(latest);
      } else {
        setSnapshot(latest);
      }
      return true;
    } catch {
      setConnection("disconnected");
      return false;
    }
  }, [roomId]);

  const placeBid = useCallback(async (amount: number) => {
    const item = snapshot.item;
    if (!item || pending) {
      return null;
    }
    setPending(true);
    setFeedback(null);
    try {
      const result = await postBid(item.id, amount);
      await refetchAndSync();
      setFeedback({ kind: result.extended ? "info" : "success", code: result.extended ? "EXTENDED" : "ACCEPTED" });
      return result;
    } catch (error) {
      setFeedback({
        kind: "error",
        code: error instanceof AuctionApiError ? error.code : "UPSTREAM_ERROR",
      });
      return null;
    } finally {
      setPending(false);
    }
  }, [pending, refetchAndSync, snapshot.item]);

  const closeItem = useCallback(async () => {
    const item = snapshot.item;
    if (!item || closePending) {
      return null;
    }
    setClosePending(true);
    try {
      const result = await closeItemRequest(item.id);
      await refetchAndSync();
      return result;
    } catch (error) {
      setFeedback({
        kind: "error",
        code: error instanceof AuctionApiError ? error.code : "UPSTREAM_ERROR",
      });
      return null;
    } finally {
      setClosePending(false);
    }
  }, [closePending, refetchAndSync, snapshot.item]);

  return {
    item: snapshot.item,
    bids: snapshot.bids,
    connection,
    pending,
    closePending,
    feedback,
    placeBid,
    closeItem,
  };
}
