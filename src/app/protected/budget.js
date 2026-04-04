"use client";
import { getToken, clearToken } from "@/libs/clientToken";
import { useState, useEffect, useCallback } from "react";
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}><span>{type === "success" ? "✓" : "✗"}</span>{message}</div>;
}

function pctColor(pct) {
  if (pct >= 100) return "#ef4444";
  if (pct >= 80)  return "#f59e0b";
  return "#22c55e";
}

export default function BudgetPlanner({ categories }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [editMap, setEditMap] = useState({});     // { category: draftAmount }
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newAmt, setNewAmt] = useState("");

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`/api/budget?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setBudgets(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const saveBudget = async (category, amount) => {
    const token = getToken();
    if (!token || !amount || isNaN(parseFloat(amount))) return;
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, month, amount: parseFloat(amount) }),
    });
    const data = await res.json();
    if (data.success) { showToast("Budget saved"); load(); }
    else showToast("Failed to save", "error");
  };

  const deleteBudget = async (category) => {
    if (!confirm(`Remove budget for "${category}"?`)) return;
    const token = getToken();
    const res = await fetch("/api/budget", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, month }),
    });
    const data = await res.json();
    if (data.success) { showToast("Budget removed"); load(); }
    else showToast("Failed", "error");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCat || !newAmt) return;
    await saveBudget(newCat, newAmt);
    setNewCat(""); setNewAmt(""); setShowAddForm(false);
  };

  // Categories that don't have a budget yet
  const debitCats = categories.filter(c => c.type === "Debit").map(c => c.name);
  const budgetedCats = new Set(budgets.map(b => b.category));
  const unbudgetedCats = debitCats.filter(c => !budgetedCats.has(c));

  const totalBudget  = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent   = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudget   = budgets.filter(b => b.pct >= 100).length;

  return (
    <div className="transdiv" style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:600 }}>Budget Planner</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--text-muted)" }}>Set monthly spending limits per category</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="form-input"
            style={{ width:160 }}
          />
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Add budget</button>
        </div>
      </div>

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
          {[
            { label:"Total budget", value:`₹${totalBudget.toLocaleString("en-IN")}`, color:"var(--text-primary)" },
            { label:"Total spent",  value:`₹${totalSpent.toLocaleString("en-IN")}`,  color: totalSpent > totalBudget ? "#ef4444" : "var(--text-primary)" },
            { label:"Remaining",    value:`₹${(totalBudget - totalSpent).toLocaleString("en-IN")}`, color: totalBudget - totalSpent < 0 ? "#ef4444" : "#22c55e" },
            { label:"Over budget",  value:`${overBudget} categor${overBudget === 1 ? "y" : "ies"}`, color: overBudget > 0 ? "#ef4444" : "#22c55e" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background:"var(--bg-secondary)", borderRadius:10, padding:"14px 16px" }}>
              <p style={{ margin:"0 0 4px", fontSize:12, color:"var(--text-muted)" }}>{label}</p>
              <p style={{ margin:0, fontSize:20, fontWeight:600, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="form-overlay" onClick={e => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="form-modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title">Add budget</span>
              <button className="btn-ghost" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={newCat} onChange={e => setNewCat(e.target.value)} required>
                  <option value="">— select category —</option>
                  {unbudgetedCats.map(c => <option key={c} value={c}>{c}</option>)}
                  {budgetedCats.size > 0 && (
                    <optgroup label="Already budgeted (will update)">
                      {[...budgetedCats].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Monthly limit (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={newAmt} onChange={e => setNewAmt(e.target.value)} required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget rows */}
      {loading ? (
        <p style={{ color:"var(--text-muted)", textAlign:"center", padding:40 }}>Loading…</p>
      ) : budgets.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-muted)" }}>
          <p style={{ fontSize:16, marginBottom:8 }}>No budgets set for {month}</p>
          <p style={{ fontSize:13, marginBottom:20 }}>Add a budget to start tracking your spending limits.</p>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>Add first budget</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {budgets.map(b => {
            const isEditing = editMap[b.category] !== undefined;
            const clampedPct = Math.min(b.pct, 100);
            const color = pctColor(b.pct);
            return (
              <div key={b.category} style={{ background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:12, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontWeight:600, fontSize:15 }}>{b.category}</span>
                    {b.pct >= 100 && <span style={{ fontSize:11, background:"rgba(239,68,68,0.1)", color:"#ef4444", padding:"2px 8px", borderRadius:20, fontWeight:500 }}>Over budget</span>}
                    {b.pct >= 80 && b.pct < 100 && <span style={{ fontSize:11, background:"rgba(245,158,11,0.1)", color:"#f59e0b", padding:"2px 8px", borderRadius:20, fontWeight:500 }}>Near limit</span>}
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {isEditing ? (
                      <>
                        <input
                          type="number" min="0" step="0.01"
                          value={editMap[b.category]}
                          onChange={e => setEditMap(m => ({ ...m, [b.category]: e.target.value }))}
                          className="form-input" style={{ width:110, height:32, fontSize:13 }}
                        />
                        <button className="btn-primary" style={{ fontSize:12, padding:"4px 12px" }}
                          onClick={async () => { await saveBudget(b.category, editMap[b.category]); setEditMap(m => { const n={...m}; delete n[b.category]; return n; }); }}>
                          Save
                        </button>
                        <button className="btn-secondary" style={{ fontSize:12, padding:"4px 12px" }}
                          onClick={() => setEditMap(m => { const n={...m}; delete n[b.category]; return n; })}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary" style={{ fontSize:12, padding:"4px 12px" }}
                          onClick={() => setEditMap(m => ({ ...m, [b.category]: b.budget }))}>
                          Edit
                        </button>
                        <button className="btn-ghost btn-danger-ghost" style={{ fontSize:12 }}
                          onClick={() => deleteBudget(b.category)}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background:"var(--bg-secondary)", borderRadius:6, height:8, marginBottom:8, overflow:"hidden" }}>
                  <div style={{ width:`${clampedPct}%`, background:color, height:"100%", borderRadius:6, transition:"width 0.4s ease" }} />
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-muted)" }}>
                  <span>Spent: <strong style={{ color:"var(--text-primary)" }}>₹{b.spent.toLocaleString("en-IN")}</strong></span>
                  <span style={{ color }}>{b.pct}%</span>
                  <span>Budget: <strong style={{ color:"var(--text-primary)" }}>₹{b.budget.toLocaleString("en-IN")}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
