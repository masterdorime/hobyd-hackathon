import { NextResponse } from "next/server";

import { listRooms } from "@/lib/server/rooms";

export async function GET() {
  try {
    return NextResponse.json(await listRooms());
  } catch {
    return NextResponse.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
  }
}
