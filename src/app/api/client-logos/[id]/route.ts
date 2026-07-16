import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClientLogo, readClientLogoBytes } from "@/lib/client-logos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("未登入", { status: 401 });
  }

  const { id } = await params;
  const logoId = Number(id);
  if (!Number.isFinite(logoId)) {
    return new NextResponse("無效標誌", { status: 400 });
  }

  const logo = await getClientLogo(logoId);
  if (!logo) {
    return new NextResponse("標誌不存在", { status: 404 });
  }

  const bytes = await readClientLogoBytes(logo);
  if (!bytes) {
    return new NextResponse("標誌檔案不存在", { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": logo.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
