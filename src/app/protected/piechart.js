"use client";
import { memo, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const PALETTE = [
  "#5a82e1","#4ade80","#f87171","#fbbf24","#a78bfa",
  "#34d399","#fb7185","#60a5fa","#f472b6","#2dd4bf",
];

function fmtMoney(n) {
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// Custom tooltip styled to match the dark theme
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "var(--bg-secondary)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: d.payload.fill, display: "inline-block" }} />
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</span>
      </div>
      <p style={{ color: "var(--danger)", fontFamily: "DM Mono, monospace", fontWeight: 700 }}>
        {fmtMoney(d.value)}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
        {d.payload.pct}% of total
      </p>
    </div>
  );
}

const Piec = memo(function Piec({ catamount }) {
  const { items, total, chartConfig } = useMemo(() => {
    if (!catamount?.length) return { items: [], total: 0, chartConfig: {} };
    const total = catamount.filter(c => c.amount > 0).reduce((s, c) => s + c.amount, 0);
    const items = catamount
      .filter(c => c.amount > 0)
      .map((c, i) => ({
        ...c,
        fill: PALETTE[i % PALETTE.length],
        pct: total > 0 ? ((c.amount / total) * 100).toFixed(1) : "0.0",
      }));

    // Build shadcn chartConfig from items
    const chartConfig = Object.fromEntries(
      items.map(c => [c.category, { label: c.category, color: c.fill }])
    );

    return { items, total, chartConfig };
  }, [catamount]);

  if (!items.length) {
    return (
      <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No category data
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height: 160 }}>
      <PieChart>
        <Pie
          data={items} dataKey="amount" nameKey="category"
          cx="50%" cy="50%" innerRadius={42} outerRadius={62}
          strokeWidth={2} stroke="var(--bg-card)"
          paddingAngle={2}
        >
          {items.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
      </PieChart>
      {/* Compact legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 6, justifyContent: "center" }}>
        {items.slice(0, 6).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: item.fill, flexShrink: 0 }} />
            <span style={{ color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 52 }}>
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
});

export default Piec;
