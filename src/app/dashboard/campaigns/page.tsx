"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";

interface Campaign {
  id: number;
  campaign_name: string;
  campaign_type: string;
  status: string;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  avg_cpc: number;
  conversion_rate: number;
  cost_per_conversion: number;
  account_name: string;
}

interface User {
  role: string;
}

function formatCurrency(n: number): string {
  return "NT$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    campaignName: "",
    campaignType: "Search",
    status: "Enabled",
    budget: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    cost: 0,
  });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchCampaigns();
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((d) => setUser(d.user));
  }, []);

  function fetchCampaigns() {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((d) => setCampaigns(d.campaigns || []));
  }

  const canEdit = user && ["admin", "editor"].includes(user.role);
  const canDelete = user?.role === "admin";

  const filtered = campaigns.filter((c) => {
    if (filter === "all") return c.status !== "Removed";
    return c.status === filter;
  });

  function openCreate() {
    setEditingId(null);
    setForm({
      campaignName: "",
      campaignType: "Search",
      status: "Enabled",
      budget: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
    });
    setShowModal(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      campaignName: c.campaign_name,
      campaignType: c.campaign_type,
      status: c.status,
      budget: c.budget,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      cost: c.cost,
    });
    setShowModal(true);
  }

  async function handleSave() {
    const url = editingId ? `/api/campaigns/${editingId}` : "/api/campaigns";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setShowModal(false);
    fetchCampaigns();
  }

  async function handleDelete(id: number) {
    if (!confirm("確定要刪除此廣告活動？")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  }

  const totalCost = filtered.reduce((s, c) => s + c.cost, 0);
  const totalClicks = filtered.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = filtered.reduce((s, c) => s + c.impressions, 0);

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-normal text-[#202124]">廣告活動</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            {filtered.length} 個廣告活動
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="gads-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部狀態</option>
            <option value="Enabled">已啟用</option>
            <option value="Paused">已暫停</option>
          </select>
          {canEdit && (
            <button
              onClick={openCreate}
              className="gads-btn-primary flex items-center gap-1"
            >
              <Plus size={16} />
              新增廣告活動
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-6 mb-4 px-4 py-3 bg-[#f8f9fa] rounded-lg text-sm">
        <div>
          <span className="text-[#5f6368]">曝光：</span>
          <span className="font-medium">{formatNumber(totalImpressions)}</span>
        </div>
        <div>
          <span className="text-[#5f6368]">點擊：</span>
          <span className="font-medium">{formatNumber(totalClicks)}</span>
        </div>
        <div>
          <span className="text-[#5f6368]">費用：</span>
          <span className="font-medium">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#dadce0] rounded-lg overflow-x-auto">
        <table className="gads-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" className="rounded" />
              </th>
              <th>狀態</th>
              <th>廣告活動</th>
              <th>類型</th>
              <th>預算</th>
              <th>曝光</th>
              <th>點擊</th>
              <th>CTR</th>
              <th>轉換</th>
              <th>費用</th>
              <th>平均 CPC</th>
              {(canEdit || canDelete) && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <input type="checkbox" className="rounded" />
                </td>
                <td>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      c.status === "Enabled"
                        ? "status-enabled"
                        : c.status === "Paused"
                          ? "status-paused"
                          : "status-removed"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        c.status === "Enabled"
                          ? "bg-[#1e8e3e]"
                          : c.status === "Paused"
                            ? "bg-[#f9ab00]"
                            : "bg-[#d93025]"
                      }`}
                    />
                    {c.status === "Enabled"
                      ? "已啟用"
                      : c.status === "Paused"
                        ? "已暫停"
                        : "已移除"}
                  </span>
                </td>
                <td className="font-medium text-[#1a73e8]">
                  {c.campaign_name}
                </td>
                <td className="text-[#5f6368]">{c.campaign_type}</td>
                <td>{formatCurrency(c.budget)}/日</td>
                <td>{formatNumber(c.impressions)}</td>
                <td>{formatNumber(c.clicks)}</td>
                <td>{c.ctr}%</td>
                <td>{c.conversions}</td>
                <td>{formatCurrency(c.cost)}</td>
                <td>{formatCurrency(c.avg_cpc)}</td>
                {(canEdit || canDelete) && (
                  <td>
                    <div className="flex gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 hover:bg-[#e8f0fe] rounded"
                        >
                          <Pencil size={14} className="text-[#1a73e8]" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 hover:bg-[#fce8e6] rounded"
                        >
                          <Trash2 size={14} className="text-[#d93025]" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-4">
              {editingId ? "編輯廣告活動" : "新增廣告活動"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  廣告活動名稱
                </label>
                <input
                  className="gads-input"
                  value={form.campaignName}
                  onChange={(e) =>
                    setForm({ ...form, campaignName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">類型</label>
                  <select
                    className="gads-select w-full"
                    value={form.campaignType}
                    onChange={(e) =>
                      setForm({ ...form, campaignType: e.target.value })
                    }
                  >
                    <option value="Search">搜尋</option>
                    <option value="Display">多媒體</option>
                    <option value="Shopping">購物</option>
                    <option value="Video">影片</option>
                    <option value="App">應用程式</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">狀態</label>
                  <select
                    className="gads-select w-full"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="Enabled">已啟用</option>
                    <option value="Paused">已暫停</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    每日預算 (TWD)
                  </label>
                  <input
                    type="number"
                    className="gads-input"
                    value={form.budget}
                    onChange={(e) =>
                      setForm({ ...form, budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">曝光</label>
                  <input
                    type="number"
                    className="gads-input"
                    value={form.impressions}
                    onChange={(e) =>
                      setForm({ ...form, impressions: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">點擊</label>
                  <input
                    type="number"
                    className="gads-input"
                    value={form.clicks}
                    onChange={(e) =>
                      setForm({ ...form, clicks: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">轉換</label>
                  <input
                    type="number"
                    className="gads-input"
                    value={form.conversions}
                    onChange={(e) =>
                      setForm({ ...form, conversions: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">費用</label>
                  <input
                    type="number"
                    className="gads-input"
                    value={form.cost}
                    onChange={(e) =>
                      setForm({ ...form, cost: Number(e.target.value) })
                    }
                  />
                </div>
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
