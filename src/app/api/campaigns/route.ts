import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  return NextResponse.json({ campaigns: [] });
}

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "此功能已停用，請使用專案報告流程" },
    { status: 410 }
  );
}
