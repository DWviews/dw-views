"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  account_name: string;
}

function formatCurrency(n: number): string {
  return "NT$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function AdsDataPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  useEffect(() => {
    fetchCampaigns();
  }, []);

  function fetchCampaigns() {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((d) => setCampaigns(d.campaigns || []));
  }

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
    if (!confirm("確定要刪除此 ADS 資料？")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-normal text-[#202124]">ADS 資料管理</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            新增、編輯和管理 Google Ads 廣告數據
          </p>
        </div>
        <button
          onClick={openCreate}
          className="gads-btn-primary flex items-center gap-1"
        >
          <Plus size={16} />
          新增 ADS 資料
        </button>
      </div>

      <div className="border border-[#dadce0] rounded-lg overflow-x-auto">
        <table className="gads-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>廣告活動名稱</th>
              <th>類型</th>
              <th>狀態</th>
              <th>預算</th>
              <th>曝光</th>
              <th>點擊</th>
              <th>CTR</th>
              <th>轉換</th>
              <th>費用</th>
              <th>帳戶</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td className="text-[#5f6368]">#{c.id}</td>
                <td className="font-medium text-[#1a73e8]">
                  {c.campaign_name}
                </td>
                <td>{c.campaign_type}</td>
                <td>
                  <span
                    className={
                      c.status === "Enabled"
                        ? "status-enabled"
                        : "status-paused"
                    }
                  >
                    {c.status === "Enabled" ? "已啟用" : "已暫停"}
                  </span>
                </td>
                <td>{formatCurrency(c.budget)}</td>
                <td>{c.impressions.toLocaleString()}</td>
                <td>{c.clicks.toLocaleString()}</td>
                <td>{c.ctr}%</td>
                <td>{c.conversions}</td>
                <td>{formatCurrency(c.cost)}</td>
                <td className="text-[#5f6368] text-xs">{c.account_name}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 hover:bg-[#e8f0fe] rounded"
                    >
                      <Pencil size={14} className="text-[#1a73e8]" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 hover:bg-[#fce8e6] rounded"
                    >
                      <Trash2 size={14} className="text-[#d93025]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-4">
              {editingId ? "編輯 ADS 資料" : "新增 ADS 資料"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  廣告活動名稱 *
                </label>
                <input
                  className="gads-input"
                  value={form.campaignName}
                  onChange={(e) =>
                    setForm({ ...form, campaignName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    廣告類型
                  </label>
                  <select
                    className="gads-select w-full"
                    value={form.campaignType}
                    onChange={(e) =>
                      setForm({ ...form, campaignType: e.target.value })
                    }
                  >
                    <option value="Search">搜尋廣告</option>
                    <option value="Display">多媒體廣告</option>
                    <option value="Shopping">購物廣告</option>
                    <option value="Video">影片廣告</option>
                    <option value="App">應用程式廣告</option>
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
              <div className="border-t border-[#dadce0] pt-4">
                <h3 className="text-sm font-medium mb-3 text-[#5f6368]">
                  成效數據
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">曝光次數</label>
                    <input
                      type="number"
                      className="gads-input"
                      value={form.impressions}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          impressions: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">點擊次數</label>
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
                    <label className="block text-sm mb-1">轉換次數</label>
                    <input
                      type="number"
                      className="gads-input"
                      value={form.conversions}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          conversions: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">費用 (TWD)</label>
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
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="gads-btn-outline"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button
                className="gads-btn-primary"
                onClick={handleSave}
                disabled={!form.campaignName}
              >
                {editingId ? "儲存變更" : "新增資料"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
