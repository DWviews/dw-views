import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  verifyPassword,
  createToken,
  COOKIE_NAME,
  findUserByLogin,
} from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function POST(request: NextRequest) {
  try {
    await seedDatabase();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "請輸入帳號和密碼" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const user = await findUserByLogin(supabase, username);

    if (!user) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "此帳號已被停用" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as "admin" | "editor" | "viewer",
      displayName: user.display_name,
    };

    const token = await createToken(sessionUser);

    const response = NextResponse.json({ user: sessionUser });

    // 先清除舊 session，避免殘留上一個帳號的 cookie
    response.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登入失敗" }, { status: 500 });
  }
}
