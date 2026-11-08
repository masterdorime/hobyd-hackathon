import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { EndLiveButton } from "@/components/end-live-button";
import { LiveAuction } from "@/components/live-auction";
import { categoryLabel } from "@/components/room-card";
import { getAuctionSnapshot } from "@/lib/server/auction";
import { getRelistSourceForSeller } from "@/lib/server/items";
import { getRoom } from "@/lib/server/rooms";
import { createServerSupabase } from "@/lib/supabase/server";
import type { BidWithName, Item, Room } from "@/lib/types";

type RoomPageProps = { params: Promise<{ locale: string; roomId: string }> };

export default async function RoomPage({ params }: RoomPageProps) {
  const { locale, roomId } = await params;
  setRequestLocale(locale);

  const supabase = await createServerSupabase();
  const [room, snapshot, auth] = await Promise.all([
    getRoom(roomId),
    getAuctionSnapshot(roomId),
    supabase.auth.getUser(),
  ]);
  if (!room) {
    notFound();
  }

  const canSell = Boolean(auth.data.user && room.owner_id === auth.data.user.id);
  const authenticated = Boolean(auth.data.user);
  let relistItemId: string | null = null;
  const latestClosed = snapshot.items.find((item) => item.status === "closed");
  if (canSell && latestClosed) {
    try {
      await getRelistSourceForSeller(latestClosed.id);
      relistItemId = latestClosed.id;
    } catch (error) {
      if (!(error instanceof Error && error.message === "RELIST_NOT_ALLOWED")) {
        throw error;
      }
    }
  }

  return (
    <RoomContent
      room={room}
      initialItems={snapshot.items}
      initialBids={snapshot.bids}
      canSell={canSell}
      authenticated={authenticated}
      relistItemId={relistItemId}
      hasActiveItem={snapshot.items.some((item) => ["live", "ending", "extended"].includes(item.status))}
    />
  );
}

function RoomContent({
  room,
  initialItems,
  initialBids,
  canSell,
  authenticated,
  relistItemId,
  hasActiveItem,
}: {
  room: Room;
  initialItems: Item[];
  initialBids: BidWithName[];
  canSell: boolean;
  authenticated: boolean;
  relistItemId: string | null;
  hasActiveItem: boolean;
}) {
  const roomText = useTranslations("room");
  const common = useTranslations("common");
  const categories = useTranslations("categories");

  return (
    <main className="page-shell page-shell-room">
      <section className="room-title-row">
        <div>
          <span className="eyebrow">{room.status.toUpperCase()}{categoryLabel(room.category, categories) ? ` / ${categoryLabel(room.category, categories)}` : ""}</span>
          <h1>{room.title}</h1>
          <p>{roomText("hostedBy", { seller: room.seller_name })}</p>
        </div>
        <div className="room-title-actions">
          <span className="status-live"><span className="status-dot" />{room.status === "live" ? common("live") : room.status.toUpperCase()}</span>
          {canSell && room.status === "live" ? <EndLiveButton roomId={room.id} blocked={hasActiveItem} /> : null}
        </div>
      </section>
      <LiveAuction room={room} initialItems={initialItems} initialBids={initialBids} canSell={canSell} authenticated={authenticated} relistItemId={relistItemId} />
    </main>
  );
}
