import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { initials } from "@/lib/format";
import type { Staff } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  title: z.string().trim().max(80),
  years: z.string().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 60), "0–60 years"),
  specialties: z.string().max(300),
  bio: z.string().trim().max(500),
});

export function StaffManager({ salonId }: { salonId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "staff", salonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("*").eq("salon_id", salonId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["owner", "staff", salonId] });
    qc.invalidateQueries({ queryKey: ["salon"] });
  };
  const toggle = useMutation({
    mutationFn: async (s: Staff) => {
      const { error } = await supabase.from("staff").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: async (s: Staff) => {
      const { error } = await supabase.from("staff").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Team member removed"); invalidate(); setDeleting(null); },
    onError: (e) => { toast.error(errorMessage(e)); setDeleting(null); },
  });

  const active = q.data?.filter((s) => s.is_active).length ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Bookings are assigned to active team members. At least one is needed to accept bookings.</p>
        <Button variant="hero" size="sm" onClick={() => setEditing("new")}><Plus /> Add member</Button>
      </div>
      {q.data && active === 0 && q.data.length > 0 && (
        <p className="mb-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">No active team members — customers can't book until you activate one.</p>
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState title="No team members yet" description="Add your barbers and stylists so customers can book." action={<Button variant="hero" onClick={() => setEditing("new")}><Plus /> Add member</Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {q.data.map((s) => (
            <li key={s.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-gradient font-display font-bold text-primary-foreground">{initials(s.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  {!s.is_active && <Badge variant="warning">Inactive</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{s.title ?? "Stylist"}{s.years_experience != null ? ` · ${s.years_experience} yrs` : ""}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Switch checked={s.is_active} onCheckedChange={() => toggle.mutate(s)} aria-label={`${s.is_active ? "Deactivate" : "Activate"} ${s.name}`} />
                  <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} aria-label={`Remove ${s.name}`}><Trash2 /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <StaffDialog salonId={salonId} staff={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={invalidate} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Team members with bookings can't be removed — deactivate them instead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); deleting && del.mutate(deleting); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StaffDialog({ salonId, staff, onClose, onSaved }: { salonId: string; staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: staff?.name ?? "",
    title: staff?.title ?? "",
    years: staff?.years_experience != null ? String(staff.years_experience) : "",
    specialties: staff?.specialties.join(", ") ?? "",
    bio: staff?.bio ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => {
      const p = schema.safeParse(form);
      if (!p.success) {
        const errs: Record<string, string> = {};
        p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
        setErrors(errs);
        throw new Error("Please fix the highlighted fields");
      }
      const row = {
        name: p.data.name,
        title: p.data.title || null,
        years_experience: p.data.years === "" ? null : Number(p.data.years),
        specialties: p.data.specialties.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 30)),
        bio: p.data.bio || null,
      };
      const { error } = staff
        ? await supabase.from("staff").update(row).eq("id", staff.id)
        : await supabase.from("staff").insert({ ...row, salon_id: salonId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(staff ? "Team member updated" : "Team member added"); onSaved(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const err = (k: string) => errors[k] && <p role="alert" className="text-sm text-destructive">{errors[k]}</p>;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">{staff ? "Edit team member" : "Add team member"}</DialogTitle></DialogHeader>
        <form id="staff-form" onSubmit={(e) => { e.preventDefault(); m.mutate(); }} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st-name">Name</Label><Input id="st-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{err("name")}</div>
          <div className="space-y-1.5"><Label htmlFor="st-title">Title</Label><Input id="st-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Barber" /></div>
          <div className="space-y-1.5"><Label htmlFor="st-years">Years of experience</Label><Input id="st-years" inputMode="numeric" value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} />{err("years")}</div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st-spec">Specialties (comma separated)</Label><Input id="st-spec" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Fades, Beard design" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st-bio">Short bio</Label><Textarea id="st-bio" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="staff-form" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
