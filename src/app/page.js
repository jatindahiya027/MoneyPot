"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.target);
    const username = formData.get("username");
    const password = formData.get("password");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const { success } = await res.json();
      if (success) {
        router.push("/protected");
        router.refresh();
      } else {
        setError("Invalid email or password");
      }
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="login">
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
        <Image alt="logo" src="/logo.png" height={40} width={40} />
        <span style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.5px" }}>MoneyPot</span>
      </div>

      <form onSubmit={handleSubmit} className="loginform">
        <p className="loginhead">Welcome back</p>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:24, marginTop:-18, textAlign:"center" }}>
          Sign in to your account
        </p>

        <div style={{ width:"100%", maxWidth:300, display:"flex", flexDirection:"column", gap:0 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Email</p>
          <label className="label" style={{ width:"100%", maxWidth:"100%", marginBottom:14 }}>
            <Image alt="email" src="/email.png" height={26} width={26} style={{ opacity:0.6 }} />
            <input type="text" name="username" placeholder="your@email.com" autoComplete="email" />
          </label>

          <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Password</p>
          <label className="label" style={{ width:"100%", maxWidth:"100%", marginBottom:0 }}>
            <Image alt="lock" src="/padlock.png" height={26} width={26} style={{ opacity:0.6 }} />
            <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" />
          </label>
        </div>

        {error && (
          <div style={{ marginTop:12, padding:"8px 14px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, fontSize:13, color:"#f87171", width:"100%", maxWidth:300, textAlign:"center" }}>
            {error}
          </div>
        )}

        <button type="submit" className="loginbutton" style={{ maxWidth:300 }} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="or">or</p>

        <button type="button" onClick={() => router.push("/signup")} className="signupbutton" style={{ maxWidth:300 }}>
          Create account
        </button>
      </form>
    </div>
  );
}
