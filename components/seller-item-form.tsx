"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { Item } from "@/lib/types";

type Notice = { kind: "error" | "success"; text: string } | null;

function errorKey(code: unknown): string {
  switch (code) {
    case "UNAUTHORIZED": return "unauthorized";
    case "FORBIDDEN": return "forbidden";
    case "INVALID_INPUT": return "invalid";
    case "NOT_FOUND": return "notFound";
    case "CLOSED": return "closed";
    case "TOO_LOW": return "tooLow";
    case "RATE_LIMITED": return "rateLimited";
    case "UPSTREAM_ERROR": return "upstream";
    default: return "generic";
  }
}

async function responseError(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  return body?.error;
}

export function SellerItemForm({
  roomId,
  relistItemId,
  items,
  onStart,
}: {
  roomId: string;
  relistItemId?: string | null;
  items: Item[];
  onStart(itemId: string): Promise<Item | null>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState<"create" | "relist" | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [createdItem, setCreatedItem] = useState<Item | null>(null);

  async function startListing(itemId: string) {
    setStartingId(itemId);
    setNotice(null);
    try {
      const started = await onStart(itemId);
      if (!started) {
        setNotice({ kind: "error", text: t("errors.generic") });
        return;
      }
      setCreatedItem(started);
      router.refresh();
    } finally {
      setStartingId(null);
    }
  }

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending("create");
    setNotice(null);
    try {
      const response = await fetch("/api/items", { method: "POST", body: new FormData(form) });
      if (!response.ok) {
        setNotice({ kind: "error", text: t(`errors.${errorKey(await responseError(response))}`) });
        return;
      }

      const item = await response.json() as Item;
      setCreatedItem(item);
      setNotice({ kind: "success", text: t("item.created") });
      form.reset();
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: t("errors.upstream") });
    } finally {
      setPending(null);
    }
  }

  async function relist() {
    if (!relistItemId) return;
    setPending("relist");
    setNotice(null);
    try {
      const response = await fetch("/api/items/relist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: relistItemId }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: t(`errors.${errorKey(await responseError(response))}`) });
        return;
      }
      setCreatedItem(await response.json() as Item);
      setNotice({ kind: "success", text: t("item.created") });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: t("errors.upstream") });
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="seller-panel raised" aria-labelledby="seller-form-title">
      <div className="seller-panel-heading">
        <div>
          <span className="section-label">SELLER CONTROL</span>
          <h2 id="seller-form-title">{t("item.createTitle")}</h2>
        </div>
        {relistItemId ? (
          <button className="btn btn-primary btn-small" type="button" onClick={relist} disabled={pending !== null}>
            {pending === "relist" ? t("item.createPending") : t("item.relist")}
          </button>
        ) : <span className="utility-text">LIVE</span>}
      </div>
      <form className="seller-form" onSubmit={createItem}>
        <input type="hidden" name="roomId" value={roomId} />
        <label>
          <span>{t("item.titleLabel")}</span>
          <input name="title" type="text" placeholder={t("item.titlePlaceholder")} maxLength={120} required disabled={pending !== null} />
        </label>
        <label>
          <span>{t("item.startPriceLabel")}</span>
          <input name="startPrice" type="number" min={1} max={2147483647} step={1} inputMode="numeric" placeholder="1500000" required disabled={pending !== null} />
        </label>
        <label className="seller-file-input">
          <span>{t("item.imageLabel")}</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={pending !== null} />
          <small>{t("item.imageHelp")}</small>
        </label>
        <button className="btn btn-secondary" type="submit" disabled={pending !== null}>
          {pending === "create" ? t("item.createPending") : t("item.createAction")}
        </button>
      </form>
      <div className="seller-listings">
        <div className="section-line">
          <h3 className="section-label">{t("item.listingQueue")}</h3>
          <span className="utility-text">{items.length}</span>
        </div>
        {items.length === 0 ? <p className="muted">{t("item.noListings")}</p> : items.map((item) => (
          <div className="listing-row" key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.status.toUpperCase()} · {formatIdr(item.status === "listed" ? item.start_price : item.current_price)}</span>
            </div>
            {item.status === "listed" ? (
              <button
                className="btn btn-primary btn-small"
                type="button"
                onClick={() => startListing(item.id)}
                disabled={startingId !== null || pending !== null}
              >
                {startingId === item.id ? t("item.startingBid") : t("item.startBid")}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {notice ? <p className={notice.kind === "error" ? "form-error" : "form-success"} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p> : null}
      {createdItem ? (
        <output className="seller-created well">
          <span className="section-label">{t("item.created")}</span>
          <strong>{createdItem.title}</strong>
          <span>{formatIdr(createdItem.current_price)}</span>
          <span>{createdItem.ends_at ? `${t("item.deadline")}: ${createdItem.ends_at} (UTC)` : t("item.listingWaiting")}</span>
        </output>
      ) : null}
    </section>
  );
}
