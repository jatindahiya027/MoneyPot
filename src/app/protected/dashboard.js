"use client";
import { getToken, clearToken } from "@/libs/clientToken";
import Image from "next/image";
import Areac from "./areachart";
import Piec from "./piechart";
import { memo, useDeferredValue, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
// ── Robust date → YYYY-MM-DD string (never passes Date object to API)
function toDateStr(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d)) return "";
    // Use local date parts to avoid timezone shifting
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch { return ""; }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  // Far-future sentinel — show as "All time" end
  if (dateStr === "2099-12-31") return "All time";
  try {
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[parseInt(m,10)-1]} ${y}`;
  } catch { return dateStr; }
}

const Dashboard = memo(function Dashboard(props) {
  const deferredQuery = useDeferredValue(props.user[0]);
  const router = useRouter();

  const handleClearCookies = async () => {
    // Clear client-side token from localStorage
    clearToken();
    // Ask the server to clear the httpOnly cookie (can't do it from JS)
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  };

  const startDate = props.startDate;
  const endDate = props.endDate;
  const setStartDate = props.setStartDate;
  const setEndDate = props.setEndDate;
  const debounceTimer = useRef(null);

  // ── Debounced fetch on date changes (300ms)
  const fetchByRange = useCallback((start, end) => {
    if (!start || !end) return;
    if (start > end) return; // invalid range — don't fire
    const token = getToken();
    if (!token) { router.push("/"); return; }

    const endpoints = [
      { url: "/api/cattotal",    setState: props.setCatamount   },
      { url: "/api/creditdebit", setState: props.setCreditdebit },
      { url: "/api/transtable",  setState: props.setTranstable  },
      { url: "/api/banktrend",   setState: props.setBanktrend   },
    ];

    endpoints.forEach(({ url, setState }) => {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ StartDate: start, EndDate: end }),
      })
        .then(r => r.json())
        .then(setState)
        .catch(console.error);
    });
  }, [props.setCatamount, props.setCreditdebit, props.setTranstable, router]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchByRange(startDate, endDate);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [startDate, endDate, fetchByRange]);

  const handleStartChange = (e) => {
    const val = e.target.value; // always YYYY-MM-DD from <input type="date">
    if (!val) return;
    setStartDate(val);
  };

  const handleEndChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    setEndDate(val);
  };

  // Quick presets
  const setPreset = (preset) => {
    const today = new Date();
    const todayStr = toDateStr(today);
    if (preset === "month") {
      setStartDate(toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(todayStr);
    } else if (preset === "3month") {
      setStartDate(toDateStr(new Date(today.getFullYear(), today.getMonth() - 2, 1)));
      setEndDate(todayStr);
    } else if (preset === "year") {
      setStartDate(toDateStr(new Date(today.getFullYear(), 0, 1)));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("2000-01-01");
      setEndDate("2099-12-31");
    }
  };
  console.log("creditdebit data:", props.creditdebit);
  const credit = (props.creditdebit || []).filter(i => i.type === "Credit").reduce((s, i) => s + i.amount, 0);
  const debit  = (props.creditdebit || []).filter(i => i.type === "Debit").reduce((s, i) => s + i.amount, 0);
  const saving = credit - debit;
  console.log("Credit:", credit, "Debit:", debit, "Saving:", saving);
  const formatMoney = (n) => {
    if (Math.abs(n) >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
    if (Math.abs(n) >= 1000) return "₹" + (n/1000).toFixed(1) + "K";
    return "₹" + n.toFixed(2);
  };

  return (
    <div className="data">
      <div className="dashdata">
        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:8 }}>
          <h1 style={{ fontSize:"clamp(20px,4vw,26px)", fontWeight:700, letterSpacing:"-0.5px" }}>Dashboard</h1>

          {/* Date range — native inputs, always YYYY-MM-DD */}
          <div className="date-range-bar">
            <span className="date-label">From</span>
            <input
              type="date"
              value={startDate}
              onChange={handleStartChange}
              max={endDate === "2099-12-31" ? undefined : endDate}
            />
            <span className="date-label">To</span>
            <input
              type="date"
              value={endDate === "2099-12-31" ? "" : endDate}
              placeholder="All time"
              onChange={handleEndChange}
              min={startDate || undefined}
            />
          </div>
        </div>

        {/* ── Quick presets ── */}
        <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { label:"This month", key:"month" },
            { label:"3 months",   key:"3month" },
            { label:"This year",  key:"year" },
            { label:"All time",   key:"all" },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className="preset-btn"
              style={{
                padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                background:"var(--bg-card)", border:"1px solid var(--border)",
                color:"var(--text-muted)", cursor:"pointer", transition:"all 0.15s",
              }}
              onMouseOver={e => { e.target.style.color="azure"; e.target.style.borderColor="rgba(90,130,225,0.4)"; }}
              onMouseOut={e => { e.target.style.color="var(--text-muted)"; e.target.style.borderColor="var(--border)"; }}
            >
              {p.label}
            </button>
          ))}
          {startDate && endDate && (
            <span style={{ fontSize:11, color:"var(--text-muted)", display:"flex", alignItems:"center", marginLeft:4 }}>
              {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)}
            </span>
          )}
        </div>

        {/* ── Overview cards ── */}
        <p className="dash-section-title">Overview</p>
        <div className="overview-row">
          <div className="info">
            <p style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Income</p>
            <p className="amount green">{formatMoney(credit)}</p>
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{(props.creditdebit||[]).filter(i=>i.type==="Credit").length} transactions</p>
          </div>
          <div className="info">
            <p style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Expenses</p>
            <p className="amount red">{formatMoney(debit)}</p>
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{(props.creditdebit||[]).filter(i=>i.type==="Debit").length} transactions</p>
          </div>
          <div className="info">
            <p style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Net Savings</p>
            <p className={`amount ${saving >= 0 ? "yellow" : "red"}`}>{formatMoney(saving)}</p>
            <p style={{ fontSize:11, color:saving>=0?"var(--success)":"var(--danger)", marginTop:4 }}>{saving>=0?"▲ Positive":"▼ Deficit"}</p>
          </div>
        </div>

        {/* ── Charts ── */}
        <p className="dash-section-title">Spending Analysis</p>
        <div className="graph maingraph">
          <div className="graphs areachart chart-card">
            <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>Daily cash flow · hover for bank breakdown</p>
            <Areac transtables={props.transtables} />
          </div>
          <div className="graphs piechart chart-card">
            <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>By category</p>
            <Piec catamount={props.catamount} />
          </div>
        </div>
      </div>

      {/* ── Profile sidebar (desktop only) ── */}
      <div className="profile">
        <div className="profiledata">
          <Image
            alt="profile"
            src={deferredQuery?.image && deferredQuery.image.startsWith("/uploads/") ? `/api/get-uploaded-file?file=${encodeURIComponent(deferredQuery.image)}` : (deferredQuery?.image || "/profile.png")}
            height={72} width={72}
            className="profimg"
          />
          <p>{props.user[0]?.name || " "}</p>
          <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8 }}>{props.user[0]?.mail || ""}</p>
          <div className="edit">
            <button className="profeditbutton" title="Edit profile" onClick={() => props.setActiveComponent("component4")}>
              <Image alt="edit" src="/edit.png" width={16} height={16} />
            </button>
            <button className="profeditbutton" title="Logout" onClick={handleClearCookies}>
              <Image alt="logout" src="/logout.png" width={16} height={16} />
            </button>
          </div>
        </div>

        <div className="section-header" style={{ marginBottom:8 }}>
          <span className="subhead">Recent</span>
          <span className="seemore" onClick={() => props.setActiveComponent("component2")}>see all →</span>
        </div>
        <div className="tabledb light">
          <table style={{ width:"100%" }}>
            <tbody>
              {(props.trans||[]).slice(0, 6).map((item, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft:0, fontSize:11 }}>
                    <span className={`badge badge-${item.type?.toLowerCase()}`}>{item.type}</span>
                  </td>
                  <td style={{ fontSize:11, color:"#777" }}>{item.date}</td>
                  <td style={{ fontSize:11, fontFamily:"DM Mono, monospace", textAlign:"right", paddingRight:0, color: item.type==="Credit" ? "var(--success)" : "var(--danger)" }}>
                    ₹{parseFloat(item.amount||0).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-header" style={{ marginTop:20, marginBottom:10 }}>
          <span className="subhead">Categories</span>
          <span className="seemore" onClick={() => props.setActiveComponent("component3")}>see all →</span>
        </div>
        <div className="categ light">
          {(props.cate||[]).slice(0, 4).map((item, i) => (
            <div className="categbox" key={i}>{item.name}</div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;