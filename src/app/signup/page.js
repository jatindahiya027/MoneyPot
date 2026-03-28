"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.target);
    const username = formData.get("name");
    const age = formData.get("age");
    const email = formData.get("email");
    const password = formData.get("password");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        body: JSON.stringify({ username, age, email, password }),
      });
      const { success, user } = await res.json();
      if (success) {
        router.push("/");
        router.refresh();
      } else {
        setError(user || "Signup failed. Please try again.");
      }
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="login">
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
        <Image alt="logo" src="/logo.png" height={40} width={40} />
        <span style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.5px" }}>MoneyPot</span>
      </div>

      <form onSubmit={handleSubmit} className="loginform">
        <p className="loginhead">Create account</p>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:24, marginTop:-18, textAlign:"center" }}>
          Start tracking your finances
        </p>

        <div style={{ width:"100%", maxWidth:300, display:"flex", flexDirection:"column" }}>
          {[
            { label:"Name",     name:"name",     icon:"/user.png",   type:"text",     placeholder:"Your name" },
            { label:"Age",      name:"age",      icon:"/age.png",    type:"number",   placeholder:"Your age" },
            { label:"Email",    name:"email",    icon:"/email.png",  type:"email",    placeholder:"your@email.com" },
            { label:"Password", name:"password", icon:"/padlock.png",type:"password", placeholder:"Min 6 characters" },
          ].map(({ label, name, icon, type, placeholder }) => (
            <div key={name} style={{ marginBottom:14 }}>
              <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</p>
              <label className="label" style={{ width:"100%", maxWidth:"100%" }}>
                <Image alt={label} src={icon} height={26} width={26} style={{ opacity:0.6 }} />
                <input type={type} name={name} placeholder={placeholder} />
              </label>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop:4, marginBottom:8, padding:"8px 14px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, fontSize:13, color:"#f87171", width:"100%", maxWidth:300, textAlign:"center" }}>
            {error}
          </div>
        )}

        <button type="submit" className="loginbutton" style={{ maxWidth:300 }} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="or">Already have an account?</p>

        <button type="button" onClick={() => router.push("/")} className="signupbutton" style={{ maxWidth:300 }}>
          Sign in
        </button>
      </form>
    </div>
  );
}
