import { forbidden, notFound, redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { OrderSummary } from "@/components/order-summary";
import { QrPayment } from "@/components/qr-payment";
import { AuthorizationError, requireUser } from "@/lib/server/auth";
import { getAuctionConfig } from "@/lib/server/config";
import { getOrderForWinner } from "@/lib/server/orders";
import type { Item, Order } from "@/lib/types";

type PayPageProps = { params: Promise<{ locale: string; orderId: string }> };

export default async function PayPage({ params }: PayPageProps) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);

  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=${encodeURIComponent(`/${locale}/pay/${orderId}`)}`);
    }
    throw error;
  }

  let result: Awaited<ReturnType<typeof getOrderForWinner>>;
  try {
    result = await getOrderForWinner(orderId, userId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "FORBIDDEN") {
      forbidden();
    }
    throw error;
  }
  if (!result?.order) {
    notFound();
  }

  return (
    <PaymentContent
      order={result.order}
      item={result.item}
      paymentWindowSec={getAuctionConfig().paymentWindowSec}
    />
  );
}

function PaymentContent({
  order,
  item,
  paymentWindowSec,
}: {
  order: Order;
  item: Item;
  paymentWindowSec: number;
}) {
  const t = useTranslations("pay");
  return (
    <main className="page-shell">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
        </div>
      </section>
      <div className="payment-layout">
        <OrderSummary item={item} order={order} />
        <QrPayment order={order} paymentWindowSec={paymentWindowSec} />
      </div>
    </main>
  );
}
