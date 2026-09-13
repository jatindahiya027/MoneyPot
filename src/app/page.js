"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AnimatePresence, Motion } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [authMode, setAuthMode] = useState("checking");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pin/profiles", { cache: "no-store" })
      .then(response => response.json())
      .then(data => {
        if (cancelled) return;
        const availableProfiles = Array.isArray(data.profiles) ? data.profiles : [];
        setProfiles(availableProfiles);
        if (availableProfiles.length === 1) {
          setSelectedProfile(availableProfiles[0]);
          setPasswordEmail("");
        }
        const pinProfiles = availableProfiles.filter(profile => profile.pin_enabled);
        const passwordRequested = new URLSearchParams(window.location.search).get("mode") === "password";
        setAuthMode(passwordRequested || pinProfiles.length === 0 ? "password" : "pin");
      })
      .catch(() => setAuthMode("password"));
    return () => { cancelled = true; };
  }, []);

  const completeLogin = () => {
    sessionStorage.setItem("moneypot_recent_auth", "1");
    router.push("/protected");
    router.refresh();
  };

  const handlePinLogin = async (event) => {
    event.preventDefault();
    if (!selectedProfile || !/^\d{6}$/.test(pin)) {
      setError("Enter your six-digit PIN.");
      return;
    }
    setPinBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: selectedProfile.userid, pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "PIN sign-in failed.");
      completeLogin();
    } catch (cause) {
      setError(cause?.message || "PIN sign-in failed.");
      setPin("");
    } finally {
      setPinBusy(false);
    }
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, userid: selectedProfile?.userid, password }),
      });
      const data = await res.json();
      if (data.success) {
        completeLogin();
      } else {
        setError("Invalid email or password");
      }
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  const openPasswordSignIn = () => {
    setError("");
    setAuthMode("password");
  };

  const openPinSignIn = () => {
    setError("");
    setAuthMode("pin");
  };

  const pinProfiles = profiles.filter(profile => profile.pin_enabled);
  const isPinMode = authMode === "pin" && pinProfiles.length > 0;
  const title = isPinMode ? "Unlock MoneyPot" : authMode === "password" ? "Sign in with password" : "Welcome back";
  const description = isPinMode
    ? selectedProfile ? `Welcome back, ${selectedProfile.name || "MoneyPot user"}.` : "Choose your profile to continue."
    : authMode === "password" ? "Use your account email and password." : "Loading your local profiles…";

  return (
    <AuthShell title={title} description={description} error={error} className="auth-login-panel">
      <AnimatePresence mode="wait" initial={false}>
        <Motion key={authMode} className="auth-mode" distance={6}>
          {authMode === "checking" && <p className="auth-loading" aria-live="polite">Preparing sign in…</p>}

          {isPinMode && (
            <section className="auth-pin-signin" aria-label="PIN sign in">
              <div className={cn("auth-profile-list", pinProfiles.length === 1 && "is-single")}>
                {pinProfiles.map(profile => {
                  const selected = selectedProfile?.userid === profile.userid;
                  return (
                    <Button
                      key={profile.userid}
                      type="button"
                      variant="outline"
                      aria-pressed={selected}
                      className={cn("auth-profile-button", selected && "is-selected")}
                      onClick={() => {
                        setSelectedProfile(profile);
                        setPasswordEmail("");
                        setPin("");
                        setError("");
                      }}
                      disabled={pinBusy}
                    >
                      <span className="auth-profile-avatar">
                        <Image
                          alt={`${profile.name || "MoneyPot user"} profile image`}
                          src={profile.image?.startsWith("/uploads/") ? `/api/pin/profile-image?userid=${profile.userid}` : "/profile.png"}
                          width={36}
                          height={36}
                          unoptimized
                        />
                      </span>
                      <span className="auth-profile-copy">
                        <strong>{profile.name || "MoneyPot user"}</strong>
                        <small>{profile.mail_hint}</small>
                      </span>
                      {selected && <KeyRound data-icon="inline-end" aria-hidden="true" />}
                    </Button>
                  );
                })}
              </div>

              {selectedProfile && (
                <form className="auth-pin-form" onSubmit={handlePinLogin}>
                  <Label htmlFor="login-pin">Enter your six-digit PIN</Label>
                  <InputOTP
                    id="login-pin"
                    value={pin}
                    onChange={setPin}
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    disabled={pinBusy}
                    autoFocus
                    autoComplete="off"
                    aria-label={`Six-digit PIN for ${selectedProfile.name || selectedProfile.mail_hint}`}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button type="submit" disabled={pinBusy || pin.length !== 6}>
                    <KeyRound data-icon="inline-start" />
                    {pinBusy ? "Unlocking…" : "Unlock MoneyPot"}
                  </Button>
                </form>
              )}

              <Button type="button" variant="ghost" className="auth-switch-button" onClick={openPasswordSignIn} disabled={pinBusy}>
                <Lock data-icon="inline-start" />
                Use password instead
              </Button>
            </section>
          )}

          {authMode === "password" && (
            <div className="auth-password-mode">
              {pinProfiles.length > 0 && (
                <Button type="button" variant="ghost" className="auth-back-button" onClick={openPinSignIn} disabled={loading}>
                  <ArrowLeft data-icon="inline-start" />
                  Back to PIN
                </Button>
              )}
              {profiles.length > 0 && (
                <div className="auth-password-profiles" aria-label="Choose a local account">
                  <Label>Choose your account</Label>
                  <div className={cn("auth-profile-list", profiles.length === 1 && "is-single")}>
                    {profiles.map(profile => {
                      const selected = selectedProfile?.userid === profile.userid;
                      return (
                        <Button key={profile.userid} type="button" variant="outline" aria-pressed={selected}
                          className={cn("auth-profile-button", selected && "is-selected")}
                          onClick={() => { setSelectedProfile(profile); setPasswordEmail(""); setError(""); }} disabled={loading}>
                          <span className="auth-profile-avatar">
                            <Image alt={`${profile.name || "MoneyPot user"} profile image`}
                              src={profile.image?.startsWith("/uploads/") ? `/api/pin/profile-image?userid=${profile.userid}` : "/profile.png"}
                              width={36} height={36} unoptimized />
                          </span>
                          <span className="auth-profile-copy"><strong>{profile.name || "MoneyPot user"}</strong><small>{profile.mail_hint}</small></span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <Label htmlFor="email">Email address</Label>
                  <div className="auth-input-wrap"><Mail aria-hidden="true" /><Input id="email" type="email" name="username" value={passwordEmail} onChange={event => { setPasswordEmail(event.target.value); setSelectedProfile(null); }} placeholder={selectedProfile?.mail_hint || "you@example.com"} autoComplete="email" autoFocus={profiles.length === 0} disabled={Boolean(selectedProfile)} required={!selectedProfile} /></div>
                  {selectedProfile && (
                    <small className="auth-field-hint">
                      Using the selected local account.{" "}
                      <button type="button" className="auth-link" onClick={() => { setSelectedProfile(null); setPasswordEmail(""); }}>Use another email</button>
                    </small>
                  )}
                </div>
                <div className="auth-field">
                  <div className="auth-label-row"><Label htmlFor="password">Password</Label><button type="button" onClick={() => router.push("/reset-password")} className="auth-link">Forgot password?</button></div>
                  <div className="auth-input-wrap"><Lock aria-hidden="true" /><Input id="password" type="password" name="password" placeholder="Enter your password" autoComplete="current-password" required /></div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
              </form>
              <div className="auth-divider"><span>New to MoneyPot?</span></div>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/signup")}>Create account</Button>
            </div>
          )}
        </Motion>
      </AnimatePresence>
    </AuthShell>
  );
}
