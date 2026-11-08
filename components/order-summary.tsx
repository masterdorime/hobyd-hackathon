import { useTranslations } from "next-intl";

import { formatIdr } from "@/lib/format";
import type { Item, Order } from "@/lib/types";

export function OrderSummary({ item, order }: { item: Item; order: Order }) {
  const t = useTranslations("pay");

  return (
    <section className="order-summary raised" aria-label={t("amount")}>
      <div className="order-item-title">{item.title}</div>
      <div className="order-amount-label">{t("amount")}</div>
      <div className="order-amount">{formatIdr(item.current_price)}</div>
      <dl className="order-meta">
        <div><dt>{t("statusLabel")}</dt><dd>{t(order.status)}</dd></div>
        <div><dt>ORDER ID</dt><dd>{order.id.slice(0, 8).toUpperCase()}</dd></div>
      </dl>
    </section>
  );
}
