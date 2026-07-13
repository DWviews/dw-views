import type { ReportData } from "./report-engine";

export const REPORT_SLIDE_COUNT = 9;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metricGrid(metrics: { label: string; value: string }[]) {
  return metrics
    .map(
      (m) => `
      <div class="metric-card">
        <div class="metric-label">${esc(m.label)}</div>
        <div class="metric-value">${esc(m.value)}</div>
      </div>`
    )
    .join("");
}

function insightList(
  insights: { icon?: string; title?: string; desc?: string }[] | string[]
) {
  return insights
    .map((item) => {
      if (typeof item === "string") {
        return `<div class="insight-line">${esc(item)}</div>`;
      }
      return `
        <div class="insight-card">
          <div class="insight-title">${esc(item.icon || "")} ${esc(item.title || "")}</div>
          <div class="insight-desc">${esc(item.desc || "")}</div>
        </div>`;
    })
    .join("");
}

function verticalBarChartSvg(
  items: { label: string; value: number; color?: string }[]
) {
  const width = 560;
  const height = 300;
  const max = Math.max(...items.map((i) => i.value), 1);
  const pad = { top: 16, right: 12, bottom: 34, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / items.length;
  const barW = slot * 0.58;

  const bars = items
    .map((item, i) => {
      const barH = (item.value / max) * innerH;
      const x = pad.left + i * slot + (slot - barW) / 2;
      const y = pad.top + innerH - barH;
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="${item.color || "#12377A"}" />
        <text x="${(x + barW / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#12377A">${esc(item.label)}</text>`;
    })
    .join("");

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = pad.top + innerH - innerH * ratio;
      const value = Math.round(max * ratio);
      return `
        <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" stroke="#e6eef3" stroke-width="1" />
        <text x="${pad.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#858481">${value.toLocaleString()}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${yTicks}${bars}</svg>`;
}

function horizontalBarChartSvg(
  items: { label: string; value: number; color?: string; suffix?: string }[]
) {
  const width = 560;
  const rowH = 34;
  const height = Math.max(180, items.length * rowH + 28);
  const max = Math.max(...items.map((i) => i.value), 1);
  const labelW = 118;
  const valueW = 84;
  const pad = { top: 14, right: 16, bottom: 10, left: 12 };
  const trackX = pad.left + labelW + 8;
  const trackW = width - trackX - valueW - pad.right;

  const rows = items
    .map((item, i) => {
      const y = pad.top + i * rowH;
      const fillW = (item.value / max) * trackW;
      return `
        <text x="${pad.left}" y="${y + 18}" font-size="11" fill="#333">${esc(item.label)}</text>
        <rect x="${trackX}" y="${y + 8}" width="${trackW}" height="16" rx="8" fill="#dfeef5" />
        <rect x="${trackX}" y="${y + 8}" width="${fillW.toFixed(1)}" height="16" rx="8" fill="${item.color || "#12377A"}" />
        <text x="${trackX + trackW + 10}" y="${y + 20}" font-size="11" fill="#333">${esc(`${item.value.toLocaleString()}${item.suffix || ""}`)}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${rows}</svg>`;
}

function donutChartSvg(items: { label: string; value: number }[]) {
  const female = items.find((item) => item.label.toLowerCase() === "female")?.value ?? items[0]?.value ?? 0;
  const male = items.find((item) => item.label.toLowerCase() === "male")?.value ?? items[1]?.value ?? 0;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const stroke = 34;
  const circumference = 2 * Math.PI * r;
  const femaleLen = (female / 100) * circumference;
  const maleLen = circumference - femaleLen;

  return `
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#6BAFD3" stroke-width="${stroke}" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#12377A" stroke-width="${stroke}"
          stroke-dasharray="${femaleLen.toFixed(2)} ${maleLen.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cy})" />
      </svg>
      <div class="legend">
        ${items
          .map(
            (g, i) =>
              `<div><span class="dot" style="background:${i === 0 ? "#12377A" : "#6BAFD3"}"></span>${esc(g.label)}: ${g.value}%</div>`
          )
          .join("")}
      </div>
    </div>`;
}

function slide(pageNum: number, total: number, inner: string): string {
  return `
    <section class="sheet">
      <div class="page">
        <div class="topbar"></div>
        <div class="content">${inner}</div>
        <div class="page-num">${pageNum} / ${total}</div>
      </div>
    </section>`;
}

function chartSlide(
  pageNum: number,
  total: number,
  title: string,
  subtitle: string,
  chartHtml: string,
  sideHtml: string
) {
  return slide(
    pageNum,
    total,
    `<div class="slide-head">
        <h2>${esc(title)}</h2>
        <div class="sub">${esc(subtitle)}</div>
      </div>
      <div class="slide-grid">
        <div class="chart-col">${chartHtml}</div>
        <div class="side-col">${sideHtml}</div>
      </div>`
  );
}

function splitChartSlide(
  pageNum: number,
  total: number,
  title: string,
  subtitle: string,
  topChart: string,
  bottomChart: string,
  sideHtml: string
) {
  return slide(
    pageNum,
    total,
    `<div class="slide-head">
        <h2>${esc(title)}</h2>
        <div class="sub">${esc(subtitle)}</div>
      </div>
      <div class="slide-grid">
        <div class="chart-col split-charts">
          <div class="chart-panel tall">${topChart}</div>
          <div class="chart-panel">${bottomChart}</div>
        </div>
        <div class="side-col">${sideHtml}</div>
      </div>`
  );
}

const PDF_STYLES = `
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 297mm;
    height: 210mm;
    font-family: Arial, Helvetica, sans-serif;
    color: #333;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 100%; height: 100%; overflow: hidden; }
  .page {
    width: 100%;
    height: 100%;
    background: #f2f9fc;
    position: relative;
    overflow: hidden;
  }
  .topbar {
    height: 8px;
    background: linear-gradient(90deg, #12377A 0%, #3D8BC1 50%, #6BAFD3 100%);
  }
  .content {
    height: calc(100% - 8px);
    padding: 24px 32px 28px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page-num {
    position: absolute;
    right: 24px;
    bottom: 14px;
    font-size: 12px;
    color: #858481;
    z-index: 2;
  }
  h1,h2,h3,p { margin: 0; }
  h1 { font-size: 48px; font-weight: 800; line-height: 1.1; color: #12377A; white-space: pre-line; }
  h2 { font-size: 28px; font-weight: 700; color: #12377A; margin-bottom: 4px; }
  .sub { font-size: 15px; color: #858481; margin-bottom: 0; }
  .slide-head { flex-shrink: 0; margin-bottom: 14px; }
  .slide-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 16px;
  }
  .chart-col, .side-col {
    min-height: 0;
    height: 100%;
  }
  .chart-col.split-charts {
    display: grid;
    grid-template-rows: 1.15fr 0.85fr;
    gap: 12px;
  }
  .chart-panel {
    background: #fff;
    border: 1px solid #dbe7ef;
    border-radius: 8px;
    padding: 12px 14px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .chart-panel.tall { min-height: 0; }
  .chart-title {
    font-size: 12px;
    font-weight: 600;
    color: #858481;
    margin-bottom: 8px;
    flex-shrink: 0;
  }
  .chart-body {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chart-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .donut-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }
  .donut-svg { flex-shrink: 0; }
  .legend div { margin-bottom: 8px; font-size: 13px; color: #858481; }
  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
  }
  .side-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }
  .cover {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
  }
  .cover-subtitle { font-size: 28px; color: #3D8BC1; font-weight: 300; margin-top: 18px; }
  .cover-date { margin-top: 24px; font-size: 18px; color: #858481; }
  .watermark {
    position: absolute;
    right: 28px;
    bottom: 28px;
    font-size: 140px;
    font-weight: 800;
    color: rgba(18,55,122,0.08);
    line-height: 1;
  }
  .footer-note {
    position: absolute;
    left: 32px;
    bottom: 18px;
    font-size: 12px;
    color: #858481;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    height: 100%;
    align-content: start;
  }
  .metric-card, .insight-card, .opt-card, .method-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #dbe7ef;
  }
  .metric-card {
    padding: 14px;
    background: rgba(18,55,122,0.05);
    border-color: #d4e3ef;
  }
  .metric-label { font-size: 12px; color: #858481; margin-bottom: 6px; }
  .metric-value { font-size: 32px; font-weight: 700; color: #12377A; }
  .insight-line {
    padding: 10px 0 10px 12px;
    border-left: 3px solid #6BAFD3;
    font-size: 13px;
    line-height: 1.5;
    background: #fff;
    border-radius: 0 8px 8px 0;
  }
  .insight-card { padding: 12px; flex-shrink: 0; }
  .insight-title { font-size: 15px; font-weight: 600; color: #12377A; margin-bottom: 4px; }
  .insight-desc { font-size: 12px; color: #858481; line-height: 1.45; }
  .gradient-box {
    padding: 14px;
    border-radius: 8px;
    background: linear-gradient(135deg, #12377A 0%, #3D8BC1 100%);
    color: #fff;
    margin-top: auto;
    flex-shrink: 0;
  }
  .gradient-box h3 { font-size: 16px; margin-bottom: 6px; }
  .gradient-box p { font-size: 12px; line-height: 1.5; }
  .section-label { margin-bottom: 8px; font-size: 15px; font-weight: 600; color: #12377A; }
  .opt-card {
    display: grid;
    grid-template-columns: 48px 1fr 120px;
    gap: 14px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .opt-num {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #12377A, #3D8BC1);
    color: #fff;
    font-weight: 700;
    font-size: 20px;
  }
  .opt-title { font-size: 16px; font-weight: 600; color: #12377A; margin-bottom: 6px; }
  .opt-desc { font-size: 12px; color: #858481; line-height: 1.45; }
  .opt-side { text-align: right; font-size: 12px; color: #858481; }
  .opt-impact { color: #3D8BC1; font-weight: 600; margin-bottom: 8px; }
  .method-card {
    background: rgba(18,55,122,0.05);
    border-color: #d4e3ef;
    padding: 12px;
    margin-bottom: 8px;
  }
  .method-title { font-size: 14px; font-weight: 600; color: #12377A; margin-bottom: 4px; }
  .method-desc { font-size: 11px; color: #858481; line-height: 1.45; }
`;

function buildSlideBodies(report: ReportData): string[] {
  const p = report;
  const total = REPORT_SLIDE_COUNT;

  const sideWithGradient = (
    insights: { icon?: string; title?: string; desc?: string }[] | string[],
    gradientTitle: string,
    gradientText: string
  ) => `${insightList(insights)}<div class="gradient-box"><h3>${esc(gradientTitle)}</h3><p>${esc(gradientText)}</p></div>`;

  return [
    slide(
      1,
      total,
      `<div class="cover">
        <div>
          <h1>${esc(p.page1.title)}</h1>
          <div class="cover-subtitle">${esc(p.page1.subtitle)}</div>
          <div class="cover-date">${esc(p.page1.date)}</div>
        </div>
        <div class="watermark">2026</div>
        <div class="footer-note">Marketing Report provided by Diamond Wise Company ©2026</div>
      </div>`
    ),
    slide(
      2,
      total,
      `<div class="slide-head"><h2>Campaign Overview</h2></div>
      <div class="slide-grid">
        <div class="chart-col"><div class="metrics-grid">${metricGrid(p.page2.metrics)}</div></div>
        <div class="side-col">
          <div class="section-label">Key Insights</div>
          ${sideWithGradient(p.page2.insights, "Key Opportunity", p.page2.opportunity)}
        </div>
      </div>`
    ),
    chartSlide(
      3,
      total,
      "Day of Week Performance",
      "Weekly impression trends and engagement patterns",
      `<div class="chart-panel" style="height:100%">
        <div class="chart-title">Weekly Impressions</div>
        <div class="chart-body">${verticalBarChartSvg(
          p.page3.chartData.map((d) => ({
            label: d.day,
            value: d.impressions,
            color: d.color,
          }))
        )}</div>
      </div>`,
      sideWithGradient(
        p.page3.insights,
        "Optimization Recommendation",
        p.page3.recommendation
      )
    ),
    splitChartSlide(
      4,
      total,
      "Demographics Analysis",
      "Audience breakdown by age group and gender",
      `<div class="chart-title">Age Distribution (Impressions)</div>
        <div class="chart-body">${verticalBarChartSvg(
          p.page4.ageData.map((d) => ({
            label: d.age,
            value: d.value,
            color: d.color,
          }))
        )}</div>`,
      `<div class="chart-title">Gender Distribution</div>
        <div class="chart-body">${donutChartSvg(p.page4.genderData)}</div>`,
      sideWithGradient(
        p.page4.insights,
        "Targeting Recommendation",
        p.page4.recommendation
      )
    ),
    splitChartSlide(
      5,
      total,
      "Device Performance",
      "Impression volume and conversion efficiency by device",
      `<div class="chart-title">Device Impressions Volume</div>
        <div class="chart-body">${horizontalBarChartSvg(
          p.page5.impressionData.map((d) => ({
            label: d.device,
            value: d.value,
            color: d.color,
          }))
        )}</div>`,
      `<div class="chart-title">Conversion Rate by Device</div>
        <div class="chart-body">${horizontalBarChartSvg(
          p.page5.convRateData.map((d) => ({
            label: d.device,
            value: Number(d.value.toFixed(2)),
            color: d.color,
            suffix: "%",
          }))
        )}</div>`,
      sideWithGradient(
        p.page5.insights,
        "Device Optimization Strategy",
        p.page5.strategy
      )
    ),
    chartSlide(
      6,
      total,
      "Geographic Distribution",
      "Impression volume across Hong Kong regions",
      `<div class="chart-panel" style="height:100%">
        <div class="chart-title">Regional Impressions</div>
        <div class="chart-body">${horizontalBarChartSvg(
          p.page6.chartData.map((d) => ({
            label: d.location,
            value: d.impressions,
            color: d.color,
          }))
        )}</div>
      </div>`,
      sideWithGradient(
        p.page6.insights,
        "Geographic Targeting Recommendation",
        p.page6.recommendation
      )
    ),
    chartSlide(
      7,
      total,
      "Competitive Analysis",
      "Market share and visibility benchmarking",
      `<div class="chart-panel" style="height:100%">
        <div class="chart-title">Impression Share</div>
        <div class="chart-body">${horizontalBarChartSvg(
          p.page7.chartData.map((d) => ({
            label: d.name,
            value: Number(d.share.toFixed(2)),
            color: d.color,
            suffix: "%",
          }))
        )}</div>
      </div>`,
      sideWithGradient(
        p.page7.insights,
        "Competitive Strategy",
        p.page7.strategy
      )
    ),
    slide(
      8,
      total,
      `<div class="slide-head">
        <h2>Optimization Opportunities</h2>
        <div class="sub">Strategic Recommendations for Performance Enhancement</div>
      </div>
      <div style="flex:1; min-height:0; overflow:hidden;">
        ${p.page8.optimizations
          .map(
            (opt) => `
            <div class="opt-card">
              <div class="opt-num">${opt.num}</div>
              <div>
                <div class="opt-title">${esc(opt.title)}</div>
                <div class="opt-desc">${esc(opt.desc)}</div>
              </div>
              <div class="opt-side">
                <div class="opt-impact">${esc(opt.impact)}</div>
                <div>${esc(opt.time)}</div>
              </div>
            </div>`
          )
          .join("")}
      </div>`
    ),
    slide(
      9,
      total,
      `<div class="slide-head">
        <h2>Methodology and Roadmap</h2>
        <div class="sub">Data sources, analysis methodology, and implementation plan</div>
      </div>
      <div class="slide-grid">
        <div class="chart-col">
          <div class="section-label">Data Sources & Methodology</div>
          ${p.page9.methodology
            .map(
              (m) => `
                <div class="method-card">
                  <div class="method-title">${esc(m.icon)} ${esc(m.title)}</div>
                  <div class="method-desc">${esc(m.desc)}</div>
                </div>`
            )
            .join("")}
        </div>
        <div class="side-col">
          <div class="section-label">Implementation Roadmap</div>
          ${p.page9.roadmap
            .map(
              (r) => `
                <div class="method-card">
                  <div class="method-title">📅 ${esc(r.week)}</div>
                  <div class="method-desc">${esc(r.task)}</div>
                </div>`
            )
            .join("")}
          <div class="gradient-box"><h3>Diamond Wise Company | Dave</h3><p>Email: sales@diamondwisecpy.com<br />For questions or implementation support, please contact us.</p></div>
        </div>
      </div>`
    ),
  ];
}

function wrapSlideHtml(slideHtml: string): string {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Monthly Report</title>
      <style>${PDF_STYLES}</style>
    </head>
    <body>
      ${slideHtml}
    </body>
  </html>`;
}

export function buildSlideHtml(report: ReportData, slideIndex: number): string {
  const slides = buildSlideBodies(report);
  const slideHtml = slides[slideIndex];
  if (!slideHtml) {
    throw new Error(`Invalid slide index: ${slideIndex}`);
  }
  return wrapSlideHtml(slideHtml);
}

export function buildReportHtml(report: ReportData, _projectName: string): string {
  return wrapSlideHtml(buildSlideBodies(report).join(""));
}
