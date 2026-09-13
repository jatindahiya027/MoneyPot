"use client";
import { getToken } from "@/libs/clientToken";
import { useState } from "react";
import { ModalSurface } from "@/components/ui/modal-surface";
import {
  Baby, BookOpen, Briefcase, Bus, Car, Check, CircleDollarSign, Coffee,
  CreditCard, Dog, Dumbbell, ExternalLink, Film, Fuel, Gamepad2,
  Gift, GraduationCap, HandHeart, HeartPulse, House, IndianRupee,
  Landmark, PiggyBank, Plane, Plus, Receipt, Shirt, ShoppingBag,
  Sparkles, Stethoscope, TrendingUp, User, Users, Utensils, Wallet,
  Wifi, X, Zap
} from "lucide-react";

const ICONS = {
  Baby, BookOpen, Briefcase, Bus, Car, CircleDollarSign, Coffee, CreditCard,
  Dog, Dumbbell, ExternalLink, Film, Fuel, Gamepad2, Gift, GraduationCap,
  HandHeart, HeartPulse, House, IndianRupee, Landmark, PiggyBank, Plane,
  Receipt, Shirt, ShoppingBag, Sparkles, Stethoscope, TrendingUp, User,
  Users, Utensils, Wallet, Wifi, Zap,
};

const ICON_OPTIONS = [
  { key: "House", label: "Home" },
  { key: "Shirt", label: "Apparel" },
  { key: "Utensils", label: "Food" },
  { key: "ShoppingBag", label: "Shopping" },
  { key: "Zap", label: "Utilities" },
  { key: "HeartPulse", label: "Health" },
  { key: "HandHeart", label: "Care" },
  { key: "Film", label: "Entertainment" },
  { key: "Bus", label: "Transport" },
  { key: "IndianRupee", label: "Salary" },
  { key: "Users", label: "Friends" },
  { key: "ExternalLink", label: "External" },
  { key: "User", label: "Personal" },
  { key: "TrendingUp", label: "Invest" },
  { key: "CreditCard", label: "Card" },
  { key: "PiggyBank", label: "Savings" },
  { key: "Wallet", label: "Wallet" },
  { key: "Landmark", label: "Bank" },
  { key: "Receipt", label: "Bills" },
  { key: "Coffee", label: "Cafe" },
  { key: "Fuel", label: "Fuel" },
  { key: "Dumbbell", label: "Fitness" },
  { key: "GraduationCap", label: "Education" },
  { key: "Gift", label: "Gift" },
  { key: "Sparkles", label: "Other" },
];

const LEGACY_ICON_MAP = {
  rent: "House",
  apparel: "Shirt",
  food: "Utensils",
  shopping: "ShoppingBag",
  utilities: "Zap",
  "health care": "HeartPulse",
  "personal care": "HandHeart",
  entertainment: "Film",
  transportation: "Bus",
  miscellaneous: "Sparkles",
  self: "User",
  investments: "TrendingUp",
  "credit card": "CreditCard",
  friend: "Users",
  friends: "Users",
  salary: "IndianRupee",
  external: "ExternalLink",
  interest: "PiggyBank",
};

function getIconKey(category) {
  if (category?.imgpath?.startsWith("lucide:")) return category.imgpath.replace("lucide:", "");
  const nameKey = String(category?.name || "").trim().toLowerCase();
  if (LEGACY_ICON_MAP[nameKey]) return LEGACY_ICON_MAP[nameKey];
  const pathKey = String(category?.imgpath || "").split("/").pop()?.replace(/\.(png|jpg|jpeg|svg)$/i, "").replace(/[-_]/g, " ").toLowerCase();
  return LEGACY_ICON_MAP[pathKey] || "Sparkles";
}

function CategoryIcon({ category, iconKey, size = 30 }) {
  const Icon = ICONS[iconKey || getIconKey(category)] || Sparkles;
  const color = category?.fill || "currentColor";
  return <Icon size={size} strokeWidth={1.8} color={color} aria-hidden="true" />;
}

export default function Categories({ cate, setCategory, setCatamount, setTransactions }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("Sparkles");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getdata = () => {
    const token = getToken();
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
    const token = getToken();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.icon = selectedIcon;
    const res = await fetch("/api/entercategory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const { success } = await res.json();
    if (success) { getdata(); setSelectedIcon("Sparkles"); setShowForm(false); showToast("Category added"); }
    else showToast("Failed to add category", "error");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    const token = getToken();
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
  const investmentCats = cate.filter(c => c.type === "Investment");

  return (
    <div className="transdiv" style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title">Categories</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Category</button>
      </div>

      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>
        Expenses · {debitCats.length}
      </p>
      <div className="categories" style={{ marginBottom: 28 }}>
        {debitCats.map((item, i) => (
          <div key={i} className="categitems">
            <CategoryIcon category={item} />
            <button className="deletecat" aria-label={`Delete ${item.name}`} onClick={() => handleDelete(item.categoryid)}>
              <X size={10} strokeWidth={3} color="#f87171" aria-hidden="true" />
            </button>
            <p>{item.name}</p>
          </div>
        ))}
        <button type="button" className="categitems" style={{ borderStyle: "dashed", cursor: "pointer" }}
          onClick={() => setShowForm(true)} aria-label="Add expense category">
          <Plus size={20} strokeWidth={2} color="var(--text-muted)" aria-hidden="true" />
          <p style={{ color: "var(--text-muted)" }}>New</p>
        </button>
      </div>

      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>
        Income · {creditCats.length}
      </p>
      <div className="categories" style={{ marginBottom: 28 }}>
        {creditCats.map((item, i) => (
          <div key={i} className="categitems">
            <CategoryIcon category={item} />
            <button className="deletecat" aria-label={`Delete ${item.name}`} onClick={() => handleDelete(item.categoryid)}>
              <X size={10} strokeWidth={3} color="#f87171" aria-hidden="true" />
            </button>
            <p>{item.name}</p>
          </div>
        ))}
        <button type="button" className="categitems" style={{ borderStyle: "dashed", cursor: "pointer" }}
          onClick={() => setShowForm(true)} aria-label="Add income category">
          <Plus size={20} strokeWidth={2} color="var(--text-muted)" aria-hidden="true" />
          <p style={{ color: "var(--text-muted)" }}>New</p>
        </button>
      </div>

      <p className="category-section-label">Investments · {investmentCats.length}</p>
      <div className="categories">
        {investmentCats.map((item, i) => (
          <div key={i} className="categitems">
            <CategoryIcon category={item} />
            <button className="deletecat" aria-label={`Delete ${item.name}`} onClick={() => handleDelete(item.categoryid)}><X size={10} strokeWidth={3} color="#f87171" aria-hidden="true" /></button>
            <p>{item.name}</p>
          </div>
        ))}
        <button type="button" className="categitems" style={{ borderStyle: "dashed", cursor: "pointer" }} onClick={() => setShowForm(true)} aria-label="Add investment category"><Plus size={20} strokeWidth={2} color="var(--text-muted)" aria-hidden="true" /><p style={{ color: "var(--text-muted)" }}>New</p></button>
      </div>

      {/* Add Category Modal */}
      {showForm && (
        <ModalSurface onClose={() => setShowForm(false)} labelledBy="add-category-title">
            <div className="modal-header">
              <h2 className="modal-title" id="add-category-title">Add Category</h2>
              <button className="btn-ghost" aria-label="Close category form" onClick={() => setShowForm(false)}><X size={16} aria-hidden="true" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="category-type">Type</label>
                <select className="form-select" id="category-type" name="type">
                  <option value="Debit">Expense (Debit)</option>
                  <option value="Credit">Income (Credit)</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="category-name">Name</label>
                <input className="form-input" id="category-name" type="text" name="name" placeholder="e.g. Groceries" maxLength={50} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="category-color">Color</label>
                <input type="color" id="category-color" name="fill" defaultValue="#5a82e1"
                  style={{ width: 60, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", padding: 3 }} />
              </div>
              <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                <label className="form-label">Icon</label>
                <input type="hidden" name="icon" value={selectedIcon} />
                <div className="category-icon-picker">
                  {ICON_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`category-icon-option ${selectedIcon === key ? "active" : ""}`}
                      onClick={() => setSelectedIcon(key)}
                      title={label}
                    >
                      <CategoryIcon iconKey={key} size={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Category</button>
              </div>
            </form>
        </ModalSurface>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          <span>{toast.type === "success" ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span> {toast.msg}
        </div>
      )}
    </div>
  );
}
