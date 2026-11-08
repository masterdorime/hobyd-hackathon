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
    return NextResponse.json(await closeItem(id));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return apiError("UPSTREAM_ERROR");
  }
}
