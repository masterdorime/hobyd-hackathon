import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeItem } from "../lib/server/auction";
import { getOrderByItemForWinner } from "../lib/server/orders";

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const describeIntegration = enabled ? describe : describe.skip;
const ROOM_ID = crypto.randomUUID();
const ITEM_ID = crypto.randomUUID();
const BIDDER_EMAILS = [process.env.DEMO_BIDDER1_EMAIL, process.env.DEMO_BIDDER2_EMAIL, process.env.DEMO_BIDDER3_EMAIL];
let admin: SupabaseClient;
let bidders: { id: string; email: string }[] = [];

async function fixtureItem({ expired = false } = {}) {
  const { error } = await admin.from("items").insert({
    id: ITEM_ID,
    room_id: ROOM_ID,
    title: "Close fixture",
    img_url: "https://example.com/card.png",
    start_price: 1000000,
    current_price: 1000000,
    ends_at: new Date(Date.now() + (expired ? -2000 : 30000)).toISOString(),
    status: "live",
  });
  if (error) throw error;
}

async function bid(bidder: string, amount: number) {
  const { error } = await admin.from("bids").insert({ item_id: ITEM_ID, bidder, amount });
  if (error) throw error;
}
async function readItem() {
  const { data, error } = await admin.from("items").select("winner,status,current_price,ends_at").eq("id", ITEM_ID).single();
  if (error) throw error;
  return data;
}
async function orderCount() {
  const { count, error } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("item_id", ITEM_ID);
  if (error) throw error;
  return count;
}

describeIntegration("close_item and winner access integration", () => {
  beforeAll(async () => {
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const listed = await admin.auth.admin.listUsers({ perPage: 100 });
    if (listed.error) throw listed.error;
    bidders = BIDDER_EMAILS.map((email) => {
      const user = listed.data.users.find((candidate) => candidate.email === email);
      if (!user) throw new Error("Missing close fixture bidder");
      return { id: user.id, email: email! };
    });
    const { error } = await admin.from("rooms").insert({ id: ROOM_ID, title: "CLOSE INTEGRATION FIXTURE", seller_name: "fixture", status: "live" });
    if (error) throw error;
  });

  beforeEach(async () => {
    await admin.from("items").delete().eq("room_id", ROOM_ID);
    await admin.from("rooms").update({ status: "live" }).eq("id", ROOM_ID);
    await fixtureItem();
  });

  afterAll(async () => {
    if (admin) await admin.from("rooms").delete().eq("id", ROOM_ID);
  });

  it("serializes concurrent closes into one order with the highest bidder as winner", async () => {
    await admin.from("items").update({ ends_at: new Date(Date.now() - 1000).toISOString() }).eq("id", ITEM_ID);
    await bid(bidders[0].id, 1200000);
    await bid(bidders[1].id, 1500000);
    await bid(bidders[2].id, 1300000);

    await Promise.all([closeItem(ITEM_ID), closeItem(ITEM_ID)]);

    expect(await readItem()).toMatchObject({ status: "closed", winner: bidders[1].id, current_price: 1500000 });
    expect(await orderCount()).toBe(1);
    const result = await getOrderByItemForWinner(ITEM_ID, bidders[1].id);
    expect(result?.order?.status).toBe("pending");
  });

  it("closes a zero-bid item without creating a winner or order", async () => {
    await admin.from("items").update({ ends_at: new Date(Date.now() - 1000).toISOString() }).eq("id", ITEM_ID);

    await closeItem(ITEM_ID);

    expect(await readItem()).toMatchObject({ status: "closed", winner: null });
    expect(await orderCount()).toBe(0);
  });

  it("does not close before the deadline", async () => {
    const result = await closeItem(ITEM_ID);

    expect(result).toMatchObject({ ok: true, noop: true });
    expect((await readItem()).status).not.toBe("closed");
    expect(await orderCount()).toBe(0);
  });

  it("rejects bids after closing and gives a loser no checkout access", async () => {
    await admin.from("items").update({ ends_at: new Date(Date.now() - 1000).toISOString() }).eq("id", ITEM_ID);
    await bid(bidders[0].id, 1400000);
    await closeItem(ITEM_ID);
    await closeItem(ITEM_ID);

    const late = await admin.rpc("place_bid", {
      p_item_id: ITEM_ID,
      p_bidder: bidders[1].id,
      p_amount: 1700000,
      p_max_extensions: 5,
      p_window_secs: 10,
      p_add_secs: 10,
    });
    expect(late.data).toMatchObject({ ok: false, error: "closed" });
    expect(await orderCount()).toBe(1);
    await expect(getOrderByItemForWinner(ITEM_ID, bidders[1].id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
