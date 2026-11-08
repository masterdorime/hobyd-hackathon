import { useTranslations } from "next-intl";

type CountdownProps = {
  seconds: number;
  extensionsUsed: number;
};

export function Countdown({ seconds, extensionsUsed }: CountdownProps) {
  const t = useTranslations("bid");
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  const critical = safeSeconds < 10;

  return (
    <div className="countdown well" aria-label={`${minutes}:${String(remainder).padStart(2, "0")}`}>
      <strong className="countdown-value">
        {String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}
      </strong>
      <span className="countdown-copy">
        {critical ? t("lastSeconds") : t("timeRemaining")}<br />
        {t("extensionsUsed", { used: extensionsUsed })}
      </span>
    </div>
  );
}
