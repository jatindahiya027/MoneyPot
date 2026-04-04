"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState("reset"); // "reset" | "done" | "request"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState("");

  useEffect(() => {
    if (!token) setStep("request");
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
        setMessage(data.message);
      } else {
        setError(data.message || "Reset failed");
      }
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");
    setDevUrl("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "Check your email for the reset link.");
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="login">
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
        <Image alt="logo" src="/logo.png" height={40} width={40} />
        <span style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.5px" }}>MoneyPot</span>
      </div>

      {step === "done" && (
        <div className="loginform">
          <p className="loginhead">Password updated</p>
          <p style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", marginBottom:24 }}>
            {message} You can now sign in with your new password.
          </p>
          <button className="loginbutton" style={{ maxWidth:300 }} onClick={() => router.push("/")}>
            Go to sign in
          </button>
        </div>
      )}

      {step === "reset" && token && (
        <form onSubmit={handleReset} className="loginform">
          <p className="loginhead">Set new password</p>
          <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:24, marginTop:-18, textAlign:"center" }}>
            Choose a strong password (min 8 characters)
          </p>
          <div style={{ width:"100%", maxWidth:300, display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>New password</p>
              <label className="label" style={{ width:"100%", maxWidth:"100%" }}>
                <Image alt="lock" src="/padlock.png" height={26} width={26} style={{ opacity:0.6 }} />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters" required />
              </label>
            </div>
            <div>
              <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Confirm password</p>
              <label className="label" style={{ width:"100%", maxWidth:"100%" }}>
                <Image alt="lock" src="/padlock.png" height={26} width={26} style={{ opacity:0.6 }} />
                <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" required />
              </label>
            </div>
          </div>
          {error && (
            <div style={{ marginTop:8, padding:"8px 14px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, fontSize:13, color:"#f87171", width:"100%", maxWidth:300, textAlign:"center" }}>
              {error}
            </div>
          )}
          <button type="submit" className="loginbutton" style={{ maxWidth:300, marginTop:8 }} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      {step === "request" && (
        <form onSubmit={handleForgot} className="loginform">
          <p className="loginhead">Reset password</p>
          <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:24, marginTop:-18, textAlign:"center" }}>
            Enter your email. The reset link appears in the server console (or your inbox if SMTP is set up in .env).
          </p>
          {message ? (
            <div style={{ padding:"12px 16px", background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", borderRadius:8, fontSize:13, color:"#34d399", width:"100%", maxWidth:300, textAlign:"center", marginBottom:16 }}>
              {message}
              {devUrl && (
                <div style={{ marginTop:10 }}>
                  <p style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>Dev mode — click to reset:</p>
                  <a href={devUrl} style={{ color:"#34d399", fontSize:11, wordBreak:"break-all" }}>{devUrl}</a>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ width:"100%", maxWidth:300 }}>
                <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Email</p>
                <label className="label" style={{ width:"100%", maxWidth:"100%" }}>
                  <Image alt="email" src="/email.png" height={26} width={26} style={{ opacity:0.6 }} />
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" required />
                </label>
              </div>
              {error && (
                <div style={{ marginTop:8, padding:"8px 14px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, fontSize:13, color:"#f87171", width:"100%", maxWidth:300, textAlign:"center" }}>
                  {error}
                </div>
              )}
              <button type="submit" className="loginbutton" style={{ maxWidth:300, marginTop:8 }} disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
          <p className="or">Remember your password?</p>
          <button type="button" className="signupbutton" style={{ maxWidth:300 }} onClick={() => router.push("/")}>
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="login"><p>Loading…</p></div>}>
      <ResetForm />
    </Suspense>
  );
}
