"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { RoomCategories, RoomCategoryMessageKeys, type RoomCategory } from "@/lib/room-categories";
import type { Room } from "@/lib/types";

const ERROR_KEYS: Record<string, string> = {
  UNAUTHORIZED: "errors.unauthorized",
  INVALID_INPUT: "errors.invalid",
  CLOSED: "errors.closed",
  UPSTREAM_ERROR: "errors.upstream",
};

export function StartLiveForm({ room }: { room: Room | null }) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startLive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) {
      setError(t("lobby.roomNameRequired"));
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", { method: "POST", body: data });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(t(ERROR_KEYS[body?.error] ?? "errors.generic"));
        return;
      }
      const started = await response.json() as Room;
      router.push(`/${locale}/room/${started.id}`);
      router.refresh();
    } catch {
      setError(t("errors.upstream"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="start-live-form raised" onSubmit={startLive} noValidate>
      <div className="start-live-heading">
        <div>
          <span className="section-label">{t("lobby.creatorLabel")}</span>
          <h2>{t("lobby.startTitle")}</h2>
          <p>{t("lobby.startDescription")}</p>
        </div>
      </div>
      <div className="start-live-fields">
        <label>
          <span>{t("lobby.roomName")}</span>
          <input
            name="title"
            type="text"
            required
            maxLength={80}
            defaultValue={room?.title ?? ""}
            placeholder={t("lobby.roomNamePlaceholder")}
            disabled={pending}
          />
        </label>
        <label>
          <span>{t("lobby.category")}</span>
          <select name="category" defaultValue={room?.category ?? "pokemon-tcg"} disabled={pending}>
            {RoomCategories.map((category: RoomCategory) => (
              <option value={category} key={category}>{t(`categories.${RoomCategoryMessageKeys[category]}`)}</option>
            ))}
          </select>
        </label>
        <label className="start-live-thumbnail">
          <span>{t("lobby.thumbnail")}</span>
          <input name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} />
          <small>{room?.thumbnail_url ? t("lobby.thumbnailKeep") : t("lobby.thumbnailHelp")}</small>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("lobby.starting") : t("lobby.startAction")}
        </button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
