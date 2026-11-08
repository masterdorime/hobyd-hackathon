"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";

export function BidForm({ currentPrice, disabled = true }: { currentPrice: number; disabled?: boolean }) {
  const t = useTranslations("bid");
  const [amount, setAmount] = useState(String(currentPrice + 50_000));
  const minimum = currentPrice + 1;

  return (
    <form className="bid-form" onSubmit={(event) => event.preventDefault()}>
      <div className="bid-label-row">
        <label htmlFor="bid-amount">{t("yourBid")}</label>
        <span id="bid-minimum">{t("minimum", { amount: formatIdr(minimum).toUpperCase() })}</span>
      </div>
      <div className="bid-input-row">
        <input
          className="bid-input"
          id="bid-amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={minimum}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-describedby="bid-minimum bid-help"
        />
        <button className="bid-button" type="submit" disabled={disabled}>
          {t("action")}
        </button>
      </div>
      <p className="bid-help" id="bid-help">{disabled ? t("previewHelp") : t("help")}</p>
    </form>
  );
}
