import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "請改用 /api/projects/[slug]/months/[monthId]/upload" },
    { status: 410 }
  );
}
