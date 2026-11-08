import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const describeIntegration = enabled ? describe : describe.skip;
const ROOM_ID = crypto.randomUUID();
const ITEM_ID = crypto.randomUUID();
const BIDDER_EMAILS = [
  process.env.DEMO_BIDDER1_EMAIL,
  process.env.DEMO_BIDDER2_EMAIL,
];
let admin: SupabaseClient;
let bidderIds: string[] = [];

function args(amount: number) {
  return {
    p_item_id: ITEM_ID,
    p_bidder: bidderIds[0],
    p_amount: amount,
    p_max_extensions: 5,
    p_window_secs: 10,
    p_add_secs: 10,
  };
}

async function currentItem() {
  const { data, error } = await admin.from("items").select("*").eq("id", ITEM_ID).single();
  if (error) throw error;
  return data;
}

describeIntegration("auction RPC integration (designated fixture data)", () => {
  beforeAll(async () => {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const listed = await admin.auth.admin.listUsers({ perPage: 100 });
    if (listed.error) throw listed.error;
    bidderIds = BIDDER_EMAILS.map((email) => {
      const user = listed.data.users.find((candidate) => candidate.email === email);
      if (!user) throw new Error("Missing designated integration bidder");
      return user.id;
    });

    const { error } = await admin.from("rooms").insert({
      id: ROOM_ID,
      title: "VITEST RPC FIXTURE",
      seller_name: "fixture",
      status: "live",
    });
    if (error) throw error;
  });

  beforeEach(async () => {
    await admin.from("items").delete().eq("room_id", ROOM_ID);
    const { error } = await admin.from("items").insert({
      id: ITEM_ID,
      room_id: ROOM_ID,
      title: "RPC fixture item",
      img_url: "https://example.com/card.png",
      start_price: 1500000,
      current_price: 1500000,
      ends_at: new Date(Date.now() + 30000).toISOString(),
      extensions_used: 0,
      status: "live",
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (admin) {
      await admin.from("rooms").delete().eq("id", ROOM_ID);
    }
  });

  it("extends by about ten seconds at +5s", async () => {
    const before = new Date(Date.now() + 5000).toISOString();
    await admin.from("items").update({ ends_at: before }).eq("id", ITEM_ID);

    const { data, error } = await admin.rpc("place_bid", args(1600000));
    const after = await currentItem();

    expect(error).toBeNull();
    expect(data.ok).toBe(true);
    expect(data.extended).toBe(true);
    const extension = new Date(after.ends_at).getTime() - new Date(before).getTime();
    expect(extension).toBeGreaterThanOrEqual(9000);
    expect(extension).toBeLessThanOrEqual(11000);
  });

  it("does not extend after +10s", async () => {
    const before = new Date(Date.now() + 30000).toISOString();
    await admin.from("items").update({ ends_at: before }).eq("id", ITEM_ID);

    const { data, error } = await admin.rpc("place_bid", args(1600000));
    const after = await currentItem();

    expect(error).toBeNull();
    expect(data.extended).toBe(false);
    expect(new Date(after.ends_at).getTime()).toBe(new Date(before).getTime());
  });

  it("does not extend after the five-extension cap", async () => {
    const before = new Date(Date.now() + 5000).toISOString();
    await admin.from("items").update({ ends_at: before, extensions_used: 5 }).eq("id", ITEM_ID);

    const { data, error } = await admin.rpc("place_bid", args(1600000));
    const after = await currentItem();

    expect(error).toBeNull();
    expect(data.extended).toBe(false);
    expect(after.extensions_used).toBe(5);
    expect(new Date(after.ends_at).getTime()).toBe(new Date(before).getTime());
  });

  it("rejects bids after the deadline without reopening", async () => {
    const before = new Date(Date.now() - 1000).toISOString();
    await admin.from("items").update({ ends_at: before }).eq("id", ITEM_ID);

    const { data, error } = await admin.rpc("place_bid", args(1600000));
    const after = await currentItem();

    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: false, error: "closed" });
    expect(after.status).not.toBe("closed");
    expect(new Date(after.ends_at).getTime()).toBe(new Date(before).getTime());
  });

  it("rate limits a second bid from the same user within one second", async () => {
    const first = await admin.rpc("place_bid", args(1600000));
    const second = await admin.rpc("place_bid", args(1700000));

    expect(first.data.ok).toBe(true);
    expect(second.data).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("allows exactly one state transition for equal-price parallel bids", async () => {
    const results = await Promise.all(bidderIds.map((bidder) => admin.rpc("place_bid", {
      ...args(1600000),
      p_bidder: bidder,
    })));
    const accepted = results.filter((result) => result.data?.ok);
    const rejected = results.filter((result) => result.data?.error === "too_low");
    const { count, error } = await admin.from("bids").select("id", { count: "exact", head: true }).eq("item_id", ITEM_ID);

    expect(error).toBeNull();
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(count).toBe(1);
    expect((await currentItem()).current_price).toBe(1600000);
  });
});
