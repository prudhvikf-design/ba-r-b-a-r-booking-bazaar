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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { formatDuration, formatINR, paiseToRupeesInput, rupeesToPaise } from "@/lib/format";
import { SERVICE_CATEGORIES, type Service } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a service name").max(100),
  category: z.string().min(2).max(40),
  price: z.string().refine((v) => rupeesToPaise(v) !== null, "Enter a valid price in ₹ (e.g. 499 or 499.50)"),
  duration: z.coerce.number().int("Whole minutes only").min(5, "At least 5 minutes").max(480, "Max 8 hours"),
  description: z.string().trim().max(500),
});

export function ServicesManager({ salonId }: { salonId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "services", salonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("salon_id", salonId).order("sort_order").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["owner", "services", salonId] });
    qc.invalidateQueries({ queryKey: ["salon"] });
    qc.invalidateQueries({ queryKey: ["salons"] });
  };

  const toggle = useMutation({
    mutationFn: async (s: Service) => {
      const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: async (s: Service) => {
      const { error } = await supabase.from("services").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service deleted"); invalidate(); setDeleting(null); },
    onError: (e) => { toast.error(errorMessage(e)); setDeleting(null); },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Prices are in ₹ and shown to customers as-is.</p>
        <Button variant="hero" size="sm" onClick={() => setEditing("new")}><Plus /> Add service</Button>
      </div>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState title="No services yet" description="Add your first service so customers can book." action={<Button variant="hero" onClick={() => setEditing("new")}><Plus /> Add service</Button>} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {q.data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  <Badge variant="muted">{s.category}</Badge>
                  {!s.is_active && <Badge variant="warning">Hidden</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{formatINR(s.price_paise)} · {formatDuration(s.duration_min)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.is_active} onCheckedChange={() => toggle.mutate(s)} aria-label={`${s.is_active ? "Hide" : "Show"} ${s.name}`} />
                <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ServiceDialog salonId={salonId} service={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={invalidate} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>If this service has bookings, it can't be deleted — hide it instead using the switch.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); deleting && del.mutate(deleting); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServiceDialog({ salonId, service, onClose, onSaved }: { salonId: string; service: Service | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: service?.name ?? "",
    category: service?.category ?? "Hair",
    price: service ? paiseToRupeesInput(service.price_paise) : "",
    duration: String(service?.duration_min ?? 30),
    description: service?.description ?? "",
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
        category: p.data.category,
        price_paise: rupeesToPaise(p.data.price)!,
        duration_min: p.data.duration,
        description: p.data.description || null,
      };
      const { error } = service
        ? await supabase.from("services").update(row).eq("id", service.id)
        : await supabase.from("services").insert({ ...row, salon_id: salonId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(service ? "Service updated" : "Service added"); onSaved(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const err = (k: string) => errors[k] && <p role="alert" className="text-sm text-destructive">{errors[k]}</p>;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">{service ? "Edit service" : "Add service"}</DialogTitle></DialogHeader>
        <form id="svc-form" onSubmit={(e) => { e.preventDefault(); m.mutate(); }} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="svc-name">Name</Label><Input id="svc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{err("name")}</div>
          <div className="space-y-1.5">
            <Label htmlFor="svc-cat">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="svc-cat"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="svc-price">Price (₹)</Label><Input id="svc-price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="499" />{err("price")}</div>
          <div className="space-y-1.5"><Label htmlFor="svc-dur">Duration (minutes)</Label><Input id="svc-dur" type="number" min={5} max={480} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />{err("duration")}</div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="svc-desc">Description</Label><Textarea id="svc-desc" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="svc-form" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
