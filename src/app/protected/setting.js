"use client";
import { memo, useState, useDeferredValue, useEffect, useCallback } from "react";
import Image from "next/image";
import Cookies from "universal-cookie";
import { useRouter } from "next/navigation";

const cookies = new Cookies();

const LS_URL   = "ollama_url";
const LS_MODEL = "ollama_model";

const Setting = memo(function Setting({ user, setUser }) {
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

  // ── Ollama state
  const [ollamaUrl,   setOllamaUrl]   = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | "checking" | { ok, models?, error? }
  const [availableModels, setAvailableModels] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const u = localStorage.getItem(LS_URL);
    const m = localStorage.getItem(LS_MODEL);
    if (u) setOllamaUrl(u);
    if (m) setOllamaModel(m);
  }, []);

  const saveOllamaPrefs = () => {
    localStorage.setItem(LS_URL,   ollamaUrl);
    localStorage.setItem(LS_MODEL, ollamaModel);
    showToast("Ollama settings saved");
  };

  const checkOllama = useCallback(async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch("/api/ollama-check", {
        headers: { "X-Ollama-Url": ollamaUrl },
      });
      const data = await res.json();
      setOllamaStatus(data);
      if (data.ok && data.models?.length) {
        setAvailableModels(data.models);
        // Auto-select first model if current isn't in list
        if (!data.models.includes(ollamaModel)) {
          setOllamaModel(data.models[0]);
        }
      }
    } catch {
      setOllamaStatus({ ok: false, error: "Request failed" });
    }
  }, [ollamaUrl, ollamaModel]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getdata = () => {
    const token = cookies.get("token");
    if (!token) { router.push("/"); return; }
    fetch("/api/get", { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setUser).catch(console.error);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    // Show a local preview immediately so the user sees the new image before saving
    const localUrl = URL.createObjectURL(f);
    setImage(localUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = cookies.get("token");
    if (!token) { router.push("/"); return; }
    setSaving(true);
    try {
      let img = image;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const result = await res.json();
          img = result.Message;
          setImage(img);
        }
      }
      const res = await fetch("/api/edituser", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, age, mail, img }),
      });
      const { success } = await res.json();
      if (success) { getdata(); showToast("Profile updated"); }
      else showToast("Failed to update profile", "error");
    } catch { showToast("An error occurred", "error"); }
    setSaving(false);
  };

  const downloadCSV = async () => {
    const token = cookies.get("token");
    if (!token) { router.push("/"); return; }
    try {
      const response = await fetch("/api/export", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "transactions.csv";
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      showToast("CSV downloaded");
    } catch { showToast("Download failed", "error"); }
  };

  const sideNavItems = [
    { key: "page0", icon: "/rof.png",     label: "Profile"  },
    { key: "page1", icon: "/export.png",  label: "Export"   },
    { key: "page2", icon: "/bar-chart.png", label: "AI / Ollama" },
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
    <div className="transdiv" style={{ padding:"24px 20px 0" }}>
      <h1 style={{ fontSize:"clamp(20px,4vw,26px)", fontWeight:700, letterSpacing:"-0.5px", marginBottom:20 }}>Settings</h1>

      <div className="settingdiv">
        {/* Left nav */}
        <div className="settigndivheading">
          {sideNavItems.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`button ${page === key ? "active" : ""}`}
              onClick={() => setPage(key)}
              style={{ marginBottom:4 }}
            >
              <Image alt={label} src={icon} height={16} width={16} style={{ opacity: page===key ? 1 : 0.5 }} />
              <p>{label}</p>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="formsett" style={{ paddingTop:4 }}>

          {/* ── Profile tab ── */}
          {page === "page0" && (
            <form onSubmit={handleSubmit} className="formsettt" style={{ gap:0 }}>
              <div style={{ position:"relative", marginBottom:20 }}>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileChange} />
                </label>
              </div>
              {file && <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:12 }}>📎 {file.name}</p>}

              {[
                { label:"Name",  key:"name", value:name, setter:setName, icon:"/user.png",  type:"text"   },
                { label:"Age",   key:"age",  value:age,  setter:setAge,  icon:"/age.png",   type:"number" },
                { label:"Email", key:"mail", value:mail, setter:setMail, icon:"/email.png", type:"email"  },
              ].map(({ label, key, value, setter, icon, type }) => (
                <div key={key} style={{ width:"100%", maxWidth:320, marginBottom:14 }}>
                  <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</p>
                  <div className="label" style={{ width:"100%", maxWidth:"100%" }}>
                    <Image alt={label} src={icon} height={24} width={24} style={{ opacity:0.6, flexShrink:0 }} />
                    <input
                      type={type} name={key} value={value || ""}
                      onChange={e => setter(e.target.value)}
                      style={{ flex:1, minWidth:0, padding:"10px 12px", fontSize:14 }}
                    />
                  </div>
                </div>
              ))}

              <button type="submit" className="loginbutton" disabled={saving} style={{ marginTop:8, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Update Profile"}
              </button>
            </form>
          )}

          {/* ── Export tab ── */}
          {page === "page1" && (
            <div style={{ width:"100%", maxWidth:460, paddingTop:8 }}>
              <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:16, padding:"24px 20px", marginBottom:16 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
                <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Export to CSV</h3>
                <p style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.6, marginBottom:20 }}>
                  Download all your transactions as a CSV file for use in Excel, Google Sheets, or any data analysis tool.
                </p>
                <button onClick={downloadCSV} className="btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download CSV
                </button>
              </div>
              <p style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.6 }}>
                The export includes all transaction fields: date, type, category, description, and amount.
              </p>
            </div>
          )}

          {/* ── AI / Ollama tab ── */}
          {page === "page2" && (
            <div style={{ width:"100%", maxWidth:460, paddingTop:8 }}>

              {/* Status card */}
              <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <p style={{ fontSize:13, fontWeight:600 }}>Ollama Connection</p>
                  <StatusBadge />
                </div>

                {/* URL input */}
                <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Ollama URL</p>
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={e => { setOllamaUrl(e.target.value); setOllamaStatus(null); }}
                    placeholder="http://localhost:11434"
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
                    {ollamaStatus === "checking" ? "…" : "Test"}
                  </button>
                </div>

                {/* Model selector */}
                <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Model</p>
                {availableModels.length > 0 ? (
                  <select
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    style={{
                      width:"100%", background:"var(--bg-primary)", border:"1px solid var(--border)",
                      borderRadius:8, padding:"8px 12px", fontSize:13, color:"azure",
                      outline:"none", cursor:"pointer", marginBottom:14,
                    }}
                  >
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
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
                    Click <strong>Test</strong> to auto-detect installed models, or type a model name manually.
                  </p>
                )}

                <button onClick={saveOllamaPrefs} className="loginbutton" style={{ width:"100%" }}>
                  Save Settings
                </button>
              </div>

              {/* Info card */}
              <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 18px" }}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:8, color:"azure" }}>ℹ️ How it works</p>
                <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.7, marginBottom:6 }}>
                  AI Insights uses your local <strong style={{ color:"azure" }}>Ollama</strong> instance — no data leaves your machine.
                  Only the last <strong style={{ color:"azure" }}>3 months</strong> of transactions are sent, compressed to minimise tokens.
                </p>
                <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.7 }}>
                  Install Ollama: <code style={{ background:"var(--bg-primary)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>ollama.com/download</code><br/>
                  Pull a model: <code style={{ background:"var(--bg-primary)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>ollama pull llama3.2</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span> {toast.msg}
        </div>
      )}
    </div>
  );
});

export default Setting;
