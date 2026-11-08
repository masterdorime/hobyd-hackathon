import { NextResponse } from "next/server";

import { authErrorResponse, requireSeller } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSeller();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("rooms")
      .update({ status: "live" })
      .eq("id", id)
      .select("id,title,seller_name,status,created_at")
      .single();

    if (error || !data) {
      return apiError("NOT_FOUND");
    }
    return NextResponse.json(data);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return apiError("UPSTREAM_ERROR");
  }
}
