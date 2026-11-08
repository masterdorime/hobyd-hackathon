import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { getAuctionConfig } from "@/lib/server/config";
import { ApiErrorCode, apiError } from "@/lib/server/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { BidValidationError, parseBidInput } from "@/lib/validation/bid";

const RPC_ERRORS = {
  invalid: "INVALID_INPUT",
  not_found: "NOT_FOUND",
  closed: "CLOSED",
  too_low: "TOO_LOW",
  rate_limited: "RATE_LIMITED",
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = parseBidInput(await request.json());
    const admin = createAdminClient();
    const close = await admin.rpc("close_item", { p_item_id: input.itemId });
    if (close.error || !close.data?.ok) {
      return apiError(close.data?.error === "not_found" ? "NOT_FOUND" : "UPSTREAM_ERROR");
    }

    const config = getAuctionConfig();
    const { data, error } = await admin.rpc("place_bid", {
      p_item_id: input.itemId,
      p_bidder: user.id,
      p_amount: input.amount,
      p_max_extensions: config.maxSnipingExtensions,
      p_window_secs: config.extensionWindowSec,
      p_add_secs: config.extensionAddSec,
    });
    if (error) {
      return apiError("UPSTREAM_ERROR");
    }
    if (!data?.ok) {
      const code: ApiErrorCode = RPC_ERRORS[data?.error as keyof typeof RPC_ERRORS] ?? "UPSTREAM_ERROR";
      return apiError(code);
    }

    return NextResponse.json(data);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof BidValidationError || error instanceof SyntaxError) {
      return apiError("INVALID_INPUT");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
