import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { myProfileQuery } from "@/lib/queries";
import { CITIES } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — BaRbaR" },
      { name: "description", content: "Update your name, phone number and city." },
      { property: "og:title", content: "Your profile — BaRbaR" },
      { property: "og:description", content: "Update your name, phone number and city." },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s/g, "")), "Enter a valid Indian mobile number"),
  city: z.string().max(60),
});

const ROLE_LABEL = { customer: "Customer", salon_owner: "Salon owner", admin: "Admin" } as const;

function ProfilePage() {
  const { user, roles, signOut } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ ...myProfileQuery(user?.id ?? ""), enabled: !!user });
  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (q.data) setForm({ full_name: q.data.full_name ?? "", phone: q.data.phone ?? "", city: q.data.city ?? "" });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: v.full_name, phone: v.phone || null, city: v.city || null })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      return setErrors(errs);
    }
    setErrors({});
    save.mutate(p.data);
  };

  return (
    <div className="container-page max-w-xl py-8">
      <PageHeader title="Your profile" description={user?.email ?? undefined} />
      <div className="mb-6 flex flex-wrap gap-2">
        {roles.map((r) => <Badge key={r} variant="gold">{ROLE_LABEL[r]}</Badge>)}
      </div>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />
            {errors.full_name && <p role="alert" className="text-sm text-destructive">{errors.full_name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" autoComplete="tel" />
            {errors.phone && <p role="alert" className="text-sm text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Select value={form.city || undefined} onValueChange={(v) => setForm({ ...form, city: v })}>
              <SelectTrigger id="city"><SelectValue placeholder="Select your city" /></SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">We'll show salons in your city first.</p>
          </div>
          <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </form>
      )}
      <Button variant="outline" className="mt-6" onClick={() => void signOut()}>Sign out</Button>
    </div>
  );
}
