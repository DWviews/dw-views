import { copyrightLine } from "@/lib/app-version";

const METRICS = [
  { value: "50+", label: "Google Ads 帳號", sub: "多客戶集中管理" },
  { value: "99.9%", label: "系統可用性", sub: "企業級 SLA 保障" },
  { value: "<200ms", label: "API 回應", sub: "即時數據同步" },
  { value: "10M+", label: "日曝光追蹤", sub: "大規模廣告監控" },
];

const FEATURES = [
  { label: "即時儀表板", desc: "30 天趨勢 · ROAS · CTR" },
  { label: "多帳號權限", desc: "RBAC 分級存取控制" },
  { label: "廣告成效監控", desc: "Campaign · 關鍵字 · 轉換追蹤" },
  { label: "月度洞察報告", desc: "受眾 · 裝置 · 地理分布分析" },
];

export default function LoginHero() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-[#1a73e8] relative overflow-hidden items-center justify-center p-12">
      {/* Animated background SVG layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <path
            id="orbitPathOuter"
            d="M 60 0 A 60 60 0 1 1 -60 0 A 60 60 0 1 1 60 0"
            fill="none"
          />
          <path
            id="orbitPathInner"
            d="M 40 0 A 40 40 0 1 0 -40 0 A 40 40 0 1 0 40 0"
            fill="none"
          />
          <path id="orbitPathSmall" d="M 35 0 A 35 35 0 1 1 -35 0 A 35 35 0 1 1 35 0" fill="none" />
        </defs>

        {/* Grid */}
        <g className="login-grid-drift" opacity="0.08" stroke="white" strokeWidth="1">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 80} x2="800" y2={i * 80} />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2="900" />
          ))}
        </g>

        {/* Glow orbs */}
        <circle cx="650" cy="150" r="120" fill="url(#glowGrad)" className="login-orb-1" />
        <circle cx="100" cy="700" r="160" fill="url(#glowGrad)" className="login-orb-2" />
        <circle cx="400" cy="80" r="70" fill="url(#glowGrad)" className="login-orb-3" />

        {/* Mini bar chart */}
        <g transform="translate(500, 640)" opacity="0.28">
          {[0, 18, 36, 54, 72, 90].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={80 - [28, 48, 36, 62, 44, 70][i]}
              width="10"
              height={[28, 48, 36, 62, 44, 70][i]}
              rx="2"
              fill="white"
              className="login-bar"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </g>

        {/* Secondary trend line */}
        <g transform="translate(220, 380)" opacity="0.22">
          <polyline
            points="0,60 50,45 100,55 150,25 200,35 260,15"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="login-chart-line-secondary"
          />
        </g>

        {/* Animated trend chart */}
        <g transform="translate(60, 520)" opacity="0.35">
          <polyline
            points="0,120 80,90 160,100 240,60 320,70 400,30 480,45 560,10 640,25"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="login-chart-line"
          />
          <polyline
            points="0,120 80,90 160,100 240,60 320,70 400,30 480,45 560,10 640,25 640,140 0,140"
            fill="white"
            opacity="0.06"
            className="login-chart-area"
          />
          {[
            [0, 120], [80, 90], [160, 100], [240, 60], [320, 70],
            [400, 30], [480, 45], [560, 10], [640, 25],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="4"
              fill="white"
              className="login-chart-dot"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </g>

        {/* Orbiting rings */}
        <g transform="translate(680, 380)">
          <circle r="60" fill="none" stroke="white" strokeWidth="1" opacity="0.15" className="login-orbit-ring" />
          <circle r="40" fill="none" stroke="white" strokeWidth="1" opacity="0.1" className="login-orbit-ring-reverse" />
          <circle r="3" fill="white" opacity="0.8" className="login-orbit-dot">
            <animateMotion dur="8s" repeatCount="indefinite">
              <mpath href="#orbitPathOuter" />
            </animateMotion>
          </circle>
          <circle r="2.5" fill="white" opacity="0.55" className="login-orbit-dot-slow">
            <animateMotion dur="12s" repeatCount="indefinite">
              <mpath href="#orbitPathInner" />
            </animateMotion>
          </circle>
        </g>

        <g transform="translate(130, 300)" opacity="0.45">
          <circle r="35" fill="none" stroke="white" strokeWidth="0.8" opacity="0.12" className="login-orbit-ring-reverse" />
          <circle r="2" fill="white" opacity="0.65">
            <animateMotion dur="6s" repeatCount="indefinite">
              <mpath href="#orbitPathSmall" />
            </animateMotion>
          </circle>
        </g>

        {/* Data flow lines */}
        <g opacity="0.2">
          <line x1="0" y1="300" x2="800" y2="300" stroke="url(#lineGrad)" strokeWidth="1" className="login-flow-line" />
          <line x1="0" y1="450" x2="800" y2="450" stroke="url(#lineGrad)" strokeWidth="1" className="login-flow-line" style={{ animationDelay: "1.5s" }} />
          <line x1="0" y1="600" x2="800" y2="600" stroke="url(#lineGrad)" strokeWidth="1" className="login-flow-line" style={{ animationDelay: "3s" }} />
          <line x1="0" y1="750" x2="800" y2="750" stroke="url(#lineGrad)" strokeWidth="1" className="login-flow-line" style={{ animationDelay: "4.5s" }} />
        </g>

        {/* Vertical data streams */}
        {[
          { x: 90, delay: "0s" },
          { x: 360, delay: "1.8s" },
          { x: 620, delay: "0.9s" },
        ].map((stream) => (
          <line
            key={stream.x}
            x1={stream.x}
            y1="0"
            x2={stream.x}
            y2="900"
            stroke="white"
            strokeWidth="1"
            opacity="0.06"
            className="login-stream"
            style={{ animationDelay: stream.delay }}
          />
        ))}

        {/* Greater China region nodes */}
        <g transform="translate(520, 200)" opacity="0.5">
          <circle r="50" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" className="login-region-ring" />
          <g className="login-region-sweep">
            <line x1="0" y1="0" x2="0" y2="-50" stroke="white" strokeWidth="1" opacity="0.35" />
          </g>
          {[
            { x: 0, y: -30, label: "CN" },
            { x: 35, y: 15, label: "HK" },
            { x: -30, y: 20, label: "TW" },
          ].map((node, i) => (
            <g key={node.label} transform={`translate(${node.x}, ${node.y})`}>
              <circle r="14" fill="none" stroke="white" strokeWidth="0.6" opacity="0.25" className="login-signal-ring" style={{ animationDelay: `${i * 0.8}s` }} />
              <circle r="6" fill="white" className="login-region-node" style={{ animationDelay: `${i * 0.6}s` }} />
              <text
                x="0"
                y="18"
                textAnchor="middle"
                fill="white"
                fontSize="9"
                opacity="0.8"
              >
                {node.label}
              </text>
            </g>
          ))}
          <line x1="0" y1="-30" x2="35" y2="15" stroke="white" strokeWidth="0.8" opacity="0.35" className="login-network-line" />
          <line x1="0" y1="-30" x2="-30" y2="20" stroke="white" strokeWidth="0.8" opacity="0.35" className="login-network-line" style={{ animationDelay: "0.6s" }} />
          <line x1="35" y1="15" x2="-30" y2="20" stroke="white" strokeWidth="0.8" opacity="0.35" className="login-network-line" style={{ animationDelay: "1.2s" }} />
          <circle r="2" fill="white" opacity="0.9" className="login-data-packet">
            <animateMotion dur="3s" repeatCount="indefinite" path="M 0 -30 L 35 15" />
          </circle>
          <circle r="1.5" fill="white" opacity="0.7" className="login-data-packet login-data-packet-delayed">
            <animateMotion dur="4s" repeatCount="indefinite" path="M 0 -30 L -30 20" />
          </circle>
        </g>

        {/* Floating KPI badges */}
        {[
          { x: 620, y: 480, label: "CTR" },
          { x: 80, y: 320, label: "ROAS" },
          { x: 340, y: 160, label: "CPC" },
        ].map((badge, i) => (
          <g key={badge.label} transform={`translate(${badge.x}, ${badge.y})`} className="login-kpi-badge" style={{ animationDelay: `${i * 0.7}s` }}>
            <rect x="-22" y="-10" width="44" height="20" rx="10" fill="white" opacity="0.12" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8" opacity="0.75" fontWeight="500">
              {badge.label}
            </text>
          </g>
        ))}

        {/* Floating particles */}
        {[
          { cx: 150, cy: 180, r: 2, delay: "0s", drift: false },
          { cx: 300, cy: 120, r: 1.5, delay: "1.2s", drift: true },
          { cx: 450, cy: 350, r: 2.5, delay: "0.8s", drift: false },
          { cx: 200, cy: 400, r: 1.5, delay: "2s", drift: true },
          { cx: 700, cy: 600, r: 2, delay: "1.5s", drift: false },
          { cx: 50, cy: 550, r: 1.5, delay: "0.4s", drift: true },
          { cx: 580, cy: 280, r: 1.8, delay: "2.4s", drift: false },
          { cx: 250, cy: 680, r: 2, delay: "1.8s", drift: true },
          { cx: 720, cy: 420, r: 1.2, delay: "3s", drift: false },
          { cx: 380, cy: 500, r: 1.6, delay: "0.6s", drift: true },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="white"
            className={p.drift ? "login-particle-drift" : "login-particle"}
            style={{ animationDelay: p.delay }}
          />
        ))}
      </svg>

      {/* Content */}
      <div className="relative z-10 text-white max-w-lg w-full flex flex-col min-h-[80vh]">
        <div className="flex-1">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8 login-hero-fade" style={{ animationDelay: "0.05s" }}>
            <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center login-logo-pulse">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#1a73e8">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.5 3.75v7.5L12 19.18l-7.5-3.75v-7.5L12 4.18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-wide">DW VIEWS</h1>
              <p className="text-blue-100 text-sm">Enterprise Google Ads Platform</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-normal mb-3 leading-snug login-hero-fade" style={{ animationDelay: "0.15s" }}>
            企業級廣告數據<br />智能管理平台
          </h2>
          <p className="text-blue-100 text-base leading-relaxed mb-2 login-hero-fade" style={{ animationDelay: "0.25s" }}>
            為大中華區行銷團隊打造的一站式 Google Ads 解決方案，涵蓋
            <span className="text-white font-medium"> 中國大陸、香港、台灣 </span>
            市場，以即時 API 串接與視覺化分析驅動精準決策。
          </p>
          <p className="text-blue-200/80 text-sm mb-8 login-hero-fade" style={{ animationDelay: "0.35s" }}>
            Powered by Google Ads API · Next.js · Real-time Analytics
          </p>

          {/* Technical metrics */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="bg-white/10 rounded-lg p-3.5 backdrop-blur-sm border border-white/10 login-metric-card"
              >
                <div className="text-2xl font-light tracking-tight">{m.value}</div>
                <div className="font-medium text-sm mt-0.5">{m.label}</div>
                <div className="text-blue-200 text-xs mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((item) => (
              <div
                key={item.label}
                className="bg-white/10 rounded-lg p-3.5 backdrop-blur-sm border border-white/5 login-feature-card"
              >
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-blue-200 text-xs mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-white/15">
          <p className="text-blue-200/70 text-xs">
            {copyrightLine("All rights reserved.")}
          </p>
          <p className="text-blue-200/50 text-xs mt-1">
            大中華區服務範圍：中國大陸 · 香港 · 台灣
          </p>
        </div>
      </div>
    </div>
  );
}
