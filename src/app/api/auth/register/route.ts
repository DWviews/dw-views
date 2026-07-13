import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

export async function POST(request: NextRequest) {
  try {
    await seedDatabase();

    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "請填寫所有欄位" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密碼至少需要 6 個字元" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    if (countError) throw countError;

    const isFirstUser = count === 0;
    const role = isFirstUser ? "admin" : "viewer";

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "使用者名稱或電子郵件已存在" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const displayName = isFirstUser ? "ADMIN ACC" : username;

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
        display_name: displayName,
      })
      .select("id")
      .single();

    if (error) throw error;

    const user = {
      id: newUser.id,
      username,
      email,
      role: role as "admin" | "editor" | "viewer",
      displayName,
    };

    const token = await createToken(user);

    const response = NextResponse.json({
      user,
      message: isFirstUser
        ? "歡迎！您已註冊為系統管理員 (ADMIN ACC)"
        : "註冊成功",
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "註冊失敗" }, { status: 500 });
  }
}
