import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  return NextResponse.json({
    totals: {
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      total_cost: 0,
      campaign_count: 0,
    },
    campaigns: [],
    recentMetrics: [],
  });
}
