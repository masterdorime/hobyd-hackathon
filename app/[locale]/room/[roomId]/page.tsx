import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LiveAuction } from "@/components/live-auction";
import { SellerItemForm } from "@/components/seller-item-form";
import { getAuctionSnapshot } from "@/lib/server/auction";
import { getRelistSourceForSeller } from "@/lib/server/items";
import { isSellerEmail } from "@/lib/server/auth";
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

  const canSell = isSellerEmail(auth.data.user?.email);
  let relistItemId: string | null = null;
  if (canSell && snapshot.item?.status === "closed") {
    try {
      await getRelistSourceForSeller(snapshot.item.id);
      relistItemId = snapshot.item.id;
    } catch (error) {
      if (!(error instanceof Error && error.message === "RELIST_NOT_ALLOWED")) {
        throw error;
      }
    }
  }

  return (
    <RoomContent
      room={room}
      initialItem={snapshot.item}
      initialBids={snapshot.bids}
      canSell={canSell}
      relistItemId={relistItemId}
    />
  );
}

function RoomContent({
  room,
  initialItem,
  initialBids,
  canSell,
  relistItemId,
}: {
  room: Room;
  initialItem: Item | null;
  initialBids: BidWithName[];
  canSell: boolean;
  relistItemId: string | null;
}) {
  const roomText = useTranslations("room");
  const common = useTranslations("common");

  return (
    <main className="page-shell page-shell-room">
      <section className="room-title-row">
        <div>
          <span className="eyebrow">{room.status.toUpperCase()}</span>
          <h1>{room.title}</h1>
          <p>{roomText("hostedBy", { seller: room.seller_name })}</p>
        </div>
        <span className="status-live"><span className="status-dot" />{room.status === "live" ? common("live") : room.status.toUpperCase()}</span>
      </section>
      <LiveAuction room={room} initialItem={initialItem} initialBids={initialBids} canSell={canSell} />
      {canSell ? <SellerItemForm roomId={room.id} roomStatus={room.status} relistItemId={relistItemId} /> : null}
    </main>
  );
}
