import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/server/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSignup } from "@/lib/validation/signup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const fields = {
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
      confirmation: typeof body.confirmation === "string" ? body.confirmation : "",
    };
    if (validateSignup(fields)) {
      return apiError("INVALID_INPUT");
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: fields.email.trim(),
      password: fields.password,
      email_confirm: true,
      user_metadata: { name: fields.name.trim() },
    });
    if (error || !data.user) {
      const duplicate = error?.message?.toLowerCase().includes("already");
      return NextResponse.json(
        { error: duplicate ? "EMAIL_EXISTS" : "UPSTREAM_ERROR" },
        { status: duplicate ? 409 : 502 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return apiError("INVALID_INPUT");
  }
}
