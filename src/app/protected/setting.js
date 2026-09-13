"use client";
import { clearToken, getToken } from "@/libs/clientToken";
import { memo, useState, useDeferredValue, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Building2, Camera, Check, Download, FileDown, KeyRound, Mail, Paperclip, Plus, ShieldCheck, Trash2, User, UserRound, X } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import { AnimatePresence, easeOut, motion, useReducedMotion } from "@/components/ui/motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PinSetupDialog } from "@/components/pin-lock";

const LS_URL   = "ollama_url";
const LS_MODEL = "ollama_model";

const Setting = memo(function Setting({
  user,
  setUser,
  preferences,
  setPreferences,
  security,
  onSetPin,
  onDisablePin,
}) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const deferredQuery = useDeferredValue(user[0]);
  const [name, setName] = useState(deferredQuery?.name || "");
  const [age,  setAge]  = useState(deferredQuery?.age  || "");
  const [mail, setMail] = useState(deferredQuery?.mail || "");
  const [image, setImage] = useState(deferredQuery?.image || "/profile.png");
  const [page, setPage] = useState("page0");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [banks, setBanks] = useState(() => { try { return JSON.parse(preferences?.banks || "[]"); } catch { return []; } });
  const [defaultBank, setDefaultBank] = useState(preferences?.default_bank || "");
  const [newBank, setNewBank] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const reduceMotion = useReducedMotion();

  // ── Ollama state
  const [ollamaUrl,   setOllamaUrl]   = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [ollamaSaving, setOllamaSaving] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | "checking" | { ok, models?, error? }
  const [availableModels, setAvailableModels] = useState([]);
  const [modelDetails, setModelDetails] = useState([]);
  const ollamaAutoChecked = useRef(false);

  // Account preferences are authoritative. Local storage is read only as a
  // compatibility fallback for installations that predate database persistence.
  useEffect(() => {
    const u = localStorage.getItem(LS_URL);
    const m = localStorage.getItem(LS_MODEL);
    setOllamaUrl(preferences?.ollama_url || u || "http://127.0.0.1:11434");
    setOllamaModel(preferences?.ollama_model || m || "llama3.2");
  }, [preferences?.ollama_model, preferences?.ollama_url]);

  const saveOllamaPrefs = async () => {
    setOllamaSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ollama_url: ollamaUrl, ollama_model: ollamaModel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Could not save Ollama settings");
      setPreferences?.(data.preferences);
      localStorage.setItem(LS_URL, data.preferences.ollama_url);
      localStorage.setItem(LS_MODEL, data.preferences.ollama_model);
      showToast("Ollama settings saved");
    } catch (error) {
      showToast(error?.message || "Could not save Ollama settings", "error");
    } finally {
      setOllamaSaving(false);
    }
  };

  const checkOllama = useCallback(async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch("/api/ollama-check", {
        headers: { "X-Ollama-Url": ollamaUrl, "X-Ollama-Model": ollamaModel },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ollama connection check failed");
      setOllamaStatus(data);
      setAvailableModels(data.ok && Array.isArray(data.models) ? data.models : []);
      setModelDetails(data.ok && Array.isArray(data.modelDetails) ? data.modelDetails : []);
    } catch (error) {
      setOllamaStatus({ ok: false, error: error?.message || "Request failed" });
    }
  }, [ollamaModel, ollamaUrl]);

  useEffect(() => {
    if (page === "page2" && !ollamaAutoChecked.current) {
      ollamaAutoChecked.current = true;
      checkOllama();
    }
  }, [checkOllama, page]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getdata = () => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    fetch("/api/get", { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setUser).catch(console.error);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024) {
      showToast("Choose a JPEG, PNG, GIF, or WebP image under 5 MB", "error");
      e.target.value = "";
      return;
    }
    setFile(f);
    // Show a local preview immediately so the user sees the new image before saving
    const localUrl = URL.createObjectURL(f);
    setImage(localUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.push("/"); return; }
    setSaving(true);
    let uploadedImage = "";
    try {
      let img = image;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.Message) throw new Error(result.error || "Image upload failed");
        img = result.Message;
        uploadedImage = img;
        setImage(img);
      }
      const res = await fetch("/api/edituser", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, age, mail, img }),
      });
      const result = await res.json().catch(() => ({}));
      const { success } = result;
      if (success) { getdata(); showToast("Profile updated"); }
      else throw new Error(result.user || result.error || "Failed to update profile");
    } catch (error) {
      if (uploadedImage) {
        await fetch(`/api/upload?file=${encodeURIComponent(uploadedImage)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      showToast(error?.message || "An error occurred", "error");
    }
    setSaving(false);
  };

  const downloadCSV = async () => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      showToast("Start date must be before end date", "error");
      return;
    }
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.set("startDate", exportStartDate);
      if (exportEndDate) params.set("endDate", exportEndDate);
      const query = params.toString();
      const response = await fetch(`/api/export${query ? `?${query}` : ""}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const rangeLabel = exportStartDate || exportEndDate ? `_${exportStartDate || "start"}_to_${exportEndDate || "end"}` : "";
      a.href = url; a.download = `transactions${rangeLabel}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      showToast("CSV downloaded");
    } catch { showToast("Download failed", "error"); }
  };

  const saveBankPreferences = async () => {
    const token = getToken();
    const res = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ banks, default_bank: defaultBank }) });
    const data = await res.json();
    if (!data.success) return showToast("Could not save bank preferences", "error");
    setPreferences?.(data.preferences);
    localStorage.setItem("moneypot_banks", data.preferences.banks);
    localStorage.setItem("moneypot_default_bank", data.preferences.default_bank);
    showToast("Bank preferences saved");
  };

  const savePin = async (pin) => {
    setSecurityBusy(true);
    setSecurityError("");
    try {
      await onSetPin?.(pin);
      setPinDialogOpen(false);
      showToast(security?.pin_enabled ? "PIN changed" : "PIN enabled");
    } catch (error) {
      setSecurityError(error?.message || "Could not save PIN");
    } finally {
      setSecurityBusy(false);
    }
  };

  const disablePin = async () => {
    setSecurityBusy(true);
    setSecurityError("");
    try {
      await onDisablePin?.();
      showToast("PIN disabled");
    } catch (error) {
      showToast(error?.message || "Could not disable PIN", "error");
    } finally {
      setSecurityBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Could not delete account.");
      clearToken();
      sessionStorage.clear();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeleteError(error?.message || "Could not delete account.");
      setDeleteBusy(false);
    }
  };

  const sideNavItems = [
    { key: "page0", Icon: User,      label: "Profile"  },
    { key: "page1", Icon: FileDown,  label: "Export"   },
    { key: "page2", Icon: BarChart3, label: "AI / Ollama" },
    { key: "page3", Icon: Building2, label: "Banks" },
    { key: "page4", Icon: ShieldCheck, label: "Security" },
    { key: "page5", Icon: Trash2, label: "Delete account" },
  ];

  // Status badge helper
  const StatusBadge = () => {
    if (!ollamaStatus) return null;
    if (ollamaStatus === "checking") return (
      <span style={{ fontSize:11, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:"#888", display:"inline-block" }} />
        Checking…
      </span>
    );
    if (ollamaStatus.ok) return (
      <span style={{ fontSize:11, color:"var(--success)", display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--success)", display:"inline-block" }} />
        Connected · {availableModels.length} model{availableModels.length !== 1 ? "s" : ""} found
      </span>
    );
    return (
      <span style={{ fontSize:11, color:"var(--danger)", display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--danger)", display:"inline-block" }} />
        {ollamaStatus.error || "Not reachable"}
      </span>
    );
  };

  return (
    <div className="transdiv settings-page">
      <header className="settings-title"><h1>Settings</h1><p>Manage your profile, data, local AI, and accounts.</p></header>

      <div className="settingdiv">
        {/* Left nav */}
        <div className="settigndivheading">
          {sideNavItems.map(({ key, Icon, label }) => (
            <button
              key={key}
              className={`button ${page === key ? "active" : ""}`}
              onClick={() => setPage(key)}
              aria-current={page === key ? "page" : undefined}
              style={{ marginBottom:4 }}
            >
              <Icon size={16} strokeWidth={2} style={{ opacity: page===key ? 1 : 0.5 }} aria-hidden="true" />
              <p>{label}</p>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="formsett">
          <motion.div key={page} className="settings-content"
            initial={reduceMotion ? { opacity:0 } : { opacity:0, x:12 }}
            animate={{ opacity:1, x:0 }}
            transition={{ duration:reduceMotion ? .1 : .24, ease:easeOut }}>

          {/* ── Profile tab ── */}
          {page === "page0" && (
            <form onSubmit={handleSubmit} className="formsettt settings-profile-form">
              <div className="settings-avatar">
                <Image
                  alt="Profile"
                  src={image && image.startsWith("blob:") ? image : image && image.startsWith("/uploads/") ? `/api/get-uploaded-file?file=${encodeURIComponent(image)}` : (image || "/profile.png")}
                  width={96} height={96}
                  style={{ borderRadius:"50%", objectFit:"cover", border:"2px solid var(--border)" }}
                />
                <label style={{
                  position:"absolute", bottom:0, right:0,
                  width:28, height:28, borderRadius:"50%",
                  background:"var(--accent)", border:"2px solid var(--bg-secondary)",
                  display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                }}>
                  <Camera size={12} strokeWidth={2.5} color="white" aria-hidden="true" />
                  <input type="file" aria-label="Choose profile image" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display:"none" }} onChange={handleFileChange} />
                </label>
              </div>
              {file && <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}><Paperclip size={12} aria-hidden="true" /> {file.name}</p>}

              {[
                { label:"Name",  key:"name", value:name, setter:setName, Icon:User,      type:"text"   },
                { label:"Age",   key:"age",  value:age,  setter:setAge,  Icon:UserRound, type:"number" },
                { label:"Email", key:"mail", value:mail, setter:setMail, Icon:Mail,      type:"email"  },
              ].map(({ label, key, value, setter, Icon, type }) => (
                <div key={key} className="settings-field">
                  <label htmlFor={`profile-${key}`} style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>{label}</label>
                  <div className="label" style={{ width:"100%", maxWidth:"100%" }}>
                    <Icon size={24} strokeWidth={1.8} style={{ opacity:0.6, flexShrink:0 }} aria-hidden="true" />
                    <input
                      id={`profile-${key}`}
                      type={type} name={key} value={value || ""}
                      min={key === "age" ? 13 : undefined}
                      max={key === "age" ? 120 : undefined}
                      maxLength={key === "name" ? 80 : undefined}
                      onChange={e => setter(e.target.value)}
                      style={{ flex:1, minWidth:0, padding:"10px 12px", fontSize:14 }}
                    />
                  </div>
                </div>
              ))}

              <button type="submit" className="loginbutton" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Update Profile"}
              </button>
            </form>
          )}

          {/* ── Export tab ── */}
          {page === "page1" && (
            <div className="settings-export">
              <div className="settings-surface export-surface">
                <BarChart3 size={32} style={{ marginBottom:12 }} aria-hidden="true" />
                <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Export to CSV</h3>
                <p style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.6, marginBottom:20 }}>
                  Download your transactions as a CSV file for use in Excel, Google Sheets, or any data analysis tool.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
                  <div>
                    <label className="form-label" htmlFor="export-start-date">Start date</label>
                    <DatePicker
                      id="export-start-date"
                      ariaLabel="Export start date"
                      className="form-input"
                      value={exportStartDate}
                      max={exportEndDate || undefined}
                      onChange={e => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="export-end-date">End date</label>
                    <DatePicker
                      id="export-end-date"
                      ariaLabel="Export end date"
                      className="form-input"
                      value={exportEndDate}
                      min={exportStartDate || undefined}
                      onChange={e => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {(exportStartDate || exportEndDate) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setExportStartDate(""); setExportEndDate(""); }}
                    style={{ width:"100%", justifyContent:"center", marginBottom:10 }}
                  >
                    Clear date range
                  </button>
                )}
                <button onClick={downloadCSV} className="btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
                  <Download size={16} strokeWidth={2} aria-hidden="true" />
                  Download CSV
                </button>
              </div>
              <p style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.6 }}>
                Leave dates empty to export all transactions. The export includes date, type, category, description, amount, and bank fields.
              </p>
            </div>
          )}

          {/* ── AI / Ollama tab ── */}
          {page === "page2" && (
            <div className="settings-ai">

              {/* Status card */}
              <div className="settings-surface ai-connection">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <p style={{ fontSize:13, fontWeight:600 }}>Ollama Connection</p>
                  <StatusBadge />
                </div>

                {/* URL input */}
                <label htmlFor="ollama-url" style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>Ollama URL</label>
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  <input
                    id="ollama-url"
                    type="text"
                    value={ollamaUrl}
                    onChange={e => { setOllamaUrl(e.target.value); setOllamaStatus(null); }}
                    placeholder="http://127.0.0.1:11434"
                    style={{
                      flex:1, background:"var(--bg-primary)", border:"1px solid var(--border)",
                      borderRadius:8, padding:"8px 12px", fontSize:13, color:"azure", outline:"none",
                    }}
                  />
                  <button
                    onClick={checkOllama}
                    disabled={ollamaStatus === "checking"}
                    style={{
                      padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600,
                      background:"var(--bg-secondary)", border:"1px solid var(--border)",
                      color:"azure", cursor:"pointer", whiteSpace:"nowrap",
                      opacity: ollamaStatus === "checking" ? 0.6 : 1,
                    }}
                  >
                    {ollamaStatus === "checking" ? "…" : "Find models"}
                  </button>
                </div>

                {/* Model selector */}
                <label htmlFor="ollama-model" style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>Model</label>
                {availableModels.length > 0 ? (
                  <select
                    id="ollama-model"
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    style={{
                      width:"100%", background:"var(--bg-primary)", border:"1px solid var(--border)",
                      borderRadius:8, padding:"8px 12px", fontSize:13, color:"azure",
                      outline:"none", cursor:"pointer", marginBottom:14,
                    }}
                  >
                    {!availableModels.includes(ollamaModel) && (
                      <option value={ollamaModel}>{ollamaModel} (saved)</option>
                    )}
                    {availableModels.map(model => {
                      const details = modelDetails.find(item => item.name === model);
                      const metadata = [details?.details?.parameter_size, details?.details?.quantization_level].filter(Boolean).join(" · ");
                      return <option key={model} value={model}>{model}{metadata ? ` — ${metadata}` : ""}{ollamaStatus?.recommended === model ? " (recommended)" : ""}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    id="ollama-model"
                    type="text"
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    placeholder="llama3.2"
                    style={{
                      width:"100%", background:"var(--bg-primary)", border:"1px solid var(--border)",
                      borderRadius:8, padding:"8px 12px", fontSize:13, color:"azure",
                      outline:"none", marginBottom:14, boxSizing:"border-box",
                    }}
                  />
                )}
                {availableModels.length === 0 && (
                  <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:14 }}>
                    MoneyPot checks Ollama automatically. Use <strong>Find models</strong> to refresh, or type a model name manually.
                  </p>
                )}

                {ollamaStatus?.ok && !ollamaStatus.preferredAvailable && ollamaStatus.selected && (
                  <p style={{ fontSize:11, color:"var(--accent-hover)", marginBottom:14 }}>
                    Your saved model is not installed. Recommended available model: <strong>{ollamaStatus.selected}</strong>. Select it above and save if you want to make it your default.
                  </p>
                )}

                <button onClick={saveOllamaPrefs} disabled={ollamaSaving} className="loginbutton" style={{ width:"100%" }}>
                  {ollamaSaving ? "Saving…" : "Save settings"}
                </button>
              </div>

              {/* Info card */}
              <div className="settings-help">
                <p style={{ fontSize:12, fontWeight:600, marginBottom:8, color:"azure" }}>ℹ️ How it works</p>
                <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.7, marginBottom:6 }}>
                  AI Insights sends the last <strong style={{ color:"azure" }}>3 months</strong> of transactions to the saved Ollama origin.
                  Installed models are discovered locally and ranked for text analysis. Settings can be saved while Ollama is stopped. If the saved model is unavailable at analysis time, MoneyPot uses the best available text model for that request without overwriting your preference.
                </p>
                <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.7 }}>
                  Install Ollama: <code style={{ background:"var(--bg-primary)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>ollama.com/download</code><br/>
                  Pull a model: <code style={{ background:"var(--bg-primary)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>ollama pull llama3.2</code>
                </p>
              </div>
            </div>
          )}
          {page === "page3" && (
            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Bank accounts</h2>
                <p>Add only the banks you use. Transaction forms will use this shorter list and preselect your default.</p>
              </div>
              <div className="bank-add-row">
                <label className="sr-only" htmlFor="new-bank">Bank or account name</label>
                <input id="new-bank" className="form-input" maxLength={80} value={newBank} onChange={e => setNewBank(e.target.value)} placeholder="Bank or account name" />
                <button className="btn-secondary" onClick={() => { const value = newBank.trim(); if (value && !banks.includes(value)) setBanks([...banks, value]); setNewBank(""); }}><Plus size={16} aria-hidden="true" /> Add bank</button>
              </div>
              <div className="bank-preference-list">
                <AnimatePresence initial={false}>
                {banks.length === 0 && <motion.div key="empty" className="empty-state compact" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>No banks saved yet. Add your primary account above.</motion.div>}
                {banks.map((bank, index) => (
                  <motion.div className="bank-preference-row" key={bank} layout
                    initial={reduceMotion ? {opacity:0} : {opacity:0,y:-7}}
                    animate={{opacity:1,y:0}} exit={reduceMotion ? {opacity:0} : {opacity:0,x:-12}}
                    transition={{duration:reduceMotion ? .1 : .2,delay:index*.025,ease:easeOut}}>
                    <label><input type="radio" name="defaultBank" checked={defaultBank === bank} onChange={() => setDefaultBank(bank)} /> <span><strong>{bank}</strong><small>{defaultBank === bank ? "Default for new transactions" : "Available in transaction forms"}</small></span></label>
                    <button className="btn-ghost btn-danger-ghost" aria-label={`Remove ${bank}`} onClick={() => { setBanks(banks.filter(b => b !== bank)); if (defaultBank === bank) setDefaultBank(""); }}><Trash2 size={15} aria-hidden="true" /></button>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
              <button className="btn-primary" onClick={saveBankPreferences}>Save bank preferences</button>
            </div>
          )}
          {page === "page4" && (
            <div className="settings-panel security-settings">
              <div className="settings-panel-header">
                <h2>App lock</h2>
                <p>Use a profile-specific PIN for faster local access. Your full password remains available.</p>
              </div>

              <div className="security-method-row">
                <span className="security-method-icon" aria-hidden="true"><KeyRound /></span>
                <div className="security-method-copy">
                  <strong>Six-digit PIN</strong>
                  <span>{security?.pin_enabled ? "Enabled for this MoneyPot profile" : "Not configured"}</span>
                </div>
                <div className="security-method-actions">
                  <Button type="button" onClick={() => { setSecurityError(""); setPinDialogOpen(true); }} disabled={securityBusy}>
                    <KeyRound data-icon="inline-start" />
                    {security?.pin_enabled ? "Change PIN" : "Set PIN"}
                  </Button>
                  {security?.pin_enabled && (
                    <Button type="button" variant="outline" onClick={disablePin} disabled={securityBusy}>
                      {securityBusy ? "Updating…" : "Disable"}
                    </Button>
                  )}
                </div>
              </div>

              <Alert>
                <ShieldCheck aria-hidden="true" />
                <AlertTitle>Stored securely</AlertTitle>
                <AlertDescription>
                  MoneyPot stores only a salted hash of your PIN in the local database. The PIN itself cannot be read back, and repeated failures temporarily disable PIN sign-in.
                </AlertDescription>
              </Alert>
              <p className="security-fallback-note">
                A PIN is for convenient local access and is not a replacement for your full account password. Use a different PIN for each MoneyPot profile.
              </p>
            </div>
          )}
          {page === "page5" && (
            <div className="settings-panel account-danger-zone">
              <div className="settings-panel-header">
                <h2>Delete account</h2>
                <p>Permanently remove this profile and all of its MoneyPot data from this device.</p>
              </div>
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>This cannot be undone</AlertTitle>
                <AlertDescription>
                  Transactions, budgets, goals, preferences, saved banks, PIN settings, and the uploaded profile image for this account will be deleted.
                </AlertDescription>
              </Alert>
              <div className="settings-field">
                <label className="form-label" htmlFor="delete-account-password">Current password</label>
                <input id="delete-account-password" className="form-input" type="password" autoComplete="current-password"
                  value={deletePassword} onChange={event => setDeletePassword(event.target.value)} disabled={deleteBusy} />
              </div>
              <div className="settings-field">
                <label className="form-label" htmlFor="delete-account-confirmation">Type DELETE to confirm</label>
                <input id="delete-account-confirmation" className="form-input" type="text" autoComplete="off"
                  value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} disabled={deleteBusy} />
              </div>
              {deleteError && <p className="settings-inline-error" role="alert">{deleteError}</p>}
              <Button type="button" variant="destructive" onClick={deleteAccount}
                disabled={deleteBusy || !deletePassword || deleteConfirmation !== "DELETE"}>
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                {deleteBusy ? "Deleting account…" : "Delete this account"}
              </Button>
            </div>
          )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
      {toast && (
          <motion.div className={`toast toast-${toast.type}`} role="status" aria-live="polite" initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:18}} transition={{duration:.2,ease:easeOut}}>
          <span>{toast.type === "success" ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span> {toast.msg}
          </motion.div>
      )}
      </AnimatePresence>
      <PinSetupDialog open={pinDialogOpen} busy={securityBusy} error={securityError}
        onSave={savePin} onDismiss={() => { if (!securityBusy) { setPinDialogOpen(false); setSecurityError(""); } }} />
    </div>
  );
});

export default Setting;
