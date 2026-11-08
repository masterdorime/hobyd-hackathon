import { NextResponse } from "next/server";

import { closeItem } from "@/lib/server/auction";
import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const result = await closeItem(id);
    if (result?.error === "not_found") {
      return apiError("NOT_FOUND");
    }
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return apiError("UPSTREAM_ERROR");
  }
}
