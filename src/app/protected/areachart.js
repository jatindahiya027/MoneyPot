"use client";
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { memo, useMemo } from "react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--bg-secondary)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>₹{Number(p.value || 0).toFixed(2)}</strong>
        </p>
      ))}
    </div>
  );
};

const Areac = memo(function Areac({ transtables }) {
  const data = useMemo(() => {
    if (!transtables || !transtables.length) return [];
    return [...transtables]
      .filter(d => d.date)
      .sort((a, b) => a.date > b.date ? 1 : -1)
      .map(d => ({
        date: d.date,
        Credit: Number(d.Credit || 0),
        Debit: Number(d.Debit || 0),
      }));
  }, [transtables]);

  if (!data.length) {
    return (
      <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No data for selected period
      </div>
    );
  }

  // Abbreviate date labels
  const formatDate = (val) => {
    if (!val) return "";
    const parts = String(val).split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${parts[2]} ${months[parseInt(parts[1],10)-1]}`;
    }
    return val;
  };

  const formatY = (val) => {
    if (val >= 100000) return `₹${(val/100000).toFixed(0)}L`;
    if (val >= 1000) return `₹${(val/1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCredit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDebit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date" tickLine={false} axisLine={false}
          tickMargin={8} tick={{ fontSize: 10, fill: "#555" }}
          tickFormatter={formatDate}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false} axisLine={false}
          tick={{ fontSize: 10, fill: "#555" }}
          tickFormatter={formatY}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          dataKey="Credit" name="Income" type="monotone"
          fill="url(#gradCredit)" stroke="var(--success)" strokeWidth={1.5}
          dot={false} activeDot={{ r: 4, fill: "var(--success)" }}
        />
        <Area
          dataKey="Debit" name="Expense" type="monotone"
          fill="url(#gradDebit)" stroke="var(--danger)" strokeWidth={1.5}
          dot={false} activeDot={{ r: 4, fill: "var(--danger)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export default Areac;
