"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BidFeed } from "@/components/bid-feed";
import { ChatPanel } from "@/components/chat-panel";
import { ItemPanel } from "@/components/item-panel";
import { LiveVideo } from "@/components/live-video";
import { SellerItemForm } from "@/components/seller-item-form";
import { useAuction } from "@/hooks/use-auction";
import { formatIdr } from "@/lib/format";
import type { BidWithName, Item, Room } from "@/lib/types";

type RoomTab = "auction" | "chat" | "seller";

export function LiveAuction({
  room,
  initialItems,
  initialBids,
  canSell,
  authenticated,
  relistItemId,
}: {
  room: Room;
  initialItems: Item[];
  initialBids: BidWithName[];
  canSell: boolean;
  authenticated: boolean;
  relistItemId: string | null;
}) {
  const auction = useAuction({ roomId: room.id, initialItems, initialBids });
  const t = useTranslations("room");
  const locale = useLocale();
  const [tab, setTab] = useState<RoomTab>("auction");
  const selected = auction.selectedItem;
  const auctionItem = selected && selected.status !== "listed"
    ? selected
    : auction.activeItems[0] ?? auction.items.find((item) => item.status === "closed") ?? null;
  const auctionBids = auctionItem ? auction.bids.filter((bid) => bid.item_id === auctionItem.id) : [];
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}/room/${room.id}`)}`;

  return (
    <>
      <div className="room-tabs" role="tablist" aria-label={t("viewTabs")}>
        <button className="room-tab" role="tab" aria-selected={tab === "auction"} onClick={() => setTab("auction")}>{t("tabsAuction")}</button>
        <button className="room-tab" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>{t("tabsChat")}</button>
        {canSell ? <button className="room-tab" role="tab" aria-selected={tab === "seller"} onClick={() => setTab("seller")}>{t("tabsSeller")}</button> : null}
      </div>

      {tab === "auction" ? (
        <>
          {auction.activeItems.length > 0 ? (
            <div className="lot-strip" aria-label={t("activeLots")}>
              {auction.activeItems.map((lot) => (
                <button
                  className="lot-chip"
                  type="button"
                  key={lot.id}
                  aria-pressed={selected?.id === lot.id}
                  onClick={() => auction.selectItem(lot.id)}
                >
                  <strong>{lot.title}</strong>
                  <span>{formatIdr(lot.current_price)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="live-layout">
            <div className="stream-column">
              <LiveVideo key={`${room.id}:${canSell}:${authenticated}`} roomId={room.id} sellerName={room.seller_name} itemTitle={selected?.title ?? t("noActiveItem")} canSell={canSell} authenticated={authenticated} loginHref={loginHref} />
              <BidFeed bids={auctionBids} />
            </div>
            {auctionItem ? (
              <ItemPanel
                item={auctionItem}
                bids={auctionBids}
                endsAt={auctionItem.ends_at}
                onBid={auction.placeBid}
                onElapsed={auction.closeItem}
                pending={auction.pending}
                closePending={auction.closePending}
                connection={auction.connection}
                feedback={auction.feedback}
              />
            ) : (
              <section className="item-panel raised empty-item">
                <h2>{t("noActiveItem")}</h2>
              </section>
            )}
          </div>
        </>
      ) : null}

      {tab === "chat" ? <ChatPanel roomId={room.id} authenticated={authenticated} loginHref={loginHref} live={room.status === "live"} /> : null}

      {tab === "seller" && canSell ? (
        <SellerItemForm roomId={room.id} relistItemId={relistItemId} items={auction.items} onStart={auction.startItem} />
      ) : null}
    </>
  );
}
