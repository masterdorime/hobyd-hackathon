"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { Item, RoomStatus } from "@/lib/types";

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

export function SellerItemForm({ roomId, roomStatus }: { roomId: string; roomStatus: RoomStatus }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState<"live" | "create" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [createdItem, setCreatedItem] = useState<Item | null>(null);
  const isLive = roomStatus === "live";

  async function goLive() {
    setPending("live");
    setNotice(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/go-live`, { method: "POST" });
      if (!response.ok) {
        setNotice({ kind: "error", text: t(`errors.${errorKey(await responseError(response))}`) });
        return;
      }
      setNotice({ kind: "success", text: t("item.goLiveSuccess") });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: t("errors.upstream") });
    } finally {
      setPending(null);
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

  return (
    <section className="seller-panel raised" aria-labelledby="seller-form-title">
      <div className="seller-panel-heading">
        <div>
          <span className="section-label">SELLER CONTROL</span>
          <h2 id="seller-form-title">{t("item.createTitle")}</h2>
        </div>
        <button className="btn btn-primary btn-small" type="button" onClick={goLive} disabled={pending !== null || isLive}>
          {pending === "live" ? t("item.goLivePending") : isLive ? t("common.live") : t("item.goLive")}
        </button>
      </div>
      <form className="seller-form" onSubmit={createItem}>
        <input type="hidden" name="roomId" value={roomId} />
        <label>
          <span>{t("item.titleLabel")}</span>
          <input name="title" type="text" placeholder={t("item.titlePlaceholder")} maxLength={120} required disabled={!isLive || pending !== null} />
        </label>
        <label>
          <span>{t("item.startPriceLabel")}</span>
          <input name="startPrice" type="number" min={1} max={2147483647} step={1} inputMode="numeric" placeholder="1500000" required disabled={!isLive || pending !== null} />
        </label>
        <label className="seller-file-input">
          <span>{t("item.imageLabel")}</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={!isLive || pending !== null} />
          <small>{t("item.imageHelp")}</small>
        </label>
        <button className="btn btn-secondary" type="submit" disabled={!isLive || pending !== null}>
          {pending === "create" ? t("item.createPending") : t("item.createAction")}
        </button>
      </form>
      {!isLive ? <p className="form-note">{t("item.liveRequired")}</p> : null}
      {notice ? <p className={notice.kind === "error" ? "form-error" : "form-success"} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p> : null}
      {createdItem ? (
        <output className="seller-created well">
          <span className="section-label">{t("item.created")}</span>
          <strong>{createdItem.title}</strong>
          <span>{formatIdr(createdItem.current_price)}</span>
          <span>{t("item.deadline")}: {createdItem.ends_at} (UTC)</span>
        </output>
      ) : null}
    </section>
  );
}
