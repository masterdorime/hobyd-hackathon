import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { BidWithName } from "@/lib/types";

export function BidFeed({ bids }: { bids: BidWithName[] }) {
  const t = useTranslations("bid");

  return (
    <section className="bid-feed well" aria-labelledby="bid-feed-title">
      <div className="feed-heading">
        <h2 id="bid-feed-title">{t("activity")}</h2>
        <span>{t("realtime")}</span>
      </div>
      {bids.length === 0 ? <p className="feed-empty">{t("historyEmpty")}</p> : (
        <ol className="feed-list">
          {bids.map((bid, index) => (
            <li className={`feed-row${index === 0 ? " feed-row-latest" : ""}`} key={bid.id}>
              <strong>{bid.profile_name}</strong>
              <strong>{formatIdr(bid.amount)}</strong>
              <time dateTime={bid.created_at} title={bid.created_at}>
                {bid.created_at.slice(11, 19)} UTC
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
