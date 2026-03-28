"use client";
import { useState, useEffect } from "react";
import Cookies from "universal-cookie";
import Image from "next/image";
import Dashboard from "./dashboard";
import Transfers from "./transfers";
import Categories from "./categories";
import { useRouter } from "next/navigation";
import Setting from "./setting";

const cookies = new Cookies();

// Nav icon SVGs
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  transfers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/>
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

const navItems = [
  { key: "component1", icon: "/dashboards.png", label: "Dashboard",  svgIcon: Icons.dashboard  },
  { key: "component2", icon: "/data-transfer.png", label: "Transfers", svgIcon: Icons.transfers },
  { key: "component3", icon: "/menu.png",       label: "Categories", svgIcon: Icons.categories },
  { key: "component4", icon: "/setting.png",    label: "Settings",   svgIcon: Icons.settings   },
];

function toDateStr(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d)) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch { return ""; }
}

export default function Board() {
  const router = useRouter();
  const [activeComponent, setActiveComponent] = useState("component1");
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transtables, setTranstable] = useState([]);
  const [category, setCategory] = useState([]);
  const [catamount, setCatamount] = useState([]);
  const [creditdebit, setCreditdebit] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Date range lifted here so it survives tab switches
  // EndDate defaults to far future so future-dated transactions are never excluded.
  // "Today" as a default silently drops any transaction dated after today.
  const [startDate, setStartDate] = useState("2000-01-01");
  const [endDate, setEndDate] = useState("2099-12-31");

  useEffect(() => {
    const token = cookies.get("token");
    if (!token) { router.push("/"); return; }
    const endpoints = [
      { url: "/api/get",          setState: setItems        },
      { url: "/api/transactions", setState: setTransactions },
      { url: "/api/category",     setState: setCategory     },
      { url: "/api/cattotal",     setState: setCatamount    },
      { url: "/api/creditdebit",  setState: setCreditdebit  },
      { url: "/api/transtable",   setState: setTranstable   },
    ];
    endpoints.forEach(({ url, setState }) => {
      fetch(url, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setState).catch(console.error);
    });
  }, []);

  // Close sidebar when nav item selected on mobile
  const handleNav = (key) => {
    setActiveComponent(key);
    setSidebarOpen(false);
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case "component1":
        return <Dashboard trans={transactions} cate={category} catamount={catamount} user={items}
          creditdebit={creditdebit} transtables={transtables} setActiveComponent={setActiveComponent}
          setTranstable={setTranstable} setCatamount={setCatamount} setCreditdebit={setCreditdebit}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate} />;
      case "component2":
        return <Transfers trans={transactions} cate={category} settrans={setTransactions}
          setcreditdebit={setCreditdebit} setTranstable={setTranstable} setCatamount={setCatamount} />;
      case "component3":
        return <Categories cate={category} setCategory={setCategory}
          setCatamount={setCatamount} setTransactions={setTransactions} />;
      case "component4":
        return <Setting user={items} setUser={setItems} />;
      default:
        return null;
    }
  };

  return (
    <div className="wrapper">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`types ${sidebarOpen ? "open" : ""}`}>
        <div className="heading">
          <Image alt="logo" src="/logo.png" height={32} width={32} />
          <h1 className="headname">MoneyPot</h1>
        </div>
        <div className="sidebar-divider" />
        <div className="spacemaker">
          {navItems.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`button ${activeComponent === key ? "active" : ""}`}
              onClick={() => handleNav(key)}
            >
              <Image
                alt={label} src={icon} height={16} width={16}
                style={{ opacity: activeComponent === key ? 1 : 0.5 }}
              />
              <p>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content — includes mobile top bar */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        {/* Mobile top bar */}
        <div style={{
          display:"none", alignItems:"center", justifyContent:"space-between",
          padding:"12px 16px", borderBottom:"1px solid var(--border)",
          flexShrink:0, background:"var(--bg-primary)",
        }} className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Image alt="logo" src="/logo.png" height={24} width={24} />
            <span style={{ fontWeight:600, fontSize:15 }}>MoneyPot</span>
          </div>
          <div style={{ width:36 }} />
        </div>

        {/* Page */}
        <div style={{ flex:1, overflow:"auto", minHeight:0, display:"flex", flexDirection:"column" }}>
          {renderComponent()}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {navItems.map(({ key, label, svgIcon }) => (
          <button
            key={key}
            className={`mobile-nav-item ${activeComponent === key ? "active" : ""}`}
            onClick={() => handleNav(key)}
          >
            {svgIcon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}