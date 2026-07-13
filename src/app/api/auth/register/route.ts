import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "註冊功能已關閉，請聯絡 Diamond Wise 銷售經理領取帳密" },
    { status: 403 }
  );
}
