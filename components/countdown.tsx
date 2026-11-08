"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { secondsUntil } from "@/lib/time";

export function Countdown({ endsAt, extensionsUsed }: { endsAt: string; extensionsUsed: number }) {
  const t = useTranslations("bid");
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setSeconds(
      secondsUntil(endsAt, performance.timeOrigin + performance.now()),
    );
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  const minutes = seconds === null ? null : Math.floor(seconds / 60);
  const remainder = seconds === null ? null : seconds % 60;
  const label = minutes === null || remainder === null
    ? "--:--"
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  const critical = seconds !== null && seconds < 10;

  return (
    <div className="countdown well" aria-label={label}>
      <strong className="countdown-value">{label}</strong>
      <span className="countdown-copy">
        {critical ? t("lastSeconds") : t("timeRemaining")}<br />
        {t("extensionsUsed", { used: extensionsUsed })}
      </span>
    </div>
  );
}
