import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { SlotPicker } from "@/components/booking/slot-picker";
import { salonBySlugQuery } from "@/lib/queries";
import { formatDuration, formatINR, formatLongDate, formatTime, initials, istDateString, addDaysToDateString, weekdayOfDateString } from "@/lib/format";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/book/$slug")({
  validateSearch: (s: Record<string, unknown>): { serviceId?: string } => ({
    serviceId: typeof s.serviceId === "string" ? s.serviceId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book an appointment — BaRbaR" },
      { name: "description", content: "Pick a service, stylist and time slot to book your salon appointment." },
      { property: "og:title", content: "Book an appointment — BaRbaR" },
      { property: "og:description", content: "Pick a service, stylist and time slot to book your salon appointment." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: salon, isLoading, isError, error, refetch } = useQuery(salonBySlugQuery(slug));

  const [serviceId, setServiceId] = useState<string | undefined>(search.serviceId);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(istDateString());
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Skip to the first open day if today is closed.
  useEffect(() => {
    if (!salon) return;
    const closed = new Set(salon.salon_hours.filter((h) => h.is_closed).map((h) => h.weekday));
    let d = istDateString();
    for (let i = 0; i < 7 && closed.has(weekdayOfDateString(d)); i++) d = addDaysToDateString(d, 1);
    setDate(d);
  }, [salon]);

  const services = useMemo(() => salon?.services.filter((s) => s.is_active) ?? [], [salon]);
  const staff = useMemo(() => salon?.staff.filter((s) => s.is_active) ?? [], [salon]);
  const service = services.find((s) => s.id === serviceId);
  const stylist = staff.find((s) => s.id === staffId);

  const book = useMutation({
    mutationFn: async () => {
      const { data, error: err } = await supabase.rpc("create_booking", {
        _salon_id: salon!.id,
        _service_id: serviceId!,
        _staff_id: staffId as string,
        _start_at: slot!,
        _notes: notes.trim() || undefined,
      });
      if (err) throw err;
      return data as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      navigate({ to: "/bookings/$id", params: { id }, search: { created: true } });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ["slots"] });
      setSlot(null);
    },
  });

  if (isLoading) return <div className="container-page py-8"><Skeleton className="h-96 w-full" /></div>;
  if (isError) return <div className="container-page py-8"><ErrorState error={error} onRetry={() => refetch()} /></div>;
  if (!salon || salon.status !== "active") {
    return (
      <div className="container-page py-10">
        <EmptyState
          title="Booking unavailable"
          description="This salon isn't accepting bookings right now."
          action={<Button asChild variant="outline"><Link to="/salons">Browse salons</Link></Button>}
        />
      </div>
    );
  }

  const canBook = !!service && !!slot && notes.length <= 500;

  return (
    <div className="container-page py-6 pb-32 lg:pb-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/salons/$slug" params={{ slug }}><ArrowLeft /> {salon.name}</Link>
      </Button>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Book at {salon.name}</h1>
        {salon.is_demo && <DemoBadge />}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <Step n={1} title="Choose a service" done={!!service}>
            <div className="grid gap-2" role="radiogroup" aria-label="Services">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={serviceId === s.id}
                  onClick={() => { setServiceId(s.id); setSlot(null); }}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${
                    serviceId === s.id ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.category} · {formatDuration(s.duration_min)}</p>
                  </div>
                  <span className="font-semibold">{formatINR(s.price_paise)}</span>
                </button>
              ))}
            </div>
          </Step>

          <Step n={2} title="Choose a stylist" subtitle="Optional" done={!!service}>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Stylists">
              <StylistOption selected={staffId === null} onClick={() => { setStaffId(null); setSlot(null); }} name="Any available stylist" sub="Fastest availability" icon={<Users className="size-5" />} />
              {staff.map((st) => (
                <StylistOption
                  key={st.id}
                  selected={staffId === st.id}
                  onClick={() => { setStaffId(st.id); setSlot(null); }}
                  name={st.name}
                  sub={st.title ?? "Stylist"}
                  icon={<span className="font-display font-bold">{initials(st.name)}</span>}
                />
              ))}
            </div>
          </Step>

          <Step n={3} title="Pick a date & time" subtitle="Times shown in IST" done={!!slot}>
            <SlotPicker
              salonId={salon.id}
              serviceId={serviceId}
              staffId={staffId}
              hours={salon.salon_hours}
              date={date}
              onDateChange={setDate}
              value={slot}
              onChange={setSlot}
            />
          </Step>

          <Step n={4} title="Anything we should know?" subtitle="Optional" done={false}>
            <Label htmlFor="notes" className="sr-only">Notes for the salon</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="e.g. Short on the sides, keep length on top"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{notes.length}/500</p>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-primary/40 bg-card-gradient p-5 shadow-card">
            <h2 className="font-display text-xl font-bold">Your booking</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Service" value={service ? `${service.name} (${formatDuration(service.duration_min)})` : "—"} />
              <Row label="Stylist" value={stylist ? stylist.name : "Any available"} />
              <Row label="When" value={slot ? `${formatLongDate(slot)}, ${formatTime(slot)}` : "—"} />
              <div className="gold-rule my-2" />
              <Row label="Total (pay at salon)" value={service ? formatINR(service.price_paise) : "—"} strong />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              No payment needed now. The salon will confirm your request. Online payments are coming soon.
            </p>
            <Button variant="hero" size="xl" className="mt-5 hidden w-full lg:inline-flex" disabled={!canBook || book.isPending} onClick={() => book.mutate()}>
              {book.isPending ? "Booking…" : "Confirm booking"}
            </Button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{service ? formatINR(service.price_paise) : "Choose a service"}</p>
            <p className="truncate text-muted-foreground">{slot ? `${formatLongDate(slot)}, ${formatTime(slot)}` : "Pick a time"}</p>
          </div>
          <Button variant="hero" size="lg" disabled={!canBook || book.isPending} onClick={() => book.mutate()}>
            {book.isPending ? "Booking…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, subtitle, done, children }: { n: number; title: string; subtitle?: string; done: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`grid size-7 place-items-center rounded-full text-sm font-bold ${done ? "bg-primary text-primary-foreground" : "border border-primary/60 text-primary"}`}>
          {done ? <Check className="size-4" aria-hidden="true" /> : n}
        </span>
        <h2 id={`step-${n}`} className="font-display text-xl font-bold">{title}</h2>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function StylistOption({ selected, onClick, name, sub, icon }: { selected: boolean; onClick: () => void; name: string; sub: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-gradient text-primary-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${strong ? "text-lg font-bold text-primary" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
