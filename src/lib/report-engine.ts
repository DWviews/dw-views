import {
  ParsedCSVs,
  formatK,
  formatCurrency,
  formatPercent,
} from "./csv-parser";

export interface ReportData {
  project: {
    name: string;
    campaignName: string;
    reportMonth: string;
    dateRange: string;
  };
  page1: { title: string; subtitle: string; date: string };
  page2: {
    metrics: { label: string; value: string }[];
    insights: string[];
    opportunity: string;
  };
  page3: {
    chartData: { day: string; impressions: number; color: string }[];
    insights: { icon: string; title: string; desc: string }[];
    recommendation: string;
  };
  page4: {
    ageData: { age: string; value: number; color: string }[];
    genderData: { label: string; value: number }[];
    insights: { icon: string; title: string; desc: string }[];
    recommendation: string;
  };
  page5: {
    impressionData: { device: string; value: number; color: string }[];
    convRateData: { device: string; value: number; color: string }[];
    insights: { icon: string; title: string; desc: string }[];
    strategy: string;
  };
  page6: {
    chartData: { location: string; impressions: number; percent: number; color: string }[];
    insights: { icon: string; title: string; desc: string }[];
    recommendation: string;
  };
  page7: {
    chartData: { name: string; share: number; color: string }[];
    insights: { icon: string; title: string; desc: string }[];
    strategy: string;
    yourShare: number;
    topOfPageRate: number;
  };
  page8: {
    optimizations: {
      num: number;
      title: string;
      desc: string;
      impact: string;
      time: string;
    }[];
  };
  page9: {
    methodology: { icon: string; title: string; desc: string }[];
    roadmap: { week: string; task: string }[];
  };
}

const COLORS = {
  dark: "#12377A",
  mid: "#3D8BC1",
  light: "#6BAFD3",
  pale: "#A8D5E5",
  faint: "#D4E8F0",
};

const AGE_COLORS = [
  COLORS.pale,
  COLORS.light,
  COLORS.mid,
  COLORS.mid,
  COLORS.dark,
  COLORS.dark,
];

const DAY_COLORS = [
  COLORS.pale,
  COLORS.light,
  COLORS.light,
  COLORS.mid,
  COLORS.dark,
  COLORS.mid,
  COLORS.dark,
];

function deviceLabel(d: string): string {
  const map: Record<string, string> = {
    "Mobile phones": "Mobile phones",
    "Computers": "Computers",
    "Tablets": "Tablets",
  };
  return map[d] || d;
}

export function generateReport(
  name: string,
  campaignName: string,
  reportMonth: string,
  reportDateRange: string | null | undefined,
  parsed: ParsedCSVs
): ReportData {
  const c = parsed.campaign;
  const dateRange = reportDateRange || c?.dateRange || reportMonth;

  const totalClicks = c?.clicks || parsed.devices.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions =
    c?.impressions ||
    parsed.days.reduce((s, d) => s + d.impressions, 0) ||
    parsed.demographics.reduce((s, d) => s + d.impressions, 0);
  const totalConversions =
    c?.conversions || parsed.devices.reduce((s, d) => s + d.conversions, 0);
  const totalCost = c?.cost || parsed.devices.reduce((s, d) => s + d.cost, 0);
  const ctr = c?.ctr || (totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0);
  const convRate =
    c?.convRate || (totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0);

  const femaleImpr = parsed.demographics
    .filter((d) => d.gender === "Female")
    .reduce((s, d) => s + d.impressions, 0);
  const maleImpr = parsed.demographics
    .filter((d) => d.gender === "Male")
    .reduce((s, d) => s + d.impressions, 0);
  const totalDemoImpr = femaleImpr + maleImpr;
  const femalePct = totalDemoImpr > 0 ? (femaleImpr / totalDemoImpr) * 100 : 0;

  const mobile = parsed.devices.find((d) => d.device.includes("Mobile"));
  const computer = parsed.devices.find((d) => d.device.includes("Computer"));
  const mobileConvRate =
    mobile && mobile.clicks > 0 ? (mobile.conversions / mobile.clicks) * 100 : 0;
  const computerConvRate =
    computer && computer.clicks > 0
      ? (computer.conversions / computer.clicks) * 100
      : 0;
  const mobileClicks = mobile?.clicks || 0;
  const totalDeviceClicks = parsed.devices.reduce((s, d) => s + d.clicks, 0);
  const mobileClickPct =
    totalDeviceClicks > 0 ? (mobileClicks / totalDeviceClicks) * 100 : 0;

  const daysSorted = [...parsed.days].sort((a, b) => b.impressions - a.impressions);
  const maxDay = daysSorted[0];
  const secondDay = daysSorted[1];
  const minDay = daysSorted[daysSorted.length - 1];
  const totalDayImpr = parsed.days.reduce((s, d) => s + d.impressions, 0);

  const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const ageData = ageGroups.map((age, i) => ({
    age,
    value: parsed.demographics
      .filter((d) => d.ageRange === age)
      .reduce((s, d) => s + d.impressions, 0),
    color: AGE_COLORS[i],
  }));
  const topAge = [...ageData].sort((a, b) => b.value - a.value)[0];

  const age55plus = ageData
    .filter((a) => a.age === "55-64" || a.age === "65+")
    .reduce((s, a) => s + a.value, 0);
  const age55Pct = totalDemoImpr > 0 ? (age55plus / totalDemoImpr) * 100 : 0;

  const locTotal = parsed.locations.reduce((s, l) => s + l.impressions, 0);
  const locSorted = [...parsed.locations].sort(
    (a, b) => b.impressions - a.impressions
  );
  const locColors = [COLORS.dark, COLORS.mid, COLORS.light];

  const you = parsed.competitors.find(
    (c) => c.name.toLowerCase() === "you"
  );
  const competitors = parsed.competitors.filter(
    (c) => c.name.toLowerCase() !== "you"
  );
  const topCompetitor = [...competitors].sort(
    (a, b) => b.impressionShare - a.impressionShare
  )[0];
  const compChartData = [
    { name: `You (${name})`, share: you?.impressionShare || 0, color: COLORS.dark },
    ...competitors.slice(0, 3).map((comp, i) => ({
      name: comp.name,
      share: comp.impressionShare,
      color: [COLORS.mid, COLORS.light, COLORS.pale][i],
    })),
  ];
  const compTotal = competitors
    .slice(0, 3)
    .reduce((s, c) => s + c.impressionShare, 0);

  const mobileImpr =
    mobile?.impressions ||
    (mobile && totalDeviceClicks > 0
      ? Math.round(totalImpressions * (mobile.clicks / totalDeviceClicks))
      : 0);
  const mobileImprPct =
    totalImpressions > 0 ? (mobileImpr / totalImpressions) * 100 : 0;

  return {
    project: { name, campaignName, reportMonth, dateRange },
    page1: {
      title: `${name} Google Ads\nKeywords Search\nMonthly Report`,
      subtitle: "Performance Analysis and Strategic Insights",
      date: dateRange,
    },
    page2: {
      metrics: [
        { label: "Total Clicks", value: totalClicks.toLocaleString() },
        { label: "Total Impressions", value: formatK(totalImpressions) },
        { label: "Conversion Rate", value: formatPercent(convRate) },
        { label: "Click-Through Rate", value: formatPercent(ctr) },
        { label: "Cost", value: formatCurrency(totalCost) },
        { label: "Conversions", value: totalConversions.toFixed(1) },
      ],
      insights: [
        `Strong Performance: ${totalClicks.toLocaleString()} clicks generated from ${formatK(totalImpressions)} impressions, resulting in a ${formatPercent(convRate)} conversion rate, demonstrating high-quality traffic.`,
        `Demographic Trend: Female users account for ${formatPercent(femalePct, 1)} of total engagement, indicating stronger appeal to women, particularly in the 35-54 age groups.`,
        `Device Efficiency: Computers show ${formatPercent(computerConvRate)} conversion rate compared to mobile ${formatPercent(mobileConvRate)}, suggesting an opportunity for device-specific optimization.`,
      ],
      opportunity: `Campaign maintains strong performance with ${formatPercent(ctr)} CTR. Strategic optimization of demographic targeting and device bidding can increase conversion value by an estimated 30%.`,
    },
    page3: {
      chartData: parsed.days.map((d, i) => ({
        day: d.day,
        impressions: d.impressions,
        color: DAY_COLORS[i % DAY_COLORS.length],
      })),
      insights: [
        {
          icon: "📅",
          title: `${maxDay?.day || "Peak Day"} Peak`,
          desc: `${maxDay?.day} generates ${maxDay?.impressions.toLocaleString()} impressions, representing ${formatPercent(totalDayImpr > 0 ? (maxDay.impressions / totalDayImpr) * 100 : 0)} of total weekly volume.`,
        },
        {
          icon: "📋",
          title: `Strong ${secondDay?.day || "Second Day"}`,
          desc: `${secondDay?.day} follows with ${secondDay?.impressions.toLocaleString()} impressions, creating a strong performance pattern.`,
        },
        {
          icon: "🔍",
          title: "Low Engagement Day",
          desc: `${minDay?.day} shows the lowest engagement with only ${minDay?.impressions.toLocaleString()} impressions.`,
        },
      ],
      recommendation: `Increase budget allocation for ${maxDay?.day} by 15-20% to capitalize on higher search volume. Implement day-of-week bid adjustments to maximize ROI.`,
    },
    page4: {
      ageData,
      genderData: [
        { label: "Female", value: Math.round(femalePct) },
        { label: "Male", value: Math.round(100 - femalePct) },
      ],
      insights: [
        {
          icon: "👥",
          title: `Core Audience: ${topAge?.age}`,
          desc: `The ${topAge?.age} age group leads with ${topAge?.value.toLocaleString()} impressions, showing strong product-market fit.`,
        },
        {
          icon: "♀",
          title: "Female Dominance",
          desc: `Female users significantly outperform males, accounting for ${formatPercent(femalePct, 1)} of engagement.`,
        },
        {
          icon: "📊",
          title: "Strong Senior Engagement",
          desc: `Users aged 55+ represent ${formatPercent(age55Pct, 1)} of total engagement, suggesting high interest among the mature demographic.`,
        },
      ],
      recommendation:
        "Increase bid adjustments for female users in the 35-54 age group by 20-25% to capitalize on higher engagement. Create dedicated ad groups with female-focused messaging.",
    },
    page5: {
      impressionData: parsed.devices.slice(0, 3).map((d, i) => ({
        device: deviceLabel(d.device),
        value: d.impressions || Math.round(d.clicks * 15),
        color: [COLORS.dark, COLORS.mid, COLORS.light][i],
      })),
      convRateData: parsed.devices.slice(0, 3).map((d, i) => ({
        device: deviceLabel(d.device),
        value: d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0,
        color: [COLORS.dark, COLORS.mid, COLORS.pale][i],
      })),
      insights: [
        {
          icon: "📱",
          title: "Mobile Dominance",
          desc: `Mobile phones drive ${formatPercent(mobileImprPct, 1)} of total impressions and ${formatPercent(mobileClickPct, 1)} of clicks, serving as the primary discovery channel.`,
        },
        {
          icon: "💻",
          title: "Computer Efficiency",
          desc: `Computers achieve a ${formatPercent(computerConvRate)} conversion rate, significantly outperforming mobile (${formatPercent(mobileConvRate)}).`,
        },
        {
          icon: "📈",
          title: "Quality vs. Quantity",
          desc: "While mobile drives volume, computer traffic delivers higher conversion efficiency, indicating higher purchase intent.",
        },
      ],
      strategy:
        "Implement device-specific bid adjustments with +15-20% for computers to capitalize on higher conversion rates. Develop desktop-optimized landing page variants.",
    },
    page6: {
      chartData: locSorted.map((l, i) => ({
        location: l.location,
        impressions: l.impressions,
        percent: locTotal > 0 ? Math.round((l.impressions / locTotal) * 100) : 0,
        color: locColors[i % locColors.length],
      })),
      insights: locSorted.slice(0, 3).map((l, i) => ({
        icon: ["📍", "📋", "🗺️"][i],
        title: `${l.location} ${i === 0 ? "Leads" : i === 1 ? "Follows" : ""}`,
        desc: `${l.location} ${i === 0 ? "leads" : i === 1 ? "follows" : "generates"} with ${l.impressions.toLocaleString()} impressions (${locTotal > 0 ? Math.round((l.impressions / locTotal) * 100) : 0}% of total).`,
      })),
      recommendation: `Apply +10% bid for ${locSorted[0]?.location} to capitalize on volume. Tailor messaging by region.`,
    },
    page7: {
      chartData: compChartData,
      yourShare: you?.impressionShare || 0,
      topOfPageRate: you?.topOfPageRate || 0,
      insights: [
        {
          icon: "📊",
          title: "Market Position",
          desc: `${name} campaign holds ${formatPercent(you?.impressionShare || 0)} impression share${topCompetitor ? `, with top competitor ${topCompetitor.name} at ${formatPercent(topCompetitor.impressionShare)}` : ""}.`,
        },
        {
          icon: "⬆",
          title: "High Visibility",
          desc: `Campaign achieves ${formatPercent(you?.topOfPageRate || 0)} top of page rate, indicating strong ad position.`,
        },
        {
          icon: "👥",
          title: "Competitive Landscape",
          desc: `Top competitors control ${formatPercent(compTotal)}% of the market, representing significant competitive pressure.`,
        },
      ],
      strategy: `Maintain strong bidding for high-value keywords to preserve top of page rate. Conduct competitor landing page analysis to identify conversion optimization opportunities.`,
    },
    page8: {
      optimizations: [
        {
          num: 1,
          title: "Demographic Targeting Enhancement",
          desc: "Implement targeted bid adjustments for female users aged 35-54 (+20-25%) to capitalize on the highest-performing demographic segment. Create dedicated ad groups with female-focused messaging.",
          impact: "+15% Conversion Value",
          time: "1-2 Weeks",
        },
        {
          num: 2,
          title: "Device-Specific Optimization",
          desc: `Increase bid adjustments for computer traffic by 15-20% to capitalize on higher conversion rates (${formatPercent(computerConvRate)} vs ${formatPercent(mobileConvRate)}). Develop desktop-optimized landing page variants.`,
          impact: "+10% Conversion Value",
          time: "2-3 Weeks",
        },
        {
          num: 3,
          title: "Competitive Position Strengthening",
          desc: `Maintain strong bidding for high-value keywords to preserve top of page rate and close the gap with ${topCompetitor?.name || "competitors"}.`,
          impact: "+5% Conversion Value",
          time: "2-3 Weeks",
        },
      ],
    },
    page9: {
      methodology: [
        {
          icon: "📊",
          title: "Campaign Performance Data",
          desc: `Google Ads performance data for ${campaignName} campaign (${dateRange}).`,
        },
        {
          icon: "👥",
          title: "Demographic Analysis",
          desc: `Based on ${totalDemoImpr.toLocaleString()} impressions with known demographic attributes across age and gender segments.`,
        },
        {
          icon: "🔍",
          title: "Competitive Analysis",
          desc: "Using Google Ads Auction Insights data to benchmark against key competitors.",
        },
        {
          icon: "🗺️",
          title: "Geographic Performance",
          desc: "Data from Google Ads location reports across Hong Kong, Kowloon, and New Territories.",
        },
        {
          icon: "📱",
          title: "Device Performance Analysis",
          desc: "Cross-device analysis across mobile phones, computers, and tablets.",
        },
      ],
      roadmap: [
        { week: "Week 1", task: "Implement demographic bid adjustments for female users aged 35-54." },
        { week: "Week 1-2", task: "Apply device bid adjustments for computer traffic." },
        { week: "Week 2-3", task: "Develop and implement desktop-optimized landing page variants." },
        { week: "Week 3-4", task: "Create female-focused ad copy and landing page elements." },
      ],
    },
  };
}
