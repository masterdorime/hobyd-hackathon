"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { secondsUntil } from "@/lib/time";

export function Countdown({
  endsAt,
  extensionsUsed,
  onElapsed,
  closePending,
}: {
  endsAt: string;
  extensionsUsed: number;
  onElapsed(): Promise<unknown>;
  closePending: boolean;
}) {
  const t = useTranslations("bid");
  const [seconds, setSeconds] = useState<number | null>(null);
  const elapsedRef = useRef(onElapsed);
  const requestedRef = useRef(false);

  useEffect(() => {
    elapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    requestedRef.current = false;
    const update = () => {
      const remaining = secondsUntil(endsAt, performance.timeOrigin + performance.now());
      setSeconds(remaining);
      if (remaining === 0 && !requestedRef.current) {
        requestedRef.current = true;
        void elapsedRef.current();
      }
    };
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
    <div className="countdown well" aria-label={label} aria-busy={closePending}>
      <strong className="countdown-value">{label}</strong>
      <span className="countdown-copy">
        {critical ? t("lastSeconds") : t("timeRemaining")}<br />
        {t("extensionsUsed", { used: extensionsUsed })}
      </span>
    </div>
  );
}
