"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { secondsUntil } from "@/lib/time";
import type { Order, OrderStatus } from "@/lib/types";

type QrisPayload = {
  qrUrl: string | null;
  status: OrderStatus;
  expiresAt: string;
  paidAt?: string | null;
};

function displayTime(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function QrPayment({
  order,
  paymentWindowSec,
}: {
  order: Order;
  paymentWindowSec: number;
}) {
  const t = useTranslations("pay");
  const expiresFromOrder = order.qris_expires_at ?? new Date(Date.parse(order.created_at) + paymentWindowSec * 1000).toISOString();
  const [qrUrl, setQrUrl] = useState(order.qris_action_url ?? null);
  const [status, setStatus] = useState(order.status);
  const [paidAt, setPaidAt] = useState(order.paid_at);
  const [expiresAt, setExpiresAt] = useState(expiresFromOrder);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(order.status === "pending");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expireRequested = useRef(false);

  const loadQris = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/qris`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("UPSTREAM_ERROR");
      }
      const payload = await response.json() as QrisPayload;
      if (!payload.qrUrl && payload.status === "pending") {
        setError(t("qrLoadFailed"));
      }
      setQrUrl(payload.qrUrl);
      setStatus(payload.status);
      setExpiresAt(payload.expiresAt);
      setPaidAt(payload.paidAt ?? null);
    } catch {
      setError(t("qrLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [order.id, t]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (order.status === "pending") {
        void loadQris();
      } else {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadQris, order.status]);

  useEffect(() => {
    expireRequested.current = false;
    const update = () => {
      const left = secondsUntil(expiresAt, performance.timeOrigin + performance.now());
      setRemaining(left);
      if (left === 0 && status === "pending" && !expireRequested.current) {
        expireRequested.current = true;
        void (async () => {
          try {
            const response = await fetch(`/api/orders/${order.id}/expire`, { method: "POST" });
            if (!response.ok) return;
            const payload = await response.json() as { status: OrderStatus };
            setStatus(payload.status);
          } catch {
            // The next load or webhook may still resolve the real server state.
          }
        })();
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, order.id, status]);

  async function mockConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/mock-confirm`, { method: "POST" });
      if (!response.ok) {
        throw new Error("UPSTREAM_ERROR");
      }
      const payload = await response.json() as { status: OrderStatus; paid_at?: string | null };
      setStatus(payload.status);
      setPaidAt(payload.paid_at ?? null);
    } catch {
      setError(t("actionFailed"));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="qr-panel raised" aria-labelledby="qr-title">
      <div className="qr-countdown well">
        <span>{t("timeLeft")}</span>
        <strong>{displayTime(remaining)}</strong>
      </div>
      {qrUrl && status === "pending" ? (
        <div className="qr-image-wrap">
          <Image src={qrUrl} alt={t("qrTitle")} width={300} height={300} unoptimized priority />
        </div>
      ) : null}
      <h2 id="qr-title">{status === "pending" ? t("qrTitle") : t(status)}</h2>
      <p className="muted">{status === "paid" ? t("paidHelp") : t("qrHelp")}</p>
      {loading ? <p className="form-note" role="status">{t("qrPending")}</p> : null}
      {error ? <p className="form-error" role="alert">{t("qrLoadFailed")}</p> : null}
      <div className="payment-confirmation well" aria-live="polite">
        <span className="section-label">{t("confirmationTitle")}</span>
        <strong>{t(status)}</strong>
        {status === "paid" && paidAt ? <time dateTime={paidAt}>{t("confirmedAt")}: {paidAt} UTC</time> : null}
        {status === "pending" ? (
          <>
            <button className="btn btn-primary qr-confirm" type="button" onClick={mockConfirm} disabled={confirming}>
              {confirming ? t("confirmPending") : t("mockConfirm")}
            </button>
            <p className="form-note">{t("mockHelp")}</p>
          </>
        ) : null}
      </div>
      {status === "pending" && !qrUrl ? <button className="btn btn-secondary qr-confirm" type="button" onClick={loadQris} disabled={loading}>{t("retry")}</button> : null}
    </section>
  );
}
