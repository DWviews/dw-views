"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "註冊失敗");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("連線錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-[#dadce0] p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.5 3.75v7.5L12 19.18l-7.5-3.75v-7.5L12 4.18z" />
            </svg>
          </div>
          <span className="text-xl font-medium text-[#1a73e8]">DW VIEWS</span>
        </div>

        <h2 className="text-2xl font-normal text-[#202124] mb-2">建立帳號</h2>
        <p className="text-[#5f6368] text-sm mb-6">
          第一個註冊的帳號將自動成為管理員 (ADMIN ACC)
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1.5">
              使用者名稱
            </label>
            <input
              type="text"
              className="gads-input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1.5">
              電子郵件
            </label>
            <input
              type="email"
              className="gads-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1.5">
              確認密碼
            </label>
            <input
              type="password"
              className="gads-input"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
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
            {loading ? "註冊中..." : "建立帳號"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#5f6368]">
          已有帳號？{" "}
          <a href="/login" className="text-[#1a73e8] hover:underline font-medium">
            登入
          </a>
        </div>
      </div>
    </div>
  );
}
