import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { OrderSummary } from "@/components/order-summary";
import { QrPayment } from "@/components/qr-payment";
import { demoItem, demoOrder } from "@/lib/demo-data";

export const instant = false;

type PayPageProps = { params: Promise<{ locale: string; orderId: string }> };

export default async function PayPage({ params }: PayPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PayPreview />;
}

function PayPreview() {
  const t = useTranslations("pay");
  const common = useTranslations("common");

  return (
    <main className="page-shell">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
        </div>
        <span className="preview-badge">{common("preview")}</span>
      </section>
      <div className="payment-layout">
        <OrderSummary item={demoItem} order={demoOrder} />
        <QrPayment />
      </div>
    </main>
  );
}
