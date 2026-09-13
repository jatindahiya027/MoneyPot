"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/libs/clientToken";
import { AlertCircle, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, CircleDashed, Plus, Trash2, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import DatePicker from "@/components/ui/date-picker";
import { AnimatePresence, easeOut, motion, useReducedMotion } from "@/components/ui/motion";
import { ModalSurface } from "@/components/ui/modal-surface";

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const tabs = [["health", "Health"], ["anomalies", "Spending changes"], ["rule", "50 / 30 / 20"], ["goals", "Savings goals"]];

function StateIcon({ state }) {
  if (state === "strong") return <CheckCircle2 aria-hidden="true" />;
  if (state === "unavailable") return <CircleDashed aria-hidden="true" />;
  return state === "steady" ? <ArrowRight aria-hidden="true" /> : <AlertCircle aria-hidden="true" />;
}

function SignalRow({ signal }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <motion.article className={`analysis-signal-wrap ${signal.state}`} layout="position" transition={{ duration:.24, ease:easeOut }}>
      <button className="analysis-signal" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span className="analysis-signal-icon"><StateIcon state={signal.state} /></span>
        <span className="analysis-signal-copy"><strong>{signal.label}</strong><span>{signal.summary}</span></span>
        <span className="analysis-signal-value"><strong>{signal.value}</strong><span>{signal.score === null ? "Not scored" : `${signal.score}/20`}</span></span>
        <motion.span animate={{ rotate:open ? 180 : 0 }} transition={{ duration:.18, ease:easeOut }}><ChevronDown aria-hidden="true" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div className="analysis-signal-detail"
          initial={reduceMotion ? { opacity:0 } : { height:0, opacity:0 }}
          animate={{ height:"auto", opacity:1 }} exit={reduceMotion ? { opacity:0 } : { height:0, opacity:0 }}
          transition={{ duration:reduceMotion ? .1 : .22, ease:easeOut }}>
          <p>{signal.detail}</p><p><b>Next step:</b> {signal.action}</p>
        </motion.div>}
      </AnimatePresence>
    </motion.article>
  );
}

function EmptyInsight({ title, detail }) {
  return <div className="analysis-empty"><CircleDashed aria-hidden="true"/><h3>{title}</h3><p>{detail}</p></div>;
}

export default function Analysis() {
  const [months, setMonths] = useState(3);
  const [tab, setTab] = useState("health");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", deadline: "", color: "#5a82e1" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analysis?months=${months}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load financial analysis.");
      setData(payload);
    } catch (cause) {
      setData(null);
      setError(cause?.message || "Could not load financial analysis.");
    } finally {
      setLoading(false);
    }
  }, [months]);
  useEffect(() => { load(); }, [load]);

  const radar = useMemo(() => data?.signals?.map(signal => ({ name: signal.label.split(" ")[0], score: signal.score || 0 })) || [], [data]);
  const mutateGoal = async (method, body) => {
    const response = await fetch("/api/goals", { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not save the goal.");
    await load();
  };
  const createGoal = async event => {
    event.preventDefault();
    setError("");
    try {
      await mutateGoal("POST", goalForm);
      setGoalForm({ name: "", target_amount: "", deadline: "", color: "#5a82e1" });
      setShowGoalForm(false);
    } catch (cause) { setError(cause?.message || "Could not create the goal."); }
  };

  return (
    <section className="analysis-page">
      <header className="analysis-header">
        <div><h1>Financial analysis</h1><p>Clear signals from your local transaction history.</p></div>
        <label className="analysis-timeframe"><span>Timeframe</span><select value={months} onChange={event => setMonths(event.target.value === "all" ? "all" : Number(event.target.value))}>{[1,2,3,4,5,6].map(value => <option key={value} value={value}>{value} month{value === 1 ? "" : "s"}</option>)}<option value="all">All time</option></select></label>
      </header>
      <nav className="analysis-tabs" aria-label="Analysis views" role="tablist">{tabs.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>

      <AnimatePresence mode="wait" initial={false}>
      {loading && <motion.div key="loading" className="analysis-loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><span/><p>Reading your transactions…</p></motion.div>}
      {!loading && error && <div className="analysis-empty" role="alert"><AlertCircle aria-hidden="true"/><h3>Analysis unavailable</h3><p>{error}</p><button className="btn-secondary" onClick={load}>Try again</button></div>}
      {!loading && data && tab === "health" && (
        <motion.div key="health" className="analysis-health" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.25,ease:easeOut}}>
          <section className="analysis-score-hero">
            <div className="analysis-score-copy"><span>Your financial health</span><strong>{data.score ?? "—"}</strong><h2>{data.scoreLabel}</h2><p>{data.availableSignalCount} of 5 signals have enough data. Missing signals do not reduce your score.</p></div>
            <div className="analysis-radar"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="66%"><PolarGrid stroke="rgba(255,255,255,.09)"/><PolarAngleAxis dataKey="name" tick={{ fill: "#9a9999", fontSize: 11 }}/><Radar dataKey="score" stroke="#5a82e1" fill="#5a82e1" fillOpacity={0.2}/></RadarChart></ResponsiveContainer></div>
            <dl className="analysis-summary-strip"><div><dt>Income</dt><dd>{money(data.summary.income)}</dd></div><div><dt>Expenses</dt><dd>{money(data.summary.expenses)}</dd></div><div><dt>Invested</dt><dd>{money(data.summary.investment)}</dd></div><div><dt>Saved</dt><dd>{money(data.summary.savings)}</dd></div></dl>
          </section>
          <section className="analysis-explainer"><header><h2>What shaped this result</h2><p>Open any signal to see the evidence and a practical next step.</p></header>{data.signals.map(signal => <SignalRow key={signal.key} signal={signal}/>)}</section>
        </motion.div>
      )}

      {!loading && data && tab === "anomalies" && (
        <motion.section key="anomalies" className="analysis-section" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.25,ease:easeOut}}><header><h2>Meaningful spending changes</h2><p>We flag a category only when it is at least 1.5× its recent median and ₹500 higher.</p></header>
          {!data.anomalies.available || !data.anomalies.items.length ? <EmptyInsight title={data.anomalies.available ? "Spending looks typical" : "More history is needed"} detail={data.anomalies.reason}/> :
            <div className="anomaly-list">{data.anomalies.items.map(item => <article key={item.category}><span><ArrowUpRight aria-hidden="true"/></span><div><h3>{item.category}</h3><p>{money(item.current)} this month, compared with a {money(item.baseline)} recent median.</p></div><strong>{item.multiple}×</strong></article>)}</div>}
        </motion.section>
      )}

      {!loading && data && tab === "rule" && (
        <motion.section key="rule" className="analysis-section" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.25,ease:easeOut}}><header><h2>50 / 30 / 20 guide</h2><p>A planning reference, not a pass or fail test. It uses the selected timeframe.</p></header>
          {!data.rule503020.available ? <EmptyInsight title="Income is needed" detail={data.rule503020.reason}/> : <div className="rule-layout">
            {[{key:"needs",label:"Needs",target:50},{key:"wants",label:"Wants",target:30},{key:"savings",label:"Savings",target:20}].map(item => { const pct = data.rule503020[`${item.key}Pct`]; return <article key={item.key}><header><span>{item.label}</span><strong>{pct}%</strong></header><div className="rule-track"><span style={{ width:`${Math.min(pct,100)}%` }}/><i style={{ left:`${item.target}%` }}/></div><footer><span>{money(data.rule503020[item.key])}</span><span>Guide {item.target}%</span></footer></article>; })}
            <aside><h3>How to read this</h3><p><b>Needs</b> include housing, food, utilities, health, transport, personal care, and credit-card payments.</p><p><b>Wants</b> contain the remaining Debit categories.</p><p><b>Savings</b> is income minus Debit expenses. Investments are an allocation of those savings.</p></aside>
          </div>}
        </motion.section>
      )}

      {!loading && data && tab === "goals" && (
        <motion.section key="goals" className="analysis-section" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.25,ease:easeOut}}><header className="goals-header"><div><h2>Savings goals</h2><p>Keep future purchases separate from everyday spending.</p></div><button className="btn-primary" onClick={() => setShowGoalForm(true)}><Plus aria-hidden="true"/> Add goal</button></header>
          {!data.goals?.length ? <EmptyInsight title="No goals yet" detail="Add one goal with a target amount to start tracking progress."/> : <div className="goal-list">{data.goals.map(goal => { const pct = Math.min(100, Math.round(goal.saved_amount / goal.target_amount * 100)); return <article key={goal.goalid}><div className="goal-main"><span style={{ background:goal.color }}/><div><h3>{goal.name}</h3><p>{money(goal.saved_amount)} of {money(goal.target_amount)}</p></div><strong>{pct}%</strong></div><div className="goal-track"><span style={{ width:`${pct}%`, background:goal.color }}/></div><button aria-label={`Delete ${goal.name}`} onClick={() => confirm(`Delete ${goal.name}?`) && mutateGoal("DELETE", { goalid:goal.goalid }).catch(cause => setError(cause.message))}><Trash2 aria-hidden="true"/></button></article>; })}</div>}
        </motion.section>
      )}
      </AnimatePresence>

      {showGoalForm && (
        <ModalSurface onClose={() => setShowGoalForm(false)} labelledBy="new-goal-title" describedBy="new-goal-description" className="goal-modal">
          <form onSubmit={createGoal}>
            <div className="modal-header"><div><h2 id="new-goal-title">New savings goal</h2><p id="new-goal-description">Choose one clear target.</p></div><button type="button" className="btn-ghost" aria-label="Close goal form" onClick={() => setShowGoalForm(false)}><X aria-hidden="true"/></button></div>
            <label className="form-group"><span className="form-label">Goal name</span><input className="form-input" value={goalForm.name} maxLength={100} onChange={e => setGoalForm({...goalForm,name:e.target.value})} required/></label>
            <label className="form-group"><span className="form-label">Target amount</span><input className="form-input" type="number" min="1" value={goalForm.target_amount} onChange={e => setGoalForm({...goalForm,target_amount:e.target.value})} required/></label>
            <label className="form-group"><span className="form-label">Deadline (optional)</span><DatePicker ariaLabel="Goal deadline" value={goalForm.deadline} onChange={e => setGoalForm({...goalForm,deadline:e.target.value})}/></label>
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={() => setShowGoalForm(false)}>Cancel</button><button className="btn-primary">Create goal</button></div>
          </form>
        </ModalSurface>
      )}
    </section>
  );
}
