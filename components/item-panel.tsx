import { useTranslations } from "next-intl";

import { BidForm } from "@/components/bid-form";
import { Countdown } from "@/components/countdown";
import { CountUpAnnouncement } from "@/components/count-up-announcement";
import { FormatAuctionFeedback } from "@/components/auction-feedback";
import type { AuctionFeedback } from "@/hooks/use-auction";
import type { AuctionConnectionState } from "@/lib/client/auction-realtime";
import { formatIdr } from "@/lib/format";
import type { BidWithName, Item, PlaceBidResult } from "@/lib/types";

type ItemPanelProps = {
  item: Item;
  bids: BidWithName[];
  endsAt: string | null;
  onBid(amount: number): Promise<PlaceBidResult | null>;
  onElapsed(): Promise<unknown>;
  pending: boolean;
  closePending: boolean;
  connection: AuctionConnectionState;
  feedback: AuctionFeedback;
};

export function ItemPanel({
  item,
  bids,
  endsAt,
  onBid,
  onElapsed,
  pending,
  closePending,
  connection,
  feedback,
}: ItemPanelProps) {
  const t = useTranslations("bid");
  const room = useTranslations("room");
  const leader = bids[0]?.profile_name ?? "—";
  const active = ["live", "ending", "extended"].includes(item.status) && Boolean(endsAt);

  return (
    <div className="auction-stage">
      <div className="section-line">
        <h2 className="section-label">{room("currentAuction")}</h2>
        <span className="utility-text">{room("lot")}</span>
      </div>
      <article className="item-panel raised">
        <header className="item-heading">
          <h2>{item.title}</h2>
          <span className="utility-text">{item.status === "closed" ? room("closed") : room("active")}</span>
        </header>
        <div className="price-wrap">
          <div className="price-display well">
            <div className="price-topline"><span>{t("currentPrice")}</span><span className={`connection-status connection-${connection}`}>{t(`connection.${connection}`)}</span></div>
            <div className="price-value">{formatIdr(item.current_price)}</div>
            <div className="price-caption"><span>{t("verifiedCount", { count: bids.length })}</span><span>{t("leader", { name: leader })}</span></div>
          </div>
        </div>
        <div className="auction-controls">
          {endsAt ? <Countdown endsAt={endsAt} extensionsUsed={item.extensions_used} onElapsed={onElapsed} closePending={closePending} /> : null}
          <BidForm key={`${item.id}:${item.current_price}`} currentPrice={item.current_price} onBid={onBid} pending={pending} disabled={!active || closePending} />
          <FormatAuctionFeedback feedback={feedback} />
          <CountUpAnnouncement bids={bids} />
        </div>
      </article>
    </div>
  );
}
