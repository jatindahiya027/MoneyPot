"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

function PinInput({ value, onChange, disabled, autoFocus = false, label }) {
  return (
    <InputOTP
      value={value}
      onChange={onChange}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      disabled={disabled}
      autoFocus={autoFocus}
      autoComplete="current-password"
      aria-label={label}
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
      </InputOTPGroup>
    </InputOTP>
  );
}

export function PinLock({ profile, busy, error, onUnlock, onPassword }) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  const submit = event => {
    event.preventDefault();
    if (pin.length === 6) onUnlock(pin);
  };

  return (
    <main className="pin-screen">
      <div className="pin-brand">
        <Image alt="" src="/logo-pot-only.png" width={38} height={38} priority />
        <span>MoneyPot</span>
      </div>
      <Card className="pin-card" role="region" aria-labelledby="pin-lock-title">
        <CardHeader className="pin-card-header">
          <span className="pin-icon" aria-hidden="true"><LockKeyhole /></span>
          <CardTitle id="pin-lock-title">Welcome back{profile?.name ? `, ${profile.name}` : ""}</CardTitle>
          <CardDescription>Enter your six-digit PIN to open this financial workspace.</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="pin-card-content">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <PinInput value={pin} onChange={setPin} disabled={busy} autoFocus label="Six-digit MoneyPot PIN" />
          </CardContent>
          <CardFooter className="pin-actions">
            <Button type="submit" disabled={busy || pin.length !== 6}>
              <KeyRound data-icon="inline-start" />
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
            <Button type="button" variant="outline" onClick={onPassword} disabled={busy}>Use password</Button>
          </CardFooter>
        </form>
      </Card>
      <p className="pin-local-note">Your PIN stays on this device and is stored only as a salted hash.</p>
    </main>
  );
}

export function PinSetupDialog({ open, busy, error, onSave, onDismiss }) {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) {
      setPin("");
      setConfirmation("");
      setLocalError("");
    }
  }, [open]);

  const submit = event => {
    event.preventDefault();
    if (pin.length !== 6) return setLocalError("Enter all six digits.");
    if (pin !== confirmation) return setLocalError("The PINs do not match.");
    setLocalError("");
    onSave(pin);
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen && !busy) onDismiss(); }}>
      <DialogContent className="pin-setup-dialog">
        <DialogHeader>
          <span className="pin-icon" aria-hidden="true"><KeyRound /></span>
          <DialogTitle>Set up quick unlock</DialogTitle>
          <DialogDescription>
            Create a six-digit PIN for faster access on this device. Your full password always remains available.
          </DialogDescription>
        </DialogHeader>
        <form className="pin-setup-form" onSubmit={submit}>
          {(localError || error) && <Alert variant="destructive"><AlertDescription>{localError || error}</AlertDescription></Alert>}
          <label className="pin-field">
            <span>New PIN</span>
            <PinInput value={pin} onChange={setPin} disabled={busy} autoFocus label="New six-digit PIN" />
          </label>
          <label className="pin-field">
            <span>Confirm PIN</span>
            <PinInput value={confirmation} onChange={setConfirmation} disabled={busy} label="Confirm six-digit PIN" />
          </label>
          <div className="pin-security-note">
            <ShieldCheck aria-hidden="true" />
            <p>After five incorrect attempts, PIN sign-in is paused for five minutes. Password sign-in remains available.</p>
          </div>
          <DialogFooter className="pin-dialog-actions">
            <Button type="button" variant="ghost" onClick={onDismiss} disabled={busy}>Not now</Button>
            <Button type="submit" disabled={busy || pin.length !== 6 || confirmation.length !== 6}>
              <KeyRound data-icon="inline-start" />
              {busy ? "Saving…" : "Save PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
