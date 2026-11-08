import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { fetchAuctionSnapshot } from "./auction-api";
import type { Bid, BidWithName, Item } from "@/lib/types";

export type AuctionSnapshot = { item: Item | null; bids: BidWithName[] };
export type AuctionConnectionState = "idle" | "connecting" | "connected" | "disconnected";

export type AuctionRealtimeHandlers = {
  onItem(item: Item): void;
  onBid(bid: BidWithName): void;
  onStatus(status: string): void;
};

type Options = {
  initialSnapshot: AuctionSnapshot;
  subscribe(handlers: AuctionRealtimeHandlers): unknown;
  refetchSnapshot(): Promise<AuctionSnapshot>;
  removeChannel(channel: unknown): unknown;
  onChange(snapshot: AuctionSnapshot): void;
  onConnection(state: AuctionConnectionState): void;
};

export class AuctionRealtimeController {
  private _snapshot: AuctionSnapshot;
  private _connection: AuctionConnectionState = "idle";
  private channel: unknown;
  private disposed = false;
  private reconnectPending = false;
  private refetchInFlight = false;

  constructor(private readonly options: Options) {
    this._snapshot = options.initialSnapshot;
  }

  get snapshot(): AuctionSnapshot {
    return this._snapshot;
  }

  get connection(): AuctionConnectionState {
    return this._connection;
  }

  start(): void {
    if (this.disposed || this.channel) {
      return;
    }
    this.setConnection("connecting");
    this.channel = this.options.subscribe({
      onItem: (item) => this.mergeItem(item),
      onBid: (bid) => this.insertBid(bid),
      onStatus: (status) => this.onStatus(status),
    });
  }

  sync(snapshot: AuctionSnapshot): void {
    if (!this.disposed) {
      this._snapshot = snapshot;
      this.options.onChange(snapshot);
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.channel) {
      await this.options.removeChannel(this.channel);
      this.channel = undefined;
    }
    this.setConnection("idle");
  }

  private onStatus(status: string): void {
    if (this.disposed) {
      return;
    }
    if (status === "SUBSCRIBED") {
      this.setConnection("connected");
      if (this.reconnectPending && !this.refetchInFlight) {
        this.reconnectPending = false;
        void this.refetch();
      }
      return;
    }
    if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
      this.reconnectPending = true;
      this.setConnection("disconnected");
    }
  }

  private async refetch(): Promise<void> {
    this.refetchInFlight = true;
    try {
      const latest = await this.options.refetchSnapshot();
      if (!this.disposed) {
        this.sync(latest);
      }
    } catch {
      if (!this.disposed) {
        this.reconnectPending = true;
        this.setConnection("disconnected");
      }
    } finally {
      this.refetchInFlight = false;
    }
  }

  private mergeItem(item: Item): void {
    if (
      this.disposed ||
      (this._snapshot.item &&
        this._snapshot.item.id !== item.id &&
        this._snapshot.item.status !== "closed")
    ) {
      return;
    }
    this._snapshot = { ...this._snapshot, item };
    this.options.onChange(this._snapshot);
  }

  private insertBid(bid: BidWithName): void {
    if (
      this.disposed ||
      !this._snapshot.item ||
      this._snapshot.item.id !== bid.item_id ||
      this._snapshot.bids.some((current) => current.id === bid.id)
    ) {
      return;
    }
    this._snapshot = {
      ...this._snapshot,
      bids: [bid, ...this._snapshot.bids]
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(0, 20),
    };
    this.options.onChange(this._snapshot);
  }

  private setConnection(state: AuctionConnectionState): void {
    if (this._connection === state) {
      return;
    }
    this._connection = state;
    this.options.onConnection(state);
  }
}

export function createAuctionRealtime({
  roomId,
  initialSnapshot,
  onChange,
  onConnection,
}: {
  roomId: string;
  initialSnapshot: AuctionSnapshot;
  onChange(snapshot: AuctionSnapshot): void;
  onConnection(state: AuctionConnectionState): void;
}): AuctionRealtimeController {
  const supabase = createClient();
  const names = new Map(initialSnapshot.bids.map((bid) => [bid.bidder, bid.profile_name]));

  return new AuctionRealtimeController({
    initialSnapshot,
    refetchSnapshot: () => fetchAuctionSnapshot(roomId),
    onChange,
    onConnection,
    subscribe(handlers) {
      const channel = supabase.channel(`auction:${roomId}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "items", filter: `room_id=eq.${roomId}` },
          (payload) => handlers.onItem(payload.new as Item),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          (payload) => {
            void (async () => {
              const bid = payload.new as Bid;
              let profileName = names.get(bid.bidder) ?? "Collector";
              if (!names.has(bid.bidder)) {
                const { data } = await supabase.from("profiles").select("name").eq("id", bid.bidder).single();
                profileName = data?.name ?? profileName;
                names.set(bid.bidder, profileName);
              }
              handlers.onBid({ ...bid, profile_name: profileName });
            })().catch(() => undefined);
          },
        )
        .subscribe((status) => handlers.onStatus(String(status)));
      return channel;
    },
    removeChannel(channel) {
      return supabase.removeChannel(channel as RealtimeChannel);
    },
  });
}
