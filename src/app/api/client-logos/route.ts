import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  listClientLogos,
  toLogoListItem,
  uploadClientLogo,
} from "@/lib/client-logos";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const logos = await listClientLogos();
  return NextResponse.json({ logos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可上傳品牌標誌" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("logo");
  const label = String(formData.get("label") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
  }

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "僅支援 PNG、JPEG、WebP、SVG 格式" },
      { status: 400 }
    );
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json(
      { error: "圖片大小不可超過 512 KB" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const logo = await uploadClientLogo(buffer, file.type, label || file.name);
    return NextResponse.json({
      logo: toLogoListItem(logo),
      message: "標誌已加入素材庫",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
