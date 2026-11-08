import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { BidFeed } from "@/components/bid-feed";
import { ItemPanel } from "@/components/item-panel";
import { LiveVideo } from "@/components/live-video";
import { SellerItemForm } from "@/components/seller-item-form";
import { isSellerEmail } from "@/lib/server/auth";
import { listItems } from "@/lib/server/items";
import { getRoom } from "@/lib/server/rooms";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

type RoomPageProps = { params: Promise<{ locale: string; roomId: string }> };

export default async function RoomPage({ params }: RoomPageProps) {
  const { locale, roomId } = await params;
  setRequestLocale(locale);

  const supabase = await createServerSupabase();
  const [room, items, auth] = await Promise.all([
    getRoom(roomId),
    listItems(roomId),
    supabase.auth.getUser(),
  ]);
  if (!room) {
    notFound();
  }

  const item = items.find((candidate) => candidate.status !== "closed") ?? items[0] ?? null;

  return (
    <RoomContent
      key={item ? `${item.id}:${item.current_price}:${item.ends_at}` : room.id}
      room={room}
      item={item}
      canSell={isSellerEmail(auth.data.user?.email)}
    />
  );
}

function RoomContent({
  room,
  item,
  canSell,
}: {
  room: NonNullable<Awaited<ReturnType<typeof getRoom>>>;
  item: Item | null;
  canSell: boolean;
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
      <div className="live-layout">
        <div className="stream-column">
          <LiveVideo sellerName={room.seller_name} itemTitle={item?.title ?? roomText("noActiveItem")} />
          <BidFeed bids={[]} />
        </div>
        {item ? (
          <ItemPanel item={item} bids={[]} previewEndsAt={item.ends_at} />
        ) : (
          <section className="item-panel raised empty-item">
            <h2>{roomText("noActiveItem")}</h2>
          </section>
        )}
      </div>
      {canSell ? <SellerItemForm roomId={room.id} roomStatus={room.status} /> : null}
    </main>
  );
}
