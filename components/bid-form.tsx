"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { PlaceBidResult } from "@/lib/types";

type BidFormProps = {
  currentPrice: number;
  onBid(amount: number): Promise<PlaceBidResult | null>;
  pending: boolean;
  disabled: boolean;
};

export function BidForm({ currentPrice, onBid, pending, disabled }: BidFormProps) {
  const t = useTranslations("bid");
  const [amount, setAmount] = useState(String(currentPrice + 50_000));
  const [localError, setLocalError] = useState<string | null>(null);
  const minimum = currentPrice + 1;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = Number(amount);
    if (!Number.isSafeInteger(candidate) || candidate < minimum) {
      setLocalError(t("tooLow"));
      return;
    }
    setLocalError(null);
    await onBid(candidate);
  }

  return (
    <form className="bid-form" onSubmit={submit} noValidate>
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
          aria-describedby="bid-minimum bid-help bid-input-error"
          disabled={pending || disabled}
          required
        />
        <button className="bid-button" type="submit" disabled={pending || disabled}>
          {pending ? t("pending") : t("action")}
        </button>
      </div>
      <p className="bid-help" id="bid-help">{t("help")}</p>
      {localError ? <p className="form-error" id="bid-input-error" role="alert">{localError}</p> : null}
    </form>
  );
}
