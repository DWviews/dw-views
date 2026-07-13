function parseNumber(val: string): number {
  if (!val || val === "No data" || val === "--" || val === " --") return 0;
  const cleaned = val.replace(/[",HK$%<>\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parsePercent(val: string): number {
  if (!val || val === "No data") return 0;
  if (val.includes("<")) return 5;
  return parseNumber(val);
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export interface CampaignData {
  campaign: string;
  cost: number;
  clicks: number;
  impressions: number;
  ctr: number;
  convRate: number;
  conversions: number;
  dateRange: string;
}

export interface DayData {
  day: string;
  impressions: number;
}

export interface DemographicRow {
  gender: string;
  ageRange: string;
  impressions: number;
  percent: number;
}

export interface DeviceRow {
  device: string;
  cost: number;
  clicks: number;
  conversions: number;
  impressions?: number;
}

export interface LocationRow {
  location: string;
  impressions: number;
}

export interface CompetitorRow {
  name: string;
  impressionShare: number;
  topOfPageRate: number;
  outrankingShare: number;
}

export interface ParsedCSVs {
  campaign: CampaignData | null;
  days: DayData[];
  demographics: DemographicRow[];
  devices: DeviceRow[];
  locations: LocationRow[];
  competitors: CompetitorRow[];
}

function cleanContent(content: string): string {
  return content.replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim();
}

export function parse01(content: string): CampaignData | null {
  const text = cleanContent(content);
  const lines = text.split("\n");
  if (lines.length < 4) return null;

  const dateRange = lines[1]?.replace(/"/g, "") || "";
  const headers = splitLine(lines[2]);
  const dataLine = lines[3];
  const values = splitLine(dataLine);

  const idx = (name: string) =>
    headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

  const campaignIdx = idx("campaign");
  const costIdx = idx("cost");
  const clicksIdx = idx("clicks");
  const imprIdx = idx("impr");
  const ctrIdx = idx("ctr");
  const convRateIdx = idx("conv. rate");
  const convIdx = headers.findIndex(
    (h) => h.toLowerCase() === "conversions"
  );

  return {
    campaign: values[campaignIdx] || "Campaign",
    cost: parseNumber(values[costIdx]),
    clicks: parseNumber(values[clicksIdx]),
    impressions: parseNumber(values[imprIdx]),
    ctr: parsePercent(values[ctrIdx]),
    convRate: parsePercent(values[convRateIdx]),
    conversions: parseNumber(values[convIdx]),
    dateRange,
  };
}

export function parse02(content: string): DayData[] {
  const lines = cleanContent(content).split("\n").slice(1);
  return lines
    .map((line) => {
      const [day, impressions] = splitLine(line);
      return { day: day?.trim(), impressions: parseNumber(impressions) };
    })
    .filter((d) => d.day);
}

export function parse03(content: string): DemographicRow[] {
  const lines = cleanContent(content).split("\n").slice(1);
  return lines
    .map((line) => {
      const cols = splitLine(line);
      return {
        gender: cols[0]?.trim(),
        ageRange: cols[1]?.trim(),
        impressions: parseNumber(cols[2]),
        percent: parsePercent(cols[3]),
      };
    })
    .filter((d) => d.gender);
}

export function parse04(content: string): DeviceRow[] {
  const lines = cleanContent(content).split("\n").slice(1);
  return lines
    .map((line) => {
      const cols = splitLine(line);
      return {
        device: cols[0]?.trim(),
        cost: parseNumber(cols[1]),
        clicks: parseNumber(cols[2]),
        conversions: parseNumber(cols[3]),
        impressions: cols[4] ? parseNumber(cols[4]) : undefined,
      };
    })
    .filter((d) => d.device && d.device !== "TV screens");
}

export function parse05(content: string): LocationRow[] {
  const lines = cleanContent(content).split("\n").slice(1);
  return lines
    .map((line) => {
      const cols = splitLine(line);
      return {
        location: cols[0]?.trim(),
        impressions: parseNumber(cols[1]),
      };
    })
    .filter((d) => d.location && d.impressions > 0);
}

export function parse06(content: string): CompetitorRow[] {
  const lines = cleanContent(content).split("\n").slice(1);
  return lines
    .map((line) => {
      const cols = splitLine(line);
      return {
        name: cols[0]?.trim(),
        impressionShare: parsePercent(cols[1]),
        topOfPageRate: parsePercent(cols[7]),
        outrankingShare: parsePercent(cols[3]),
      };
    })
    .filter((d) => d.name);
}

export function parseAllCSVs(files: Record<string, string>): ParsedCSVs {
  return {
    campaign: files["01"] ? parse01(files["01"]) : null,
    days: files["02"] ? parse02(files["02"]) : [],
    demographics: files["03"] ? parse03(files["03"]) : [],
    devices: files["04"] ? parse04(files["04"]) : [],
    locations: files["05"] ? parse05(files["05"]) : [],
    competitors: files["06"] ? parse06(files["06"]) : [],
  };
}

export function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

export function formatPercent(n: number, decimals = 2): string {
  return n.toFixed(decimals) + "%";
}
