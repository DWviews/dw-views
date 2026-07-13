import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession, hashPassword } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role, isActive, displayName, password } = body;

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (role) {
    const validRoles = ["admin", "editor", "viewer"];
    if (validRoles.includes(role)) {
      updates.role = role;
    }
  }

  if (typeof isActive === "boolean") {
    updates.is_active = isActive;
  }

  if (displayName) {
    updates.display_name = displayName;
  }

  if (password && password.length >= 6) {
    updates.password_hash = await hashPassword(password);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  }

  const { data: updated, error: fetchError } = await supabase
    .from("users")
    .select("id, username, email, role, display_name, is_active")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { id } = await params;

  if (Number(id) === session.id) {
    return NextResponse.json({ error: "無法刪除自己的帳號" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;

  return NextResponse.json({ message: "已刪除" });
}
