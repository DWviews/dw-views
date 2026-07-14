"use client";

import { useEffect, useState } from "react";
import LoginHero from "@/components/login/LoginHero";
import { copyrightLine } from "@/lib/app-version";
import type { SessionUser } from "@/lib/auth";

const roleLabels: Record<SessionUser["role"], string> = {
  admin: "管理員",
  editor: "編輯者",
  viewer: "檢視者",
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.user as SessionUser | null;
      })
      .then((user) => setExistingUser(user))
      .catch(() => setExistingUser(null));
  }, []);

  async function handleLogoutExisting() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      setExistingUser(null);
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }

      // 完整重新載入，避免 Next.js 沿用上一個帳號的快取版面
      window.location.assign("/dashboard");
    } catch {
      setError("連線錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
      <LoginHero />

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.5 3.75v7.5L12 19.18l-7.5-3.75v-7.5L12 4.18z" />
              </svg>
            </div>
            <span className="text-xl font-medium text-[#1a73e8]">DW VIEWS</span>
          </div>

          <h2 className="text-2xl font-normal text-[#202124] mb-2">登入</h2>
          <p className="text-[#5f6368] text-sm mb-8">
            使用您的 DW VIEWS 帳號登入
          </p>

          {existingUser && (
            <div className="mb-5 rounded-lg border border-[#fbbc04] bg-[#fff8e1] px-4 py-3 text-sm text-[#12377A]">
              <p>
                目前已以{" "}
                <span className="font-medium">{existingUser.displayName}</span>（
                {roleLabels[existingUser.role]}）登入。
              </p>
              <p className="text-xs text-[#858481] mt-1">
                若要切換帳號，請先登出再使用其他帳密登入。
              </p>
              <button
                type="button"
                onClick={handleLogoutExisting}
                disabled={loggingOut}
                className="mt-3 text-xs border border-[#12377A] text-[#12377A] px-3 py-1.5 rounded hover:bg-[#e8f0fe] disabled:opacity-50"
              >
                {loggingOut ? "登出中..." : "登出目前帳號"}
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#202124] mb-1.5">
                帳號
              </label>
              <input
                type="text"
                className="gads-input"
                placeholder="使用者名稱或電子郵件"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#202124] mb-1.5">
                密碼
              </label>
              <input
                type="password"
                className="gads-input"
                placeholder="輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-[#fce8e6] text-[#d93025] text-sm px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="gads-btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? "登入中..." : "登入"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-[#F2F9FC] rounded-lg text-sm text-[#12377A] border border-[#A8D5E5] text-center">
            中小企業用戶請聯絡
            <br />
            Diamond Wise 銷售經理
            <br />
            領取帳密
          </div>

          <p className="mt-8 text-center text-xs text-[#9aa0a6] lg:hidden">
            {copyrightLine()}
            <br />
            大中華區：中國大陸 · 香港 · 台灣
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
