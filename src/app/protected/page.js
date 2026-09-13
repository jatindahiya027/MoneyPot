"use client";
import { clearToken, getToken } from "@/libs/clientToken";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { BarChart3, Calculator, Grid3X3, LayoutDashboard, Menu, Settings, TrendingUp, WalletCards } from "lucide-react";
import Dashboard from "./dashboard";
import { useRouter } from "next/navigation";
import { AnimatePresence, Motion } from "@/components/ui/motion";
import { PinLock, PinSetupDialog } from "@/components/pin-lock";

const sectionLoading = () => <div className="section-loading" role="status">Loading section…</div>;
const Transfers = dynamic(() => import("./transfers"), { loading: sectionLoading });
const Categories = dynamic(() => import("./categories"), { loading: sectionLoading });
const Setting = dynamic(() => import("./setting"), { loading: sectionLoading });
const BudgetPlanner = dynamic(() => import("./budget"), { loading: sectionLoading });
const Analysis = dynamic(() => import("./analysis"), { loading: sectionLoading });
const MonthTrend = dynamic(() => import("./monthtrend"), { loading: sectionLoading });

const navItems = [
  { key: "component1", label: "Dashboard",  Icon: LayoutDashboard },
  { key: "component2", label: "Transfers",  Icon: WalletCards },
  { key: "component3", label: "Categories", Icon: Grid3X3 },
  { key: "component5", label: "Budget",     Icon: Calculator },
  { key: "component6", label: "Analysis",   Icon: BarChart3 },
  { key: "component7", label: "Trends",     Icon: TrendingUp },
  { key: "component4", label: "Settings",   Icon: Settings },
];

const defaultPreferences = {
  default_bank: "",
  banks: "[]",
  ollama_url: "http://127.0.0.1:11434",
  ollama_model: "llama3.2",
};

export default function Board() {
  const router = useRouter();
  const [activeComponent, setActiveComponent] = useState("component1");
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transtables, setTranstable] = useState([]);
  const [category, setCategory] = useState([]);
  const [catamount, setCatamount] = useState([]);
  const [creditdebit, setCreditdebit] = useState([]);
  const [banktrend, setBanktrend] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [sessionToken, setSessionToken] = useState("");
  const [security, setSecurity] = useState(null);
  const [lockState, setLockState] = useState("checking");
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [pinSetupBusy, setPinSetupBusy] = useState(false);
  const [pinSetupError, setPinSetupError] = useState("");

  // ── Date range lifted here so it survives tab switches
  // EndDate defaults to far future so future-dated transactions are never excluded.
  // "Today" as a default silently drops any transaction dated after today.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("2099-12-31");

  useEffect(() => {
    let cancelled = false;
    const resolveSessionAndLock = async () => {
      let token = getToken();
      if (!token) {
        const session = await fetch("/api/session", { credentials: "include" });
        if (!session.ok) { router.replace("/"); return; }
        token = "cookie";
      }
      const securityResponse = await fetch("/api/pin/preferences", { headers: { Authorization: `Bearer ${token}` } });
      if (!securityResponse.ok) throw new Error("Unable to load security preferences");
      const securityData = await securityResponse.json();
      if (cancelled) return;
      const savedSecurity = securityData.security;
      const recentAuthentication = sessionStorage.getItem("moneypot_recent_auth") === "1";
      if (recentAuthentication) sessionStorage.removeItem("moneypot_recent_auth");
      setSessionToken(token);
      setSecurity(savedSecurity);
      setLockState(savedSecurity?.pin_enabled && !recentAuthentication ? "locked" : "unlocked");
    };
    resolveSessionAndLock().catch(error => {
      console.error(error);
      if (!cancelled) router.replace("/");
    });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!sessionToken || lockState !== "unlocked" || workspaceReady) return;
    let cancelled = false;
    const loadWorkspace = async () => {
      const token = sessionToken;
      const response = await fetch("/api/bootstrap", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to load workspace");
      const data = await response.json();
      if (cancelled) return;
      setItems(data.user || []);
      setTransactions(data.transactions || []);
      setCategory(data.categories || []);
      setCatamount(data.catamount || []);
      setCreditdebit(data.creditdebit || []);
      setBanktrend(data.banktrend || []);
      setTranstable(data.transtables || []);
      setPreferences(data.preferences || defaultPreferences);
      const earliestDate = (data.transactions || []).reduce((earliest, row) => {
        const date = String(row.date || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return earliest;
        return !earliest || date < earliest ? date : earliest;
      }, "");
      setStartDate(current => current || earliestDate);
      localStorage.setItem("moneypot_banks", data.preferences?.banks || "[]");
      localStorage.setItem("moneypot_default_bank", data.preferences?.default_bank || "");
      localStorage.setItem("ollama_url", data.preferences?.ollama_url || defaultPreferences.ollama_url);
      localStorage.setItem("ollama_model", data.preferences?.ollama_model || defaultPreferences.ollama_model);
      setWorkspaceReady(true);
    };
    loadWorkspace().catch(error => { console.error(error); router.replace("/"); });
    return () => { cancelled = true; };
  }, [lockState, router, sessionToken, workspaceReady]);

  const savePinPreference = useCallback(async (action, payload = {}) => {
    const response = await fetch("/api/pin/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || "Could not save PIN settings.");
    setSecurity(data.security);
    return data.security;
  }, [sessionToken]);

  const setQuickUnlockPin = useCallback(async (pin) => {
    return savePinPreference("set", { pin });
  }, [savePinPreference]);

  const disableQuickUnlockPin = useCallback(async () => {
    return savePinPreference("disable");
  }, [savePinPreference]);

  const handleUnlock = async (pin) => {
    setLockBusy(true);
    setLockError("");
    try {
      const response = await fetch("/api/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: security.userid, pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "PIN unlock failed.");
      setSessionToken("cookie");
      setLockState("unlocked");
    } catch (error) {
      setLockError(error?.message || "PIN unlock failed.");
    } finally {
      setLockBusy(false);
    }
  };

  const handlePasswordFallback = async () => {
    clearToken();
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/?mode=password");
  };

  const handlePinSetup = async (pin) => {
    setPinSetupBusy(true);
    setPinSetupError("");
    try {
      await setQuickUnlockPin(pin);
    } catch (error) {
      setPinSetupError(error?.message || "Could not save the PIN.");
    } finally {
      setPinSetupBusy(false);
    }
  };

  const dismissPinSetup = async () => {
    setPinSetupBusy(true);
    setPinSetupError("");
    try {
      await savePinPreference("dismiss");
    } catch (error) {
      setPinSetupError(error?.message || "Could not save this preference.");
    } finally {
      setPinSetupBusy(false);
    }
  };

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
          endDate={endDate} setEndDate={setEndDate}
          banktrend={banktrend} setBanktrend={setBanktrend} preferences={preferences} />
      case "component2":
        return <Transfers trans={transactions} cate={category} preferences={preferences} settrans={setTransactions}
          setcreditdebit={setCreditdebit} setTranstable={setTranstable} setCatamount={setCatamount} />;
      case "component3":
        return <Categories cate={category} setCategory={setCategory}
          setCatamount={setCatamount} setTransactions={setTransactions} />;
      case "component4":
        return <Setting user={items} setUser={setItems} preferences={preferences} setPreferences={setPreferences}
          security={security} onSetPin={setQuickUnlockPin} onDisablePin={disableQuickUnlockPin} />;
      case "component5":
        return <BudgetPlanner categories={category} />;
      case "component6":
        return <Analysis />;
      case "component7":
        return <MonthTrend />;
      default:
        return null;
    }
  };

  if (lockState === "locked") {
    return <PinLock profile={security} busy={lockBusy} error={lockError}
      onUnlock={handleUnlock} onPassword={handlePasswordFallback} />;
  }

  if (lockState === "checking" || !workspaceReady) {
    return (
      <main className="pin-screen pin-loading" aria-live="polite">
        <Image alt="" src="/logo-pot-only.png" width={44} height={44} priority />
        <p>Preparing MoneyPot…</p>
      </main>
    );
  }

  const showPinSetup = Boolean(security && !security.pin_prompted);

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
          <Image alt="logo" src="/logo-pot-only.png" height={32} width={32} />
          <h1 className="headname">MoneyPot</h1>
        </div>
        <div className="sidebar-divider" />
        <div className="spacemaker">
          {navItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`button ${activeComponent === key ? "active" : ""}`}
              onClick={() => handleNav(key)}
              aria-current={activeComponent === key ? "page" : undefined}
            >
              <Icon size={16} strokeWidth={2} style={{ opacity: activeComponent === key ? 1 : 0.5 }} aria-hidden="true" />
              <p>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content — includes mobile top bar */}
      <div className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <Menu size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <div className="mobile-brand">
            <Image alt="logo" src="/logo-pot-only.png" height={24} width={24} />
            <span>MoneyPot</span>
          </div>
          <div className="mobile-topbar-spacer" />
        </div>

        {/* Page */}
        <main className="app-content">
          <AnimatePresence mode="wait" initial={false}>
            <Motion key={activeComponent}>{renderComponent()}</Motion>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`mobile-nav-item ${activeComponent === key ? "active" : ""}`}
            onClick={() => handleNav(key)}
            aria-current={activeComponent === key ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <PinSetupDialog open={showPinSetup} busy={pinSetupBusy} error={pinSetupError}
        onSave={handlePinSetup} onDismiss={dismissPinSetup} />
    </div>
  );
}
