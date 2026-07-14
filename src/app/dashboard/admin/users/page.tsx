"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Shield, ShieldCheck, Eye } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  display_name: string;
  is_active: number;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: "管理員",
  editor: "編輯者",
  viewer: "檢視者",
};

const roleIcons: Record<string, typeof Shield> = {
  admin: ShieldCheck,
  editor: Pencil,
  viewer: Eye,
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "viewer",
    displayName: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    fetch("/api/users")
      .then((res) => res.json())
      .then((d) => setUsers(d.users || []));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      username: "",
      email: "",
      password: "",
      role: "viewer",
      displayName: "",
    });
    setShowModal(true);
  }

  function openEdit(u: UserData) {
    setEditingId(u.id);
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      role: u.role,
      displayName: u.display_name,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (editingId) {
      await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          displayName: form.displayName,
          password: form.password || undefined,
        }),
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowModal(false);
    fetchUsers();
  }

  async function handleToggleActive(id: number, current: number) {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchUsers();
  }

  async function handleDelete(id: number) {
    if (!confirm("確定要刪除此帳號？")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    fetchUsers();
  }

  return (
    <div className="dw-page dw-page-wide">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="dw-section-label mb-1">系統管理</p>
          <h1 className="text-xl font-semibold text-[#12377A]">帳號管理</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            管理系統使用者帳號與權限設定
          </p>
        </div>
        <button
          onClick={openCreate}
          className="gads-btn-primary flex items-center gap-1"
        >
          <Plus size={16} />
          新增帳號
        </button>
      </div>

      {/* Role legend */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries(roleLabels).map(([key, label]) => {
          const Icon = roleIcons[key];
          return (
            <div key={key} className="flex items-center gap-1 text-[#5f6368]">
              <Icon size={14} />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="dw-card overflow-x-auto">
        <table className="gads-table">
          <thead>
            <tr>
              <th>使用者名稱</th>
              <th>顯示名稱</th>
              <th>電子郵件</th>
              <th>角色</th>
              <th>狀態</th>
              <th>建立時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const RoleIcon = roleIcons[u.role] || Eye;
              return (
                <tr key={u.id}>
                  <td className="font-medium">{u.username}</td>
                  <td>{u.display_name}</td>
                  <td className="text-[#5f6368]">{u.email}</td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <RoleIcon size={14} />
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? "bg-[#e6f4ea] text-[#1e8e3e]"
                          : "bg-[#fce8e6] text-[#d93025]"
                      }`}
                    >
                      {u.is_active ? "啟用" : "停用"}
                    </button>
                  </td>
                  <td className="text-[#5f6368] text-xs">
                    {new Date(u.created_at).toLocaleDateString("zh-TW")}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 hover:bg-[#e8f0fe] rounded"
                      >
                        <Pencil size={14} className="text-[#1a73e8]" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 hover:bg-[#fce8e6] rounded"
                      >
                        <Trash2 size={14} className="text-[#d93025]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-4">
              {editingId ? "編輯帳號" : "新增帳號"}
            </h2>
            <div className="space-y-4">
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      使用者名稱
                    </label>
                    <input
                      className="gads-input"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      電子郵件
                    </label>
                    <input
                      type="email"
                      className="gads-input"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  顯示名稱
                </label>
                <input
                  className="gads-input"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {editingId ? "新密碼（留空不變更）" : "密碼"}
                </label>
                <input
                  type="password"
                  className="gads-input"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  {...(!editingId && { required: true, minLength: 6 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">權限角色</label>
                <select
                  className="gads-select w-full"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">管理員 - 完整權限</option>
                  <option value="editor">編輯者 - 可新增/編輯 ADS 資料</option>
                  <option value="viewer">檢視者 - 僅可查看</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="gads-btn-outline"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button className="gads-btn-primary" onClick={handleSave}>
                {editingId ? "儲存" : "建立"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
