"use client";
import Image from "next/image";
import { useState } from "react";
import Cookies from "universal-cookie";
const cookies = new Cookies();

export default function Categories({ cate, setCategory, setCatamount, setTransactions }) {
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getdata = () => {
    const token = cookies.get("token");
    if (!token) return;
    [
      { url: "/api/category", setState: setCategory },
      { url: "/api/cattotal", setState: setCatamount },
      { url: "/api/transactions", setState: setTransactions },
    ].forEach(({ url, setState }) => {
      fetch(url, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setState).catch(console.error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = cookies.get("token");
    const fd = new FormData(e.target);
    const res = await fetch("/api/entercategory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const { success } = await res.json();
    if (success) { getdata(); setShowForm(false); showToast("Category added"); }
    else showToast("Failed to add category", "error");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    const token = cookies.get("token");
    const res = await fetch("/api/deletecategory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    const { success } = await res.json();
    if (success) { getdata(); showToast("Category deleted"); }
    else showToast("Failed to delete", "error");
  };

  const debitCats = cate.filter(c => c.type === "Debit");
  const creditCats = cate.filter(c => c.type === "Credit");

  return (
    <div className="transdiv" style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title">Categories</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Category</button>
      </div>

      <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "#555", marginBottom: 12 }}>
        Expenses · {debitCats.length}
      </p>
      <div className="categories" style={{ marginBottom: 28 }}>
        {debitCats.map((item, i) => (
          <div key={i} className="categitems">
            <Image alt={item.name} src={item.imgpath} width={32} height={32} />
            <button className="deletecat" onClick={() => handleDelete(item.categoryid)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p>{item.name}</p>
          </div>
        ))}
        <div className="categitems" style={{ borderStyle: "dashed", cursor: "pointer" }}
          onClick={() => setShowForm(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <p style={{ color: "var(--text-muted)" }}>New</p>
        </div>
      </div>

      <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "#555", marginBottom: 12 }}>
        Income · {creditCats.length}
      </p>
      <div className="categories">
        {creditCats.map((item, i) => (
          <div key={i} className="categitems">
            <Image alt={item.name} src={item.imgpath} width={32} height={32} />
            <button className="deletecat" onClick={() => handleDelete(item.categoryid)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p>{item.name}</p>
          </div>
        ))}
        <div className="categitems" style={{ borderStyle: "dashed", cursor: "pointer" }}
          onClick={() => setShowForm(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <p style={{ color: "var(--text-muted)" }}>New</p>
        </div>
      </div>

      {/* Add Category Modal */}
      {showForm && (
        <div className="form-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="form-modal">
            <div className="modal-header">
              <span className="modal-title">Add Category</span>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Type</label>
                <select className="form-select" name="type">
                  <option value="Debit">Expense (Debit)</option>
                  <option value="Credit">Income (Credit)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Name</label>
                <input className="form-input" type="text" name="name" placeholder="e.g. Groceries" required />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <input type="color" name="fill" defaultValue="#5a82e1"
                  style={{ width: 60, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", padding: 3 }} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span> {toast.msg}
        </div>
      )}
    </div>
  );
}
