# DW VIEWS

關鍵字搜尋月度報告系統 — 上傳 Google Ads CSV 資料，自動產生 9 頁鈷藍色月度分析報告。

## 快速開始

### 1. 設定 Supabase 資料庫

1. 在 [Supabase](https://supabase.com) 建立專案
2. 進入 SQL Editor，執行 `supabase/migrations/001_initial_schema.sql`
3. 複製 `.env.example` 為 `.env.local` 並填入 Supabase 金鑰

```bash
cp .env.example .env.local
```

### 2. 本地開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

### 3. 從 SQLite 遷移既有資料（可選）

若你有舊的 `data/dw-views.db`：

```bash
npm install better-sqlite3 --no-save
npx tsx scripts/migrate-sqlite-to-supabase.ts
```

## 預設管理員

首次啟動時系統會自動建立：

| 帳號 | 密碼 |
|------|------|
| ADMIN ACC | admin123 |

## Vercel 部署

### 方式 A：透過網頁（推薦）

1. 將程式碼推到 [GitHub](https://github.com)
2. 登入 [vercel.com](https://vercel.com) → **Add New Project**
3. 匯入你的 GitHub repo
4. 在 **Environment Variables** 加入：

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | 隨機長字串（生產環境必設） |

5. 點 **Deploy**，完成後會得到 `https://你的專案.vercel.app`

### 方式 B：透過 CLI

```bash
npm i -g vercel
vercel login
vercel
```

依提示設定環境變數，之後更新部署：

```bash
vercel --prod
```

### PDF 匯出說明

PDF 功能使用 Playwright Chromium，在 Vercel 無伺服器環境可能無法運作（套件體積與執行時間限制）。本地開發與其他自架環境可正常使用。其餘功能（登入、CSV 上傳、報告、圖表）在 Vercel 上均可正常使用。

## 使用流程

1. 以管理員登入
2. 進入「專案管理」建立新專案（如 NMN）
3. 上傳 6 個 CSV 檔案：

| 檔案 | 內容 | 對應報告頁 |
|------|------|-----------|
| 01.csv | 活動績效 | 第2頁 活動概覽 |
| 02.csv | 每日曝光 | 第3頁 星期分析 |
| 03.csv | 人口統計 | 第4頁 客層分析 |
| 04.csv | 設備數據 | 第5頁 設備性能 |
| 05.csv | 地理分布 | 第6頁 地理分析 |
| 06.csv | 競爭分析 | 第7頁 競價分析 |

4. 上傳完成後點擊專案查看 9 頁月度報告

## 技術架構

- **前端**: Next.js 15 + React 19 + Tailwind CSS 4
- **資料庫**: Supabase (PostgreSQL)
- **部署**: Vercel
- **認證**: JWT + bcrypt
- **報表**: CSV 解析引擎 + Recharts 圖表 + Playwright PDF（本地）

## 環境變數

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（僅伺服器） |
| `JWT_SECRET` | JWT 簽章密鑰（生產環境必設） |
