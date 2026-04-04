"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { memo, useMemo } from "react";
import { ChartContainer } from "@/components/ui/chart";

const chartConfig = {
  Credit: { label: "Income",  color: "var(--success)" },
  Debit:  { label: "Expense", color: "var(--danger)"  },
};

// Colour palette for up to 8 banks
const BANK_COLORS = [
  "#3b82f6","#f59e0b","#8b5cf6","#06b6d4",
  "#f97316","#ec4899","#10b981","#6366f1",
];

function fmtY(v) {
  if (v >= 100000) return `₹${(v/100000).toFixed(0)}L`;
  if (v >= 1000)   return `₹${(v/1000).toFixed(0)}K`;
  return `₹${v}`;
}
function fmtDate(val) {
  if (!val) return "";
  const p = String(val).split("-");
  if (p.length === 3) {
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(p[2])} ${m[parseInt(p[1],10)-1]}`;
  }
  return val;
}
function fmtRupee(n) {
  return `₹${Number(n||0).toLocaleString("en-IN")}`;
}

// ── Custom tooltip ────────────────────────────────────────────────────────
function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // The raw row object is in payload[0].payload — it has `banks: [{bank,credit,debit}]`
  const row    = payload[0]?.payload || {};
  const credit = row.Credit || 0;
  const debit  = row.Debit  || 0;
  const net    = credit - debit;
  const banks  = row.banks || [];

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "12px 16px",
      fontSize: 12,
      minWidth: 200,
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    }}>
      {/* Date */}
      <p style={{ color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, fontSize: 11, letterSpacing: "0.3px" }}>
        {fmtDate(label)}
      </p>

      {/* Per-bank rows — shown FIRST */}
      {banks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {banks.map((b, i) => (
            <div key={b.bank} style={{ marginBottom: 6 }}>
              {/* Bank label */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: BANK_COLORS[i % BANK_COLORS.length],
                  display: "inline-block", flexShrink: 0,
                }} />
                <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 11 }}>{b.bank}</span>
              </div>
              {/* Bank credit/debit */}
              <div style={{ display: "flex", gap: 12, paddingLeft: 14 }}>
                <span style={{ color: "var(--success)" }}>↑ {fmtRupee(b.credit)}</span>
                <span style={{ color: "var(--danger)" }}>↓ {fmtRupee(b.debit)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

      {/* Daily total */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--success)", display: "inline-block" }} />
            <span style={{ color: "var(--text-muted)" }}>Total Income</span>
          </span>
          <span style={{ fontWeight: 700, color: "var(--success)", fontFamily: "DM Mono, monospace" }}>
            {fmtRupee(credit)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--danger)", display: "inline-block" }} />
            <span style={{ color: "var(--text-muted)" }}>Total Expense</span>
          </span>
          <span style={{ fontWeight: 700, color: "var(--danger)", fontFamily: "DM Mono, monospace" }}>
            {fmtRupee(debit)}
          </span>
        </div>
      </div>

      {/* Net */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        borderTop: "1px solid var(--border)", paddingTop: 7, marginTop: 7,
      }}>
        <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Net</span>
        <span style={{
          fontWeight: 700, fontFamily: "DM Mono, monospace",
          color: net >= 0 ? "var(--success)" : "var(--danger)",
        }}>
          {net >= 0 ? "+" : ""}{fmtRupee(net)}
        </span>
      </div>
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────
const Areac = memo(function Areac({ transtables }) {
  const data = useMemo(() => {
    if (!transtables?.length) return [];
    return [...transtables]
      .filter(d => d.date)
      .sort((a, b) => a.date > b.date ? 1 : -1);
  }, [transtables]);

  if (!data.length) {
    return (
      <div style={{
        height: 160, display: "flex", alignItems: "center",
        justifyContent: "center", color: "var(--text-muted)", fontSize: 13,
      }}>
        No data for selected period
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="areachartsize">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gcredit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gdebit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--danger)"  stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--danger)"  stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date" tickLine={false} axisLine={false}
          tickMargin={8} tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          tickFormatter={fmtDate} interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false} axisLine={false}
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          tickFormatter={fmtY} width={48}
        />
        <Tooltip content={<DayTooltip />} />
        <Area
          dataKey="Credit" name="Income" type="monotone"
          fill="url(#gcredit)" stroke="var(--success)" strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: "var(--success)", stroke: "var(--bg-card)", strokeWidth: 2 }}
        />
        <Area
          dataKey="Debit" name="Expense" type="monotone"
          fill="url(#gdebit)" stroke="var(--danger)" strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: "var(--danger)", stroke: "var(--bg-card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
});

export default Areac;
