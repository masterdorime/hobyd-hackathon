import { useTranslations } from "next-intl";

import { BidForm } from "@/components/bid-form";
import { Countdown } from "@/components/countdown";
import { formatIdr } from "@/lib/format";
import type { BidWithName, Item } from "@/lib/types";

type ItemPanelProps = {
  item: Item;
  bids: BidWithName[];
  previewSeconds: number;
};

export function ItemPanel({ item, bids, previewSeconds }: ItemPanelProps) {
  const t = useTranslations("bid");
  const common = useTranslations("common");
  const room = useTranslations("room");
  const leader = bids[0]?.profile_name ?? "—";

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
            <div className="price-topline"><span>{t("currentPrice")}</span><span>{common("preview")}</span></div>
            <div className="price-value">{formatIdr(item.current_price)}</div>
            <div className="price-caption"><span>{t("verifiedCount", { count: bids.length })}</span><span>{t("leader", { name: leader })}</span></div>
          </div>
        </div>
        <div className="auction-controls">
          <Countdown seconds={previewSeconds} extensionsUsed={item.extensions_used} />
          <BidForm currentPrice={item.current_price} />
        </div>
      </article>
    </div>
  );
}
