import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/errors";
import { verifyAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const result = await verifyAdminAccess().catch(() => ({ isAdmin: false }));
    if (result.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Admin sign in — BaRbaR" },
      { name: "description", content: "Secure administrator sign in for BaRbaR Booking Bazaar." },
      { property: "og:title", content: "Admin sign in — BaRbaR" },
      { property: "og:description", content: "Restricted sign in for BaRbaR administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Enter your admin email and password.");
      return;
    }

    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in could not be completed.");

      // Verify the role on the server against the database; never trust a client-side role value.
      const { isAdmin } = await verifyAdminAccess();
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have administrator access.");
      }

      toast.success("Admin access verified.");
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      setPassword("");
    }
  };

  return (
    <main className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          BaRbaR · Restricted area
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with an existing administrator account. Customer and salon-owner accounts cannot
          access this dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Admin email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            {busy ? "Verifying access…" : "Sign in as admin"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          Not an administrator?{" "}
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Customer sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
