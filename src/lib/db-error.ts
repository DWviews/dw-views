const MIGRATION_HINT =
  "請在 Supabase SQL Editor 依序執行 supabase/migrations/003_client_logos.sql 與 004_client_logos_content.sql。";

function extractMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" ? message : String(message);
  }
  if (typeof error === "string") return error;
  return null;
}

export function formatDbError(error: unknown, fallback = "資料庫操作失敗"): string {
  const message = extractMessage(error);
  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (
    lower.includes('relation "client_logos" does not exist') ||
    lower.includes("could not find the table") && lower.includes("client_logos")
  ) {
    return `標誌素材庫資料表尚未建立。${MIGRATION_HINT}`;
  }

  if (lower.includes("content_base64")) {
    return `標誌內容欄位尚未建立。${MIGRATION_HINT}`;
  }

  if (lower.includes("logo_id")) {
    return `專案 logo_id 欄位尚未建立。${MIGRATION_HINT}`;
  }

  if (lower.includes("storage_backend") && lower.includes("check constraint")) {
    return `標誌儲存類型尚未更新。${MIGRATION_HINT}`;
  }

  return message;
}

export function toDbError(error: unknown, fallback = "資料庫操作失敗"): Error {
  return new Error(formatDbError(error, fallback));
}
