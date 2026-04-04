"use client";
import { getToken, clearToken } from "@/libs/clientToken";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Cell
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";

function fmt(v) {
  if (Math.abs(v) >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000)   return `₹${(v/1000).toFixed(1)}K`;
  return `₹${v}`;
}

export default function MonthTrend() {
  const [data, setData] = useState({ trend: [], catByMonth: {} });
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("bar"); // "bar" | "net" | "table"
  const [selectedMonth, setSelectedMonth] = useState(null);

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`/api/monthtrend?months=${months}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const trend = data.trend || [];
  const catByMonth = data.catByMonth || {};

  // Summary stats
  const avgIncome   = trend.length ? Math.round(trend.reduce((s,r) => s + r.income, 0) / trend.length) : 0;
  const avgExpenses = trend.length ? Math.round(trend.reduce((s,r) => s + r.expenses, 0) / trend.length) : 0;
  const bestSaving  = trend.length ? trend.reduce((best, r) => r.net > best.net ? r : best, trend[0]) : null;
  const worstMonth  = trend.length ? trend.reduce((worst, r) => r.net < worst.net ? r : worst, trend[0]) : null;

  const tabStyle = (active) => ({
    fontSize:13, padding:"5px 14px", borderRadius:6, border:"1px solid var(--border)",
    cursor:"pointer", background: active ? "var(--bg-secondary)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
  });

  return (
    <div className="transdiv" style={{ padding:28 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:600 }}>Month-over-Month Trends</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--text-muted)" }}>Compare income vs expenses across months</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select value={months} onChange={e => setMonths(Number(e.target.value))}
            className="form-select" style={{ width:140 }}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {trend.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
          {[
            { label:"Avg monthly income",   value: fmt(avgIncome),   color:"#22c55e" },
            { label:"Avg monthly expenses", value: fmt(avgExpenses), color:"#ef4444" },
            { label:"Best month (net)",     value: bestSaving ? `${bestSaving.label} ${fmt(bestSaving.net)}` : "—", color:"#22c55e" },
            { label:"Worst month (net)",    value: worstMonth ? `${worstMonth.label} ${fmt(worstMonth.net)}` : "—", color:"#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background:"var(--bg-secondary)", borderRadius:10, padding:"14px 16px" }}>
              <p style={{ margin:"0 0 4px", fontSize:12, color:"var(--text-muted)" }}>{label}</p>
              <p style={{ margin:0, fontSize:16, fontWeight:600, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* View tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["bar","Income vs Expenses"],["net","Net savings"],["table","Table view"]].map(([v,l]) => (
          <button key={v} style={tabStyle(view===v)} onClick={() => setView(v)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--text-muted)" }}>Loading…</div>
      ) : trend.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--text-muted)" }}>
          <p style={{ fontSize:16 }}>No data yet</p>
          <p style={{ fontSize:13 }}>Add some transactions to see your monthly trends.</p>
        </div>
      ) : (
        <>
          {/* ── Income vs Expenses — shadcn Card + bar chart ── */}
          {view === "bar" && (() => {
            const barConfig = {
              income:   { label: "Income",   color: "var(--chart-1)" },
              expenses: { label: "Expenses", color: "var(--chart-2)" },
            };
            // Compute trend direction for footer
            const last  = trend[trend.length - 1];
            const prev  = trend[trend.length - 2];
            const netLast = last ? last.income - last.expenses : 0;
            const trendUp = prev ? netLast >= (prev.income - prev.expenses) : true;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <CardDescription>
                    {trend[0]?.label} – {last?.label} · click a bar to drill down
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={barConfig} className="h-[280px] w-full">
                    <BarChart
                      accessibilityLayer
                      data={trend}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      barGap={3}
                      onClick={d => d?.activeLabel && setSelectedMonth(d.activePayload?.[0]?.payload)}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      />
                      <YAxis
                        tickFormatter={fmt}
                        tickLine={false}
                        axisLine={false}
                        width={54}
                        tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dashed"
                            formatter={(value, name, item, index, payload) => (
                              <>
                                <span style={{ color: "var(--text-muted)" }}>
                                  {name === "income" ? "Income" : "Expenses"}
                                </span>
                                <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                                  ₹{Number(value).toLocaleString("en-IN")}
                                </span>
                                {index === payload.length - 1 && (() => {
                                  const inc = payload.find(p => p.dataKey === "income")?.value || 0;
                                  const exp = payload.find(p => p.dataKey === "expenses")?.value || 0;
                                  const net = inc - exp;
                                  return (
                                    <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", width: "100%" }}>
                                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Net</span>
                                      <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 700, color: net >= 0 ? "var(--chart-1)" : "var(--chart-2)" }}>
                                        {net >= 0 ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="income"   fill="var(--color-income)"   radius={4} maxBarSize={36} />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} maxBarSize={36} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-primary)" }}>
                    {trendUp ? "Net savings trending up" : "Net savings trending down"}&nbsp;
                    <span style={{ fontSize: 16 }}>{trendUp ? "📈" : "📉"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Last month net: <strong style={{ color: netLast >= 0 ? "var(--chart-1)" : "var(--chart-2)" }}>
                      {netLast >= 0 ? "+" : ""}₹{Math.abs(netLast).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </CardFooter>
              </Card>
            );
          })()}

          {/* ── Net savings — shadcn Card + coloured bar chart ── */}
          {view === "net" && (() => {
            const netConfig = {
              net: { label: "Net Savings", color: "var(--chart-1)" },
            };
            const totalNet = trend.reduce((s, r) => s + r.net, 0);
            const positiveMonths = trend.filter(r => r.net >= 0).length;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Net Savings</CardTitle>
                  <CardDescription>
                    {trend[0]?.label} – {trend[trend.length-1]?.label} · green = saved, red = overspent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={netConfig} className="h-[280px] w-full">
                    <BarChart
                      accessibilityLayer
                      data={trend}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      />
                      <YAxis
                        tickFormatter={fmt}
                        tickLine={false}
                        axisLine={false}
                        width={54}
                        tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dashed"
                            formatter={(value) => (
                              <>
                                <span style={{ color: "var(--text-muted)" }}>Net savings</span>
                                <span style={{
                                  fontFamily: "DM Mono, monospace", fontWeight: 700,
                                  color: value >= 0 ? "var(--chart-1)" : "var(--chart-2)",
                                }}>
                                  {value >= 0 ? "+" : ""}₹{Math.abs(value).toLocaleString("en-IN")}
                                </span>
                              </>
                            )}
                          />
                        }
                      />
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 4" />
                      <Bar dataKey="net" radius={4} maxBarSize={36}>
                        {trend.map((entry, i) => (
                          <Cell key={i} fill={entry.net >= 0 ? "var(--chart-1)" : "var(--chart-2)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-primary)" }}>
                    {positiveMonths} of {trend.length} months in the green
                    &nbsp;<span style={{ fontSize: 16 }}>{positiveMonths >= trend.length / 2 ? "✅" : "⚠️"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Total net over period:&nbsp;
                    <strong style={{ color: totalNet >= 0 ? "var(--chart-1)" : "var(--chart-2)" }}>
                      {totalNet >= 0 ? "+" : ""}₹{Math.abs(totalNet).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </CardFooter>
              </Card>
            );
          })()}

          {/* Table view */}
          {view === "table" && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--border)" }}>
                    {["Month","Income","Expenses","Net","Savings rate"].map(h => (
                      <th key={h} style={{ textAlign: h==="Month"?"left":"right", padding:"8px 12px", fontWeight:500, color:"var(--text-muted)", fontSize:12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trend].reverse().map(r => {
                    const savingRate = r.income > 0 ? Math.round((r.net / r.income) * 100) : 0;
                    return (
                      <tr key={r.month} style={{ borderBottom:"1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.background="var(--bg-secondary)"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td style={{ padding:"10px 12px", fontWeight:500 }}>{r.label}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:"#22c55e" }}>₹{r.income.toLocaleString("en-IN")}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:"#ef4444" }}>₹{r.expenses.toLocaleString("en-IN")}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:600, color: r.net >= 0 ? "#22c55e" : "#ef4444" }}>
                          {r.net >= 0 ? "+" : ""}₹{r.net.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color: savingRate >= 20 ? "#22c55e" : savingRate >= 0 ? "#f59e0b" : "#ef4444" }}>
                          {savingRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Category drill-down on click */}
          {selectedMonth && catByMonth[selectedMonth.month] && (
            <div style={{ marginTop:24, background:"var(--bg-secondary)", borderRadius:10, padding:"16px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ margin:0, fontSize:15, fontWeight:600 }}>Top expenses — {selectedMonth.label}</h3>
                <button className="btn-ghost" onClick={() => setSelectedMonth(null)}>✕</button>
              </div>
              {catByMonth[selectedMonth.month].map(c => (
                <div key={c.category} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                  <span>{c.category}</span>
                  <span style={{ fontWeight:500 }}>₹{c.total.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:8, marginBottom:0 }}>Click a bar to drill into categories</p>
            </div>
          )}
          {view === "bar" && !selectedMonth && (
            <p style={{ fontSize:12, color:"var(--text-muted)", textAlign:"center", marginTop:12 }}>Click a bar to see category breakdown</p>
          )}
        </>
      )}
    </div>
  );
}
