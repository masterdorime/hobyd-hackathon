"use client";

import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { BidWithName } from "@/lib/types";

export function CountUpAnnouncement({ bids }: { bids: BidWithName[] }) {
  const t = useTranslations("bid");
  const latest = bids[0];
  if (!latest) {
    return null;
  }
  return <span className="sr-only" aria-live="polite">{t("newBid", { name: latest.profile_name, amount: formatIdr(latest.amount) })}</span>;
}
