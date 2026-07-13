import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, email, role, display_name, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { username, email, password, role, displayName } =
    await request.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: "請填寫必要欄位" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "帳號已存在" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const validRoles = ["admin", "editor", "viewer"];
  const userRole = validRoles.includes(role) ? role : "viewer";

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      username,
      email,
      password_hash: passwordHash,
      role: userRole,
      display_name: displayName || username,
    })
    .select("id")
    .single();

  if (error) throw error;

  return NextResponse.json({
    user: {
      id: newUser.id,
      username,
      email,
      role: userRole,
      displayName: displayName || username,
    },
  });
}
