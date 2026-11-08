import Image from "next/image";
import { useTranslations } from "next-intl";

export function QrPayment() {
  const t = useTranslations("pay");

  return (
    <section className="qr-panel raised" aria-labelledby="qr-title">
      <div className="qr-countdown well">
        <span>{t("timeLeft")}</span>
        <strong>05:00</strong>
      </div>
      <div className="qr-image-wrap">
        <Image src="/qris-sandbox.png" alt={t("qrTitle")} width={300} height={300} priority />
      </div>
      <h2 id="qr-title">{t("qrTitle")}</h2>
      <p className="muted">{t("qrHelp")}</p>
      <button className="btn btn-primary qr-confirm" type="button" disabled>{t("mockConfirm")}</button>
      <p className="form-note">{t("preview")}</p>
    </section>
  );
}
