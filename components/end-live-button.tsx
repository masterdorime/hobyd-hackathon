"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function EndLiveButton({ roomId, blocked }: { roomId: string; blocked: boolean }) {
  const t = useTranslations("room");
  const router = useRouter();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endLive() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/end`, { method: "POST" });
      if (!response.ok) {
        setError(blocked ? t("endLiveBlocked") : t("endLiveFailed"));
        return;
      }
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      setError(t("endLiveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="end-live-control">
      <button className="btn btn-secondary btn-small" type="button" onClick={endLive} disabled={pending || blocked}>
        {pending ? t("endingLive") : t("endLive")}
      </button>
      {blocked ? <span className="muted">{t("endLiveBlocked")}</span> : null}
      {error ? <span className="form-error" role="alert">{error}</span> : null}
    </div>
  );
}
