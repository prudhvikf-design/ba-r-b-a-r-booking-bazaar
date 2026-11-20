import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, IndianRupee, Scissors, Store, Users, Clock, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DemoBadge, SalonStatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { ManageBookings, type ManagedBooking } from "@/components/booking/manage-bookings";
import { useAuth } from "@/lib/auth";
import { formatDuration, formatINR } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { AppRole, SalonStatus } from "@/lib/types";

type Overview = {
  customers: number; salons: number; salons_pending: number; services: number; staff: number;
  bookings: number; bookings_upcoming: number; bookings_completed: number; bookings_cancelled: number; booked_value_paise: number;
};

export function AdminOverview() {
  const q = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const o = q.data!;
  const cards = [
    { label: "Users", value: o.customers, icon: Users },
    { label: "Salons", value: o.salons, icon: Store },
    { label: "Awaiting approval", value: o.salons_pending, icon: Clock, highlight: o.salons_pending > 0 },
    { label: "Services", value: o.services, icon: Scissors },
    { label: "Total bookings", value: o.bookings, icon: CalendarDays },
    { label: "Upcoming bookings", value: o.bookings_upcoming, icon: CalendarDays },
    { label: "Completed", value: o.bookings_completed, icon: CalendarDays },
    { label: "Booked value", value: formatINR(o.booked_value_paise), icon: IndianRupee },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border p-4 ${c.highlight ? "border-warning/50 bg-warning/10" : "border-border bg-card"}`}>
          <c.icon className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          <p className="text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

const ROLE_LABEL: Record<AppRole, string> = { customer: "Customer", salon_owner: "Salon owner", admin: "Admin" };

export function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState<{ id: string; name: string; role: AppRole; grant: boolean } | null>(null);
  const q = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const m = useMutation({
    mutationFn: async (p: { id: string; role: AppRole; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", { _user_id: p.id, _role: p.role, _grant: p.grant });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin"] }); setPending(null); },
    onError: (e) => { toast.error(errorMessage(e)); setPending(null); },
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const f = filter.trim().toLowerCase();
  const rows = (q.data ?? []).filter((u) => !f || `${u.full_name} ${u.email} ${u.phone ?? ""} ${u.city ?? ""}`.toLowerCase().includes(f));
  return (
    <div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name, email, phone or city" className="mb-4 max-w-sm" aria-label="Search users" />
      {rows.length === 0 ? <EmptyState title="No users found" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.full_name || "—"} {u.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}{u.city ? ` · ${u.city}` : ""}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {u.roles.map((r) => <Badge key={r} variant={r === "admin" ? "gold" : "muted"}>{ROLE_LABEL[r]}</Badge>)}
                  <span className="text-xs text-muted-foreground">{u.booking_count} bookings</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["salon_owner", "admin"] as AppRole[]).map((r) => {
                  const has = u.roles.includes(r);
                  const self = u.id === user?.id && r === "admin";
                  return (
                    <Button key={r} size="sm" variant={has ? "outline" : "goldOutline"} disabled={self}
                      onClick={() => setPending({ id: u.id, name: u.full_name || u.email, role: r, grant: !has })}>
                      {has ? `Remove ${ROLE_LABEL[r].toLowerCase()}` : `Make ${ROLE_LABEL[r].toLowerCase()}`}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.grant ? "Grant" : "Remove"} {pending && ROLE_LABEL[pending.role].toLowerCase()} role?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.grant ? "This gives" : "This removes"} {pending?.name} {pending?.role === "admin" ? "full admin access to all data." : "salon owner access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (pending) m.mutate(pending); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminSalons() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<SalonStatus | "all">("all");
  const q = useQuery({
    queryKey: ["admin", "salons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salons").select("*, profiles(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const m = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalonStatus }) => {
      const { error } = await supabase.from("salons").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salon status updated");
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["salons"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const rows = (q.data ?? []).filter((s) => filter === "all" || s.status === filter);
  return (
    <div>
      <Select value={filter} onValueChange={(v) => setFilter(v as SalonStatus | "all")}>
        <SelectTrigger className="mb-4 w-52" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All salons</SelectItem>
          <SelectItem value="pending">Awaiting approval</SelectItem>
          <SelectItem value="active">Live</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
      {rows.length === 0 ? <EmptyState title="No salons in this view" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/salons/$slug" params={{ slug: s.slug }} className="font-medium hover:text-primary">{s.name}</Link>
                  <SalonStatusBadge status={s.status} />
                  {s.is_demo && <DemoBadge />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.area}, {s.city} · Owner: {s.profiles?.full_name || (s.owner_id ? "—" : "None (demo)")}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status !== "active" && <Button size="sm" variant="hero" disabled={m.isPending} onClick={() => m.mutate({ id: s.id, status: "active" })}>Approve</Button>}
                {s.status !== "suspended" && <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ id: s.id, status: "suspended" })}>Suspend</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminServices() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["admin", "services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*, salons(name, is_demo)").order("salon_id").order("sort_order").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const m = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "services"] }); qc.invalidateQueries({ queryKey: ["salon"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const f = filter.trim().toLowerCase();
  const rows = (q.data ?? []).filter((s) => !f || `${s.name} ${s.category} ${s.salons?.name ?? ""}`.toLowerCase().includes(f));
  return (
    <div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search service, category or salon" className="mb-4 max-w-sm" aria-label="Search services" />
      {rows.length === 0 ? <EmptyState title="No services found" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name} <span className="text-sm font-normal text-muted-foreground">· {s.salons?.name}</span></p>
                <p className="text-sm text-muted-foreground">{s.category} · {formatINR(s.price_paise)} · {formatDuration(s.duration_min)}</p>
              </div>
              <Switch checked={s.is_active} onCheckedChange={(v) => m.mutate({ id: s.id, is_active: v })} aria-label={`${s.is_active ? "Hide" : "Show"} ${s.name}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export function AdminStaff() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, title, years_experience, is_active, salon_id, salons(name, city, area)")
        .order("name")
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const m = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("staff").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barber status updated");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      qc.invalidateQueries({ queryKey: ["salon"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const f = filter.trim().toLowerCase();
  const rows = (q.data ?? []).filter((s) =>
    !f || `${s.name} ${s.title ?? ""} ${s.salons?.name ?? ""} ${s.salons?.city ?? ""} ${s.salons?.area ?? ""}`.toLowerCase().includes(f)
  );
  return (
    <div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search barber, salon or city" className="mb-4 max-w-sm" aria-label="Search barbers" />
      {rows.length === 0 ? <EmptyState title="No barbers found" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {s.title || "Barber"} · {s.salons?.name || "Unknown salon"}
                  {s.salons?.area || s.salons?.city ? ` · ${[s.salons?.area, s.salons?.city].filter(Boolean).join(", ")}` : ""}
                </p>
                {s.years_experience !== null && <p className="text-xs text-muted-foreground">{s.years_experience} years experience</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.is_active ? "success" : "muted"}>{s.is_active ? "Active" : "Hidden"}</Badge>
                <Switch checked={s.is_active} disabled={m.isPending} onCheckedChange={(v) => m.mutate({ id: s.id, is_active: v })} aria-label={`${s.is_active ? "Hide" : "Activate"} ${s.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminBookings() {
  const q = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, service_name, price_paise, notes, staff(name), profiles(full_name, phone), salons(name)")
        .order("start_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ManagedBooking[];
    },
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <ManageBookings rows={q.data ?? []} showSalon />;
}
