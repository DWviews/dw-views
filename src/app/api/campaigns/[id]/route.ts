import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "此功能已停用，請使用專案報告流程" },
    { status: 410 }
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "此功能已停用，請使用專案報告流程" },
    { status: 410 }
  );
}
