import { AuthorizationError } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Order } from "@/lib/types";

export type WinnerOrder = {
  order: Order;
  item: Item;
};
export type WinnerOrderOrEmpty = {
  order: Order | null;
  item: Item;
};

async function readBy(
  column: "id" | "item_id",
  value: string,
  userId: string,
): Promise<WinnerOrderOrEmpty | null> {
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,item_id,winner,status,created_at,paid_at")
    .eq(column, value)
    .maybeSingle();
  if (orderError) {
    throw new Error("ORDER_READ_FAILED");
  }

  if (order && order.winner !== userId) {
    throw new AuthorizationError("FORBIDDEN");
  }

  const itemId = order?.item_id ?? (column === "item_id" ? value : null);
  if (!itemId) {
    return null;
  }
  const { data: item, error: itemError } = await admin
    .from("items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError) {
    throw new Error("ORDER_ITEM_READ_FAILED");
  }
  if (!item) {
    return null;
  }

  return { order: order as Order | null, item: item as Item };
}

export function getOrderByItemForWinner(
  itemId: string,
  userId: string,
): Promise<WinnerOrderOrEmpty | null> {
  return readBy("item_id", itemId, userId);
}

export function getOrderForWinner(
  orderId: string,
  userId: string,
): Promise<WinnerOrderOrEmpty | null> {
  return readBy("id", orderId, userId);
}
