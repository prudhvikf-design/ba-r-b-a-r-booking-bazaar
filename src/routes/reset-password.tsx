import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/errors";
import { verifyAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — BaRbaR" },
      { name: "description", content: "Choose a new password for your BaRbaR account." },
      { property: "og:title", content: "Set a new password — BaRbaR" },
      { property: "og:description", content: "Choose a new password for your BaRbaR account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => d.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters");
    if (pw !== pw2) return setError("Passwords don't match");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) {
      setBusy(false);
      return toast.error(errorMessage(err));
    }
    // A new password should end any other signed-in sessions (e.g. an old leaked password).
    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
    // Admins go straight to the dashboard, but only after the server confirms the role.
    const { isAdmin } = await verifyAdminAccess().catch(() => ({ isAdmin: false }));
    setBusy(false);
    setPw("");
    setPw2("");
    toast.success(isAdmin ? "Password updated. Admin access verified." : "Password updated");
    navigate({ to: isAdmin ? "/admin" : "/home", replace: true });
  };

  return (
    <div className="container-page flex justify-center py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <h1 className="font-display text-3xl font-bold">Set a new password</h1>
        {!ready ? (
          <p className="text-muted-foreground">Open this page from the reset link in your email.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
