import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/google-button";
import { useAuth, safeRedirect } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import heroImg from "@/assets/hero-barber.jpg";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signin" | "signup" | undefined; redirect?: string | undefined } => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "signin" ? "signin" : undefined,
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or register — BaRbaR" },
      { name: "description", content: "Sign in to BaRbaR to book salon and barber appointments across India." },
      { property: "og:title", content: "Sign in or register — BaRbaR" },
      { property: "og:description", content: "Sign in to BaRbaR to book salon and barber appointments across India." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s/g, "")), "Enter a valid Indian mobile number"),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [phoneOtp, setPhoneOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const target = safeRedirect(search.redirect) ?? "/home";

  useEffect(() => {
    if (search.mode) setMode(search.mode);
  }, [search.mode]);

  useEffect(() => {
    if (!loading && user) navigate({ to: target, replace: true });
  }, [user, loading, navigate, target]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const normalizedPhone = (value: string) => {
    const digits = value.replace(/\\D/g, "");
    return digits.length === 10 ? `+91${digits}` : digits.length === 12 && digits.startsWith("91") ? `+${digits}` : value.trim();
  };

  const sendPhoneOtp = async () => {
    const phone = normalizedPhone(form.phone);
    if (!/^\\+91[6-9]\\d{9}$/.test(phone)) {
      setErrors({ phone: "Enter a valid 10-digit Indian mobile number" });
      return;
    }
    if (mode === "signup" && form.fullName.trim().length < 2) {
      setErrors({ fullName: "Enter your full name before requesting OTP" });
      return;
    }
    setOtpBusy(true);
    setErrors({});
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: mode === "signup",
          data: mode === "signup" ? { full_name: form.fullName.trim(), phone } : undefined,
        },
      });
      if (error) throw error;
      setForm((current) => ({ ...current, phone }));
      setOtpSent(true);
      toast.success("OTP sent. Check your SMS messages.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const phone = normalizedPhone(form.phone);
    if (!/^\\+91[6-9]\\d{9}$/.test(phone) || !/^\\d{6}$/.test(otpCode.trim())) {
      setErrors({ otp: "Enter the 6-digit OTP sent to your mobile" });
      return;
    }
    setOtpBusy(true);
    setErrors({});
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode.trim(), type: "sms" });
      if (error) throw error;
      if (mode === "signup") {
        const { data: current } = await supabase.auth.getUser();
        if (current.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: current.user.id,
            full_name: form.fullName.trim(),
            phone,
          });
          if (profileError) throw profileError;
          if (form.email.trim()) {
            const { error: emailError } = await supabase.auth.updateUser({ email: form.email.trim() });
            if (emailError) toast.error("Phone verified. Email update needs attention: " + errorMessage(emailError));
            else toast.success("Phone verified. Confirm the email verification message to add your email.");
          }
        }
      }
      toast.success("Mobile number verified. Welcome to BaRbaR!");
      navigate({ to: target, replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOtpBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (mode === "signin") {
        const email = emailSchema.safeParse(form.email);
        if (!email.success) return setErrors({ email: email.error.issues[0]!.message });
        if (!form.password) return setErrors({ password: "Enter your password" });
        const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: form.password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
          return setErrors(errs);
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName, phone: parsed.data.phone || null },
          },
        });
        if (error) throw error;
        if (!data.session) setSentTo(parsed.data.email);
      } else {
        const email = emailSchema.safeParse(form.email);
        if (!email.success) return setErrors({ email: email.error.issues[0]!.message });
        const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo(email.data);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={heroImg} alt="" className="absolute inset-0 size-full object-cover" width={1600} height={1008} />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-display text-4xl font-bold leading-tight">Your next great cut is a few taps away.</p>
          <p className="mt-2 text-muted-foreground">Book trusted salons and barbers across India.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-rise">
          {sentTo ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
              <h1 className="mt-4 font-display text-3xl font-bold">Check your email</h1>
              <p className="mt-2 text-muted-foreground">
                We sent a link to <span className="font-semibold text-foreground">{sentTo}</span>.{" "}
                {mode === "forgot" ? "Open it to set a new password." : "Confirm your email to finish creating your account."}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-4xl font-bold">
                {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "signup"
                  ? "Book appointments and manage them in one place."
                  : mode === "forgot"
                    ? "Enter your email and we'll send you a reset link."
                    : "Sign in to book and manage your appointments."}
              </p>
              {target.startsWith("/admin") && (
                <p className="mt-3 rounded-md border border-primary/40 bg-accent px-3 py-2 text-sm text-accent-foreground">
                  Administrator?{" "}
                  <Link to="/admin/login" className="font-semibold text-primary hover:underline">Use the admin sign in</Link>
                </p>
              )}

              {mode !== "forgot" && (
                <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => { setMode(m); setErrors({}); }}
                      className={`rounded-md py-2 text-sm font-medium transition ${mode === m ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
                    >
                      {m === "signin" ? "Sign in" : "Register"}
                    </button>
                  ))}
                </div>
              )}

              {mode !== "forgot" && (
                <div className="mt-5 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Continue with mobile OTP</p>
                      <p className="text-xs text-muted-foreground">Sign in securely using your Indian mobile number</p>
                    </div>
                    <Button type="button" variant={phoneOtp ? "outline" : "hero"} size="sm" onClick={() => { setPhoneOtp((v) => !v); setOtpSent(false); setOtpCode(""); setErrors({}); }}>
                      {phoneOtp ? "Use email instead" : "Use OTP"}
                    </Button>
                  </div>
                  {phoneOtp && (
                    <div className="mt-4 space-y-3">
                      {mode === "signup" && (
                        <>
                          <Field id="otpFullName" label="Full name" error={errors["fullName"]}>
                            <Input id="otpFullName" value={form.fullName} onChange={set("fullName")} placeholder="Your full name" />
                          </Field>
                          <Field id="otpEmail" label="Email address (optional)" error={errors["email"]}>
                            <Input id="otpEmail" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
                          </Field>
                        </>
                      )}
                      <Field id="otpPhone" label="Indian mobile number" error={errors["phone"]}>
                        <Input id="otpPhone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => { set("phone")(e); setOtpSent(false); }} placeholder="+91 98765 43210" />
                      </Field>
                      {!otpSent ? (
                        <Button type="button" variant="hero" className="w-full" disabled={otpBusy} onClick={() => void sendPhoneOtp()}>
                          {otpBusy ? "Sending OTP…" : "Send OTP"}
                        </Button>
                      ) : (
                        <>
                          <Field id="otpCode" label="6-digit OTP" error={errors["otp"]}>
                            <Input id="otpCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\\D/g, "").slice(0, 6))} placeholder="Enter OTP" />
                          </Field>
                          <Button type="button" variant="hero" className="w-full" disabled={otpBusy} onClick={() => void verifyPhoneOtp()}>
                            {otpBusy ? "Verifying…" : "Verify OTP and continue"}
                          </Button>
                          <Button type="button" variant="ghost" className="w-full" disabled={otpBusy} onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                            Change number / resend OTP
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!phoneOtp && true && (
                <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                {mode === "signup" && (
                  <Field id="fullName" label="Full name" error={errors["fullName"]}>
                    <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} placeholder="Aarav Sharma" />
                  </Field>
                )}
                <Field id="email" label="Email" error={errors["email"]}>
                  <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
                </Field>
                {mode === "signup" && (
                  <Field id="phone" label="Mobile number (optional)" error={errors["phone"]}>
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
                  </Field>
                )}
                {mode !== "forgot" && (
                  <Field id="password" label="Password" error={errors["password"]}>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={form.password}
                      onChange={set("password")}
                    />
                  </Field>
                )}
                {mode === "signin" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                    Forgot password?
                  </button>
                )}
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
                {mode === "forgot" && (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                    Back to sign in
                  </Button>
                )}
              </form>
              )}

              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                  </div>
                  <GoogleButton />
                </>
              )}
              <p className="mt-6 text-center text-xs text-muted-foreground">
                By continuing you agree to book responsibly. <Link to="/salons" className="text-primary hover:underline">Browse salons</Link> without an account.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
