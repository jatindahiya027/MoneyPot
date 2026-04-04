"use client";
import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/libs/clientToken";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}><span>{type === "success" ? "✓" : "✗"}</span>{message}</div>;
}

function fmt(v) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

function scoreColor(s) {
  if (s >= 75) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(s) {
  if (s >= 80) return "Excellent";
  if (s >= 65) return "Good";
  if (s >= 50) return "Fair";
  if (s >= 35) return "Needs work";
  return "Critical";
}

// ── Financial Health Score Ring ──────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x="70" y="63" textAnchor="middle" fontSize="28" fontWeight="600" fill={color}>{score}</text>
      <text x="70" y="82" textAnchor="middle" fontSize="12" fill="var(--text-muted)">{scoreLabel(score)}</text>
    </svg>
  );
}

// ── 50/30/20 bar ─────────────────────────────────────────────────────────────
function BucketBar({ label, pct, target, amount, color }) {
  const over = pct > target;
  const barColor = label === "Savings" ? (pct >= target ? "#22c55e" : "#ef4444") : (over ? "#ef4444" : "#22c55e");
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>
          <span style={{ color: barColor, fontWeight: 600 }}>{pct}%</span>
          <span style={{ marginLeft: 6, fontSize: 12 }}>target {target}% · {fmt(amount)}</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, background: "var(--bg-secondary)", borderRadius: 5, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, background: barColor, height: "100%", borderRadius: 5, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ width: 28, height: 20, borderRadius: 4, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: barColor }}>{over ? "↑" : "✓"}</span>
        </div>
      </div>
      {label !== "Savings" && over && (
        <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 3 }}>
          {pct - target}% over target — consider reducing {label.toLowerCase()} spending
        </p>
      )}
      {label === "Savings" && pct < target && (
        <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 3 }}>
          {target - pct}% below target — try to save ₹{Math.round(((target - pct) / 100) * amount / (pct / 100 || 1)).toLocaleString("en-IN")} more
        </p>
      )}
    </div>
  );
}

export default function Analysis() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("score");
  const [toast, setToast]     = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", deadline: "", color: "#22c55e" });
  const [editGoal, setEditGoal] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch("/api/analysis", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createGoal = async (e) => {
    e.preventDefault();
    const token = getToken();
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...goalForm, target_amount: parseFloat(goalForm.target_amount) }),
    });
    const d = await res.json();
    if (d.success) { showToast("Goal created"); setShowGoalForm(false); setGoalForm({ name: "", target_amount: "", deadline: "", color: "#22c55e" }); load(); }
    else showToast(d.error || "Failed", "error");
  };

  const addToGoal = async (goalid, addAmt) => {
    const token = getToken();
    const goal = data.goals.find(g => g.goalid === goalid);
    if (!goal) return;
    const newSaved = Math.min(parseFloat(goal.saved_amount) + parseFloat(addAmt), goal.target_amount);
    const res = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ goalid, saved_amount: newSaved }),
    });
    const d = await res.json();
    if (d.success) { showToast(`₹${addAmt} added`); load(); }
    else showToast("Failed", "error");
  };

  const deleteGoal = async (goalid, name) => {
    if (!confirm(`Delete goal "${name}"?`)) return;
    const token = getToken();
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ goalid }),
    });
    showToast("Goal deleted"); load();
  };

  const tabStyle = (active) => ({
    fontSize: 13, padding: "6px 14px", borderRadius: 6,
    border: "1px solid var(--border)", cursor: "pointer",
    background: active ? "var(--bg-secondary)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
  });

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading analysis…</div>;
  if (!data)   return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>No data available yet. Add some transactions first.</div>;

  const { healthScore, anomalies, analysis503020, goals } = data;
  const radarData = healthScore ? Object.values(healthScore.components).map(c => ({ subject: c.label.split(" ")[0], score: c.score, full: 20 })) : [];

  return (
    <div className="transdiv" style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Financial Health & Analysis</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Deep insights computed entirely from your local transaction data</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {[["score","Health score"],["anomalies","Anomaly alerts"],["rule503020","50/30/20 rule"],["goals","Savings goals"]].map(([v, l]) => (
          <button key={v} style={tabStyle(tab === v)} onClick={() => setTab(v)}>{l}
            {v === "anomalies" && anomalies.length > 0 && (
              <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px" }}>{anomalies.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Health Score ─────────────────────────────────────────────────── */}
      {tab === "score" && healthScore && (
        <div>
          <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
            <ScoreRing score={healthScore.total} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Computed from 5 signals using only your local transaction and budget data.</p>
              {Object.values(healthScore.components).map(c => (
                <div key={c.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "var(--text-muted)" }}>{c.label}</span>
                    <span style={{ color: scoreColor(c.score * 5), fontWeight: 500 }}>{c.score}/20 · {c.value}</span>
                  </div>
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(c.score / 20) * 100}%`, background: scoreColor(c.score * 5), height: "100%", borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Radar chart — shadcn ChartContainer */}
            {radarData.length > 0 && (() => {
              const radarConfig = { score: { label: "Score", color: scoreColor(healthScore.total) } };
              return (
                <ChartContainer config={radarConfig} style={{ width: 200, height: 180, flexShrink: 0 }}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    />
                    <Radar
                      dataKey="score"
                      stroke={scoreColor(healthScore.total)}
                      fill={scoreColor(healthScore.total)}
                      fillOpacity={0.25}
                      dot={{ r: 3, fill: scoreColor(healthScore.total) }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0];
                        return (
                          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                            <p style={{ fontWeight:600, marginBottom:4 }}>{p.payload.subject}</p>
                            <p style={{ color: scoreColor(p.value * 5) }}>Score: {p.value}/20</p>
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ChartContainer>
              );
            })()}
          </div>

          {/* Score advice */}
          <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "14px 18px", fontSize: 13 }}>
            <p style={{ fontWeight: 500, marginBottom: 6 }}>How to improve your score</p>
            <div style={{ color: "var(--text-muted)", lineHeight: 1.8 }}>
              {healthScore.components.savingsRate.score < 15 && <p>• Savings rate is low. Aim to save at least 20% of your income each month.</p>}
              {healthScore.components.budgetAdh.score < 12 && <p>• Several categories are over budget. Review the Budget tab to find which ones.</p>}
              {healthScore.components.spendTrend.score < 12 && <p>• Your expenses are trending upward. Check the Trends tab to identify the driver.</p>}
              {healthScore.components.incomeStability.score < 12 && <p>• Income varies significantly month to month. Building a buffer fund helps smooth this.</p>}
              {healthScore.components.expConsistency.score < 12 && <p>• Spending is irregular. Try setting budgets for your top 3 categories.</p>}
              {healthScore.total >= 75 && <p>Your finances are in good shape. Keep maintaining your current habits.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Anomaly Detection ────────────────────────────────────────────── */}
      {tab === "anomalies" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Categories where this month's spending is significantly above your 3-month trailing average.
          </p>
          {anomalies.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
              <p style={{ fontSize: 16, marginBottom: 6 }}>No anomalies detected</p>
              <p style={{ fontSize: 13 }}>All categories are within 1.5× of their normal range.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {anomalies.map(a => (
                <div key={a.category} style={{
                  background: "var(--bg-primary)", border: `1px solid ${a.severity === "high" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                  borderRadius: 12, padding: "14px 18px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{a.category}</span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
                        background: a.severity === "high" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                        color: a.severity === "high" ? "#ef4444" : "#f59e0b",
                      }}>
                        {a.multiplier}× normal
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>avg {fmt(a.avg)} → this month {fmt(a.spent)}</span>
                  </div>
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 5, height: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min((a.spent / (a.avg * 2.5)) * 100, 100)}%`,
                      background: a.severity === "high" ? "#ef4444" : "#f59e0b",
                      height: "100%", borderRadius: 5
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    {a.severity === "high"
                      ? `Significantly above normal. Check the Transfers tab for large ${a.category.toLowerCase()} transactions this month.`
                      : `Moderately elevated. Worth reviewing if this is expected.`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 50/30/20 Rule ────────────────────────────────────────────────── */}
      {tab === "rule503020" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            The 50/30/20 rule: 50% of income on Needs, 30% on Wants, 20% saved. Based on this month's transactions.
          </p>
          {analysis503020.income === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
              <p>No income recorded this month. Add a Credit transaction to see the analysis.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Monthly income", value: fmt(analysis503020.income), color: "#22c55e" },
                  { label: "Needs", value: `${analysis503020.needs.pct}%`, color: analysis503020.needs.pct > 50 ? "#ef4444" : "#22c55e" },
                  { label: "Wants", value: `${analysis503020.wants.pct}%`, color: analysis503020.wants.pct > 30 ? "#ef4444" : "#22c55e" },
                  { label: "Savings", value: `${analysis503020.savings.pct}%`, color: analysis503020.savings.pct >= 20 ? "#22c55e" : "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 600, color }}>{value}</p>
                  </div>
                ))}
              </div>

              <BucketBar label="Needs"   pct={analysis503020.needs.pct}   target={50} amount={analysis503020.needs.amount}   />
              <BucketBar label="Wants"   pct={analysis503020.wants.pct}   target={30} amount={analysis503020.wants.amount}   />
              <BucketBar label="Savings" pct={analysis503020.savings.pct} target={20} amount={analysis503020.savings.amount} />

              <div style={{ marginTop: 20, background: "var(--bg-secondary)", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
                <p style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Category classification</p>
                <p><strong style={{ color: "var(--text-primary)" }}>Needs</strong> — Rent, Food, Utilities, Health Care, Transportation, Personal Care</p>
                <p><strong style={{ color: "var(--text-primary)" }}>Savings</strong> — income not spent (total income minus all expenses this month)</p>
                <p><strong style={{ color: "var(--text-primary)" }}>Wants</strong> — everything else (Entertainment, Shopping, Miscellaneous, etc.)</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Savings Goals ────────────────────────────────────────────────── */}
      {tab === "goals" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Track progress toward specific financial targets.</p>
            <button className="btn-primary" onClick={() => setShowGoalForm(true)}>+ Add goal</button>
          </div>

          {/* Add goal form */}
          {showGoalForm && (
            <div className="form-overlay" onClick={e => e.target === e.currentTarget && setShowGoalForm(false)}>
              <div className="form-modal" style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <span className="modal-title">New savings goal</span>
                  <button className="btn-ghost" onClick={() => setShowGoalForm(false)}>✕</button>
                </div>
                <form onSubmit={createGoal}>
                  <div className="form-group">
                    <label className="form-label">Goal name</label>
                    <input className="form-input" placeholder="e.g. Emergency fund, Laptop, Vacation"
                      value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Target amount (₹)</label>
                      <input className="form-input" type="number" min="1" step="0.01" placeholder="0.00"
                        value={goalForm.target_amount} onChange={e => setGoalForm(f => ({ ...f, target_amount: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deadline (optional)</label>
                      <input className="form-input" type="date" value={goalForm.deadline}
                        onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Colour</label>
                    <input type="color" value={goalForm.color}
                      onChange={e => setGoalForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 48, height: 34, border: "none", cursor: "pointer", borderRadius: 6, background: "none" }} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowGoalForm(false)}>Cancel</button>
                    <button type="submit" className="btn-primary">Create goal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>No savings goals yet</p>
              <p style={{ fontSize: 13, marginBottom: 20 }}>Create goals for things like an emergency fund, a laptop, or a vacation.</p>
              <button className="btn-primary" onClick={() => setShowGoalForm(true)}>Add first goal</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {goals.map(g => {
                const pct = g.target_amount > 0 ? Math.min(Math.round((g.saved_amount / g.target_amount) * 100), 100) : 0;
                const remaining = Math.max(g.target_amount - g.saved_amount, 0);
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
                const monthsToGoal = g.saved_amount < g.target_amount ? "—" : "Done";
                return (
                  <div key={g.goalid} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</span>
                        {pct >= 100 && <span style={{ fontSize: 11, background: "rgba(34,197,94,0.1)", color: "#22c55e", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>Completed!</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <AddToGoal goalid={g.goalid} onAdd={addToGoal} />
                        <button className="btn-ghost btn-danger-ghost" style={{ fontSize: 12 }} onClick={() => deleteGoal(g.goalid, g.name)}>✕</button>
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-secondary)", borderRadius: 6, height: 10, marginBottom: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: g.color, height: "100%", borderRadius: 6, transition: "width 0.5s" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap", gap: 6 }}>
                      <span>Saved: <strong style={{ color: "var(--text-primary)" }}>{fmt(g.saved_amount)}</strong> of <strong style={{ color: "var(--text-primary)" }}>{fmt(g.target_amount)}</strong></span>
                      <span style={{ color: g.color, fontWeight: 500 }}>{pct}%</span>
                      {remaining > 0 && <span>Remaining: <strong style={{ color: "var(--text-primary)" }}>{fmt(remaining)}</strong></span>}
                      {daysLeft !== null && <span style={{ color: daysLeft < 30 ? "#f59e0b" : "var(--text-muted)" }}>
                        {daysLeft > 0 ? `${daysLeft} days left` : "Past deadline"}
                      </span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline add-amount button with mini input
function AddToGoal({ goalid, onAdd }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  if (!open) return (
    <button className="btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setOpen(true)}>+ Add</button>
  );
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input type="number" min="1" step="0.01" placeholder="₹ amount"
        value={amt} onChange={e => setAmt(e.target.value)}
        className="form-input" style={{ width: 100, height: 30, fontSize: 12 }} />
      <button className="btn-primary" style={{ fontSize: 12, padding: "4px 8px" }}
        onClick={() => { if (amt) { onAdd(goalid, amt); setOpen(false); setAmt(""); } }}>Save</button>
      <button className="btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => setOpen(false)}>✕</button>
    </div>
  );
}
