"use client";
import { getToken, clearToken } from "@/libs/clientToken";
import { useState, useEffect, useCallback } from "react";
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}><span>{type === "success" ? "✓" : "✗"}</span>{message}</div>;
}

const FREQ_LABELS = { daily:"Daily", weekly:"Weekly", monthly:"Monthly", yearly:"Yearly" };

function nextDateAfter(dateStr, frequency) {
  const d = new Date(dateStr + "T00:00:00");
  switch (frequency) {
    case "daily":   d.setDate(d.getDate() + 1); break;
    case "weekly":  d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "yearly":  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

export default function Recurring({ categories }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(null); // recurid being "applied"
  const [form, setForm] = useState({
    name:"", type:"Debit", category:"", description:"", amount:"", frequency:"monthly",
    next_date: new Date().toISOString().split("T")[0],
  });

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch("/api/recurring", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = getToken();
    const res = await fetch("/api/recurring", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    if (data.success) { showToast("Recurring added"); setShowForm(false); load(); }
    else showToast(data.error || "Failed", "error");
  };

  const toggleActive = async (recurid, currentActive) => {
    const token = getToken();
    const res = await fetch("/api/recurring", {
      method:"PUT",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ recurid, active: !currentActive }),
    });
    const data = await res.json();
    if (data.success) { showToast(currentActive ? "Paused" : "Activated"); load(); }
    else showToast("Failed", "error");
  };

  const deleteItem = async (recurid, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const token = getToken();
    const res = await fetch("/api/recurring", {
      method:"DELETE",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ recurid }),
    });
    const data = await res.json();
    if (data.success) { showToast("Deleted"); load(); }
    else showToast("Failed", "error");
  };

  // "Apply now" — post as a real transaction then advance next_date
  const applyNow = async (item) => {
    setPosting(item.recurid);
    const token = getToken();
    try {
      // 1. Create transaction
      const today = new Date().toISOString().split("T")[0];
      const r1 = await fetch("/api/entertransaction", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          type: item.type, category: item.category,
          description: item.name + (item.description ? ` — ${item.description}` : ""),
          date: today, amount: item.amount,
        }),
      });
      if (!r1.ok) throw new Error("Transaction failed");

      // 2. Advance next_date
      const newNext = nextDateAfter(item.next_date, item.frequency);
      await fetch("/api/recurring", {
        method:"PUT",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ recurid: item.recurid, next_date: newNext }),
      });
      showToast(`₹${item.amount.toLocaleString("en-IN")} posted for ${item.name}`);
      load();
    } catch { showToast("Failed to apply", "error"); }
    setPosting(null);
  };

  const filteredCats = categories.filter(c => c.type === form.type).map(c => c.name);

  const upcomingThisWeek = items.filter(i => {
    if (!i.active) return false;
    const diff = (new Date(i.next_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  return (
    <div className="transdiv" style={{ padding:28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:600 }}>Recurring Transactions</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--text-muted)" }}>Manage your regular income and expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add recurring</button>
      </div>

      {/* Upcoming alert */}
      {upcomingThisWeek.length > 0 && (
        <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13 }}>
          <strong>⏰ Due this week:</strong>{" "}
          {upcomingThisWeek.map(i => `${i.name} (${i.next_date})`).join(" · ")}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="form-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="form-modal">
            <div className="modal-header">
              <span className="modal-title">New recurring transaction</span>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. Netflix, Rent" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value, category:"" }))}>
                    <option value="Debit">Debit (expense)</option>
                    <option value="Credit">Credit (income)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                    <option value="">— select —</option>
                    {filteredCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-select" value={form.frequency}
                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    {Object.entries(FREQ_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Next date</label>
                  <input className="form-input" type="date" value={form.next_date}
                    onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <input className="form-input" placeholder="Notes…" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add recurring</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ textAlign:"center", color:"var(--text-muted)", padding:40 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-muted)" }}>
          <p style={{ fontSize:16, marginBottom:8 }}>No recurring transactions yet</p>
          <p style={{ fontSize:13, marginBottom:20 }}>Add rent, subscriptions, or salary to track them automatically.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Add first recurring</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {items.map(item => {
            const isOverdue = new Date(item.next_date) < new Date();
            return (
              <div key={item.recurid} style={{
                background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:12,
                padding:"16px 20px", display:"flex", justifyContent:"space-between",
                alignItems:"center", flexWrap:"wrap", gap:12,
                opacity: item.active ? 1 : 0.55,
              }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:600, fontSize:15 }}>{item.name}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500,
                      background: item.type === "Credit" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: item.type === "Credit" ? "#22c55e" : "#ef4444" }}>
                      {item.type}
                    </span>
                    {!item.active && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"var(--bg-secondary)", color:"var(--text-muted)" }}>Paused</span>}
                  </div>
                  <div style={{ fontSize:13, color:"var(--text-muted)", display:"flex", gap:16, flexWrap:"wrap" }}>
                    <span>₹{item.amount.toLocaleString("en-IN")} · {FREQ_LABELS[item.frequency]}</span>
                    <span>Category: {item.category}</span>
                    <span style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)" }}>
                      Next: {item.next_date}{isOverdue ? " ⚠ overdue" : ""}
                    </span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  <button
                    className="btn-primary" style={{ fontSize:12, padding:"5px 12px" }}
                    disabled={posting === item.recurid}
                    onClick={() => applyNow(item)}
                    title="Post this as a transaction today"
                  >
                    {posting === item.recurid ? "Posting…" : "Apply now"}
                  </button>
                  <button className="btn-secondary" style={{ fontSize:12, padding:"5px 12px" }}
                    onClick={() => toggleActive(item.recurid, item.active)}>
                    {item.active ? "Pause" : "Resume"}
                  </button>
                  <button className="btn-ghost btn-danger-ghost" onClick={() => deleteItem(item.recurid, item.name)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
