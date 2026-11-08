import { getAuctionConfig } from "./config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

export function paymentDeadline(order: Pick<Order, "created_at"> & { qris_expires_at?: string | null }): number {
  if (order.qris_expires_at) {
    return Date.parse(order.qris_expires_at);
  }
  return Date.parse(order.created_at) + getAuctionConfig().paymentWindowSec * 1000;
}

export async function markOrderPaid(orderId: string, now = Date.now()): Promise<Order> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "paid", paid_at: new Date(now).toISOString() })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error("TERMINAL_ORDER_STATE");
  }
  return data as Order;
}

export async function expireOrderIfDue(orderId: string, now = Date.now()) {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id,status,created_at,qris_expires_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) {
    throw new Error("ORDER_NOT_FOUND");
  }
  if (order.status !== "pending" || paymentDeadline(order) > now) {
    return { changed: false, status: order.status as Order["status"] };
  }

  const { data, error: updateError } = await admin
    .from("orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (updateError || !data) {
    throw new Error("TERMINAL_ORDER_STATE");
  }
  return { changed: true, status: "expired" as const, order: data as Order };
}
