"use client";
import { memo, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  "#5a82e1","#4ade80","#f87171","#fbbf24","#a78bfa",
  "#34d399","#fb7185","#60a5fa","#f472b6","#2dd4bf",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background:"var(--bg-secondary)", border:"1px solid var(--border)",
      borderRadius:10, padding:"8px 12px", fontSize:12,
    }}>
      <p style={{ fontWeight:600, marginBottom:2 }}>{d.name}</p>
      <p style={{ color:"var(--danger)" }}>₹{Number(d.value||0).toFixed(2)}</p>
    </div>
  );
};

const Piec = memo(function Piec({ catamount }) {
  const items = useMemo(() => {
    if (!catamount?.length) return [];
    return catamount
      .filter(c => c.amount > 0)
      .map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] }));
  }, [catamount]);

  const total = useMemo(() => items.reduce((s, c) => s + c.amount, 0), [items]);

  if (!items.length) {
    return (
      <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", fontSize:13 }}>
        No category data
      </div>
    );
  }

  const formatMoney = (n) => {
    if (n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
    if (n >= 1000) return "₹" + (n/1000).toFixed(1) + "K";
    return "₹" + n.toFixed(0);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={items} dataKey="amount" nameKey="category"
            cx="50%" cy="50%" innerRadius={42} outerRadius={62}
            strokeWidth={2} stroke="var(--bg-card)"
          >
            {items.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend — single scrollable row */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 8px", marginTop:6 }}>
        {items.slice(0,6).map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9 }}>
            <div style={{ width:7, height:7, borderRadius:2, background:item.fill, flexShrink:0 }} />
            <span style={{ color:"#999", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:52 }}>{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default Piec;
