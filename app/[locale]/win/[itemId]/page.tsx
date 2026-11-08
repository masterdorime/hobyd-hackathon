import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { formatIdr } from "@/lib/format";
import { DEMO_ORDER_ID, demoItem } from "@/lib/demo-data";

type WinPageProps = { params: Promise<{ locale: string; itemId: string }> };

export default async function WinPage({ params }: WinPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WinPreview />;
}

function WinPreview() {
  const t = useTranslations("win");
  const common = useTranslations("common");

  return (
    <main className="page-shell win-shell">
      <section className="win-panel raised">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1>{t("title")}</h1>
        <p className="win-description">{t("description")}</p>
        <h2>{demoItem.title}</h2>
        <span className="order-amount-label">{t("priceLabel")}</span>
        <div className="win-price">{formatIdr(demoItem.current_price)}</div>
        <Link className="btn btn-primary" href={`/pay/${DEMO_ORDER_ID}`}>{t("payAction")}</Link>
        <p className="form-note">{common("preview")} · {t("preview")}</p>
      </section>
    </main>
  );
}
