import { forbidden, notFound, redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AuthorizationError, requireUser } from "@/lib/server/auth";
import { getOrderByItemForWinner } from "@/lib/server/orders";
import { formatIdr } from "@/lib/format";
import type { Item, Order } from "@/lib/types";

type WinPageProps = { params: Promise<{ locale: string; itemId: string }> };

export default async function WinPage({ params }: WinPageProps) {
  const { locale, itemId } = await params;
  setRequestLocale(locale);

  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=${encodeURIComponent(`/${locale}/win/${itemId}`)}`);
    }
    throw error;
  }

  let result: Awaited<ReturnType<typeof getOrderByItemForWinner>>;
  try {
    result = await getOrderByItemForWinner(itemId, userId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "FORBIDDEN") {
      forbidden();
    }
    throw error;
  }
  if (!result) {
    notFound();
  }
  return <WinnerContent order={result.order} item={result.item} />;
}

function WinnerContent({ order, item }: { order: Order | null; item: Item }) {
  const t = useTranslations("win");
  const room = useTranslations("room");

  return (
    <main className="page-shell win-shell">
      <section className="win-panel raised">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1>{order ? t("title") : room("closed")}</h1>
        <p className="win-description">{order ? t("description") : t("noWinner")}</p>
        <h2>{item.title}</h2>
        {order ? (
          <>
            <span className="order-amount-label">{t("priceLabel")}</span>
            <div className="win-price">{formatIdr(item.current_price)}</div>
            <Link className="btn btn-primary" href={`/pay/${order.id}`}>{t("payAction")}</Link>
          </>
        ) : null}
      </section>
    </main>
  );
}
