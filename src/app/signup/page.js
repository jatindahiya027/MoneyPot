"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, User, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.target);
    const username = formData.get("name");
    const age = formData.get("age");
    const email = formData.get("email");
    const password = formData.get("password");
    if (pin && pin.length !== 6) {
      setError("Enter all six PIN digits, or leave both PIN fields empty.");
      setLoading(false);
      return;
    }
    if (pin !== pinConfirmation) {
      setError("The quick unlock PINs do not match.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, age, email, password, pin }),
      });
      const payload = await res.json().catch(() => ({ success:false, user:`MoneyPot returned an invalid response (${res.status}).` }));
      const { success, user } = payload;
      if (success) {
        router.push("/");
        router.refresh();
      } else {
        setError(user || "Signup failed. Please try again.");
      }
    } catch (error) { setError(`MoneyPot could not reach its local service. Restart the app and try again${error?.message ? ` (${error.message})` : "."}`); }
    setLoading(false);
  };

  return (
    <AuthShell title="Create your account" description="Set up a private workspace for your finances." error={error}>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-fields-grid">
          {[
            { label:"Name",     name:"name",     Icon:User,      type:"text",     placeholder:"Your name" },
            { label:"Age",      name:"age",      Icon:UserRound, type:"number",   placeholder:"Your age" },
            { label:"Email",    name:"email",    Icon:Mail,      type:"email",    placeholder:"your@email.com" },
            { label:"Password", name:"password", Icon:Lock,      type:"password", placeholder:"At least 8 characters" },
          ].map(({ label, name, Icon, type, placeholder }) => (
            <div key={name} className="auth-field">
              <Label htmlFor={name}>{label}</Label>
              <div className="auth-input-wrap">
                <Icon aria-hidden="true" />
                <Input id={name} type={type} name={name} placeholder={placeholder} required autoComplete={name === "email" ? "email" : name === "password" ? "new-password" : "off"} />
              </div>
            </div>
          ))}
        </div>
        <div className="auth-pin-setup">
          <div className="auth-label-row">
            <Label htmlFor="signup-pin">Quick unlock PIN</Label>
            <span>Optional</span>
          </div>
          <p>Use six digits for faster local sign-in. Leave this empty to use only your password.</p>
          <InputOTP
            id="signup-pin"
            value={pin}
            onChange={setPin}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={loading}
            autoComplete="new-password"
            aria-label="Optional six-digit quick unlock PIN"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
            </InputOTPGroup>
          </InputOTP>
          <Label htmlFor="signup-pin-confirmation">Confirm quick unlock PIN</Label>
          <InputOTP
            id="signup-pin-confirmation"
            value={pinConfirmation}
            onChange={setPinConfirmation}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={loading}
            autoComplete="new-password"
            aria-label="Confirm optional six-digit quick unlock PIN"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
      </form>
      <div className="auth-divider"><span>Already have an account?</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>Sign in</Button>
    </AuthShell>
  );
}
