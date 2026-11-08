"use client";

import { useTranslations } from "next-intl";

import { BidFeed } from "@/components/bid-feed";
import { ItemPanel } from "@/components/item-panel";
import { LiveVideo } from "@/components/live-video";
import { useAuction } from "@/hooks/use-auction";
import type { BidWithName, Item, Room } from "@/lib/types";

export function LiveAuction({
  room,
  initialItem,
  initialBids,
}: {
  room: Room;
  initialItem: Item | null;
  initialBids: BidWithName[];
}) {
  const auction = useAuction({
    roomId: room.id,
    initialItem,
    initialBids,
  });
  const t = useTranslations("room");

  return (
    <div className="live-layout">
      <div className="stream-column">
        <LiveVideo sellerName={room.seller_name} itemTitle={auction.item?.title ?? t("noActiveItem")} />
        <BidFeed bids={auction.bids} />
      </div>
      {auction.item ? (
        <ItemPanel
          item={auction.item}
          bids={auction.bids}
          previewEndsAt={auction.item.ends_at}
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
  );
}
