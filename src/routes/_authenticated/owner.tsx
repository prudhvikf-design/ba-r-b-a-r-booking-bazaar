import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, ExternalLink, IndianRupee, Plus, Scissors, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge, SalonStatusBadge } from "@/components/status-badge";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { RegisterSalonForm } from "@/components/owner/register-salon";
import { SalonProfileForm } from "@/components/owner/salon-profile-form";
import { ServicesManager } from "@/components/owner/services-manager";
import { StaffManager } from "@/components/owner/staff-manager";
import { HoursEditor } from "@/components/owner/hours-editor";
import { ManageBookings, type ManagedBooking } from "@/components/booking/manage-bookings";
import { useAuth } from "@/lib/auth";
import { ownerSalonsQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Salon dashboard — BaRbaR" },
      { name: "description", content: "Manage your salon profile, services, prices, staff, hours and appointments." },
      { property: "og:title", content: "Salon dashboard — BaRbaR" },
      { property: "og:description", content: "Manage your salon profile, services, staff, hours and appointments." },
    ],
  }),
  component: OwnerPage,
});

function OwnerPage() {
  const { user } = useAuth();
  const salons = useQuery({ ...ownerSalonsQuery(user?.id ?? ""), enabled: !!user });
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (salons.data?.length && (!selected || !salons.data.some((s) => s.id === selected))) setSelected(salons.data[0]!.id);
  }, [salons.data, selected]);

  if (!user || salons.isLoading) return <div className="container-page py-8"><ListSkeleton /></div>;
  if (salons.isError) return <div className="container-page py-8"><ErrorState error={salons.error} onRetry={() => salons.refetch()} /></div>;

  if (!salons.data?.length || adding) {
    return (
      <div className="container-page max-w-3xl py-8">
        <PageHeader
          title={adding ? "Add another salon" : "List your salon on BaRbaR"}
          description="Reach customers across your city and manage bookings in one place. Free while in preview."
          actions={adding ? <Button variant="ghost" onClick={() => setAdding(false)}>Back to dashboard</Button> : undefined}
        />
        <RegisterSalonForm onCreated={() => setAdding(false)} />
      </div>
    );
  }

  const salon = salons.data.find((s) => s.id === selected) ?? salons.data[0]!;

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Store className="size-4" aria-hidden="true" /> Salon dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{salon.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SalonStatusBadge status={salon.status} />
            {salon.is_demo && <DemoBadge />}
            <span className="text-sm text-muted-foreground">{salon.area}, {salon.city}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {salons.data.length > 1 && (
            <Select value={salon.id} onValueChange={setSelected}>
              <SelectTrigger className="w-56" aria-label="Choose salon"><SelectValue /></SelectTrigger>
              <SelectContent>{salons.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button asChild variant="outline" size="sm"><Link to="/salons/$slug" params={{ slug: salon.slug }}><ExternalLink /> View public page</Link></Button>
          {salons.data.length < 3 && <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus /> Add salon</Button>}
        </div>
      </div>

      {salon.status === "pending" && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-semibold">Awaiting admin approval</p>
          <p className="text-muted-foreground">Your salon isn't visible to customers yet. Meanwhile, add services, team members and opening hours.</p>
        </div>
      )}
      {salon.status === "suspended" && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Your salon is suspended and hidden from customers. Please contact BaRbaR support.
        </div>
      )}

      <Tabs defaultValue="appointments">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-auto">
          <TabsTrigger value="appointments"><CalendarDays className="size-4" /> Appointments</TabsTrigger>
          <TabsTrigger value="services"><Scissors className="size-4" /> Services</TabsTrigger>
          <TabsTrigger value="staff"><Users className="size-4" /> Team</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="size-4" /> Hours</TabsTrigger>
          <TabsTrigger value="profile"><Store className="size-4" /> Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments"><OwnerAppointments salonId={salon.id} /></TabsContent>
        <TabsContent value="services"><ServicesManager salonId={salon.id} /></TabsContent>
        <TabsContent value="staff"><StaffManager salonId={salon.id} /></TabsContent>
        <TabsContent value="hours"><HoursEditor salonId={salon.id} /></TabsContent>
        <TabsContent value="profile"><SalonProfileForm salon={salon} /></TabsContent>
      </Tabs>
    </div>
  );
}

function OwnerAppointments({ salonId }: { salonId: string }) {
  const q = useQuery({
    queryKey: ["owner", "bookings", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, service_name, price_paise, notes, staff(name), profiles(full_name, phone)")
        .eq("salon_id", salonId)
        .order("start_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as ManagedBooking[];
    },
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  const now = Date.now();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const todayCount = rows.filter((b) => ["pending", "confirmed"].includes(b.status) && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(b.start_at)) === today).length;
  const upcomingValue = rows.filter((b) => ["pending", "confirmed"].includes(b.status) && new Date(b.start_at).getTime() > now).reduce((s, b) => s + b.price_paise, 0);
  const pending = rows.filter((b) => b.status === "pending").length;
  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Today" value={String(todayCount)} icon={CalendarDays} />
        <Stat label="Awaiting confirmation" value={String(pending)} icon={Clock} />
        <Stat label="Upcoming value" value={formatINR(upcomingValue)} icon={IndianRupee} />
      </div>
      <ManageBookings rows={rows} />
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
