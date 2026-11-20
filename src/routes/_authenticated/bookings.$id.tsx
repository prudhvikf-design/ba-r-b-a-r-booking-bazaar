import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Phone, Scissors, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge, DemoBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { CancelBookingDialog, RescheduleDialog } from "@/components/booking/booking-actions";
import { bookingQuery, salonBySlugQuery } from "@/lib/queries";
import { formatDuration, formatINR, formatLongDate, formatTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  validateSearch: (s: Record<string, unknown>): { created?: boolean | undefined } => ({
    created: s["created"] === true || s["created"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Booking details — BaRbaR" },
      { name: "description", content: "Your appointment details, with options to reschedule or cancel." },
      { property: "og:title", content: "Booking details — BaRbaR" },
      { property: "og:description", content: "Your appointment details, with options to reschedule or cancel." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const { created } = Route.useSearch();
  const { user } = useAuth();
  const q = useQuery(bookingQuery(id));
  const b = q.data;
  const salonQ = useQuery({ ...salonBySlugQuery(b?.salons?.slug ?? ""), enabled: !!b?.salons?.slug });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  if (q.isLoading) return <div className="container-page py-8"><Skeleton className="h-80 w-full" /></div>;
  if (q.isError) return <div className="container-page py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!b) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Booking not found" action={<Button asChild variant="outline"><Link to="/bookings">My bookings</Link></Button>} />
      </div>
    );
  }

  const isMine = b.customer_id === user?.id;
  const upcoming = ["pending", "confirmed"].includes(b.status) && new Date(b.start_at).getTime() > Date.now();

  return (
    <div className="container-page max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/bookings"><ArrowLeft /> My bookings</Link>
      </Button>

      {created && (
        <div role="status" className="mt-4 flex gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-semibold">Booking request sent!</p>
            <p className="text-sm text-muted-foreground">
              Your slot is reserved. The salon will confirm shortly — you'll see the status change here.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/40 bg-card-gradient shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Booking #{b.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-1 font-display text-3xl font-bold">{b.service_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              {b.salons?.name}
              {b.salons?.is_demo && <DemoBadge />}
            </p>
          </div>
          <BookingStatusBadge status={b.status} />
        </div>
        <dl className="grid gap-5 p-6 sm:grid-cols-2">
          <Info icon={CalendarClock} label="When" value={`${formatLongDate(b.start_at)}`} sub={`${formatTime(b.start_at)} – ${formatTime(b.end_at)} IST`} />
          <Info icon={Scissors} label="Service" value={b.service_name} sub={formatDuration(b.duration_min)} />
          <Info icon={User} label="Stylist" value={b.staff?.name ?? "Assigned stylist"} sub={b.staff?.title ?? undefined} />
          <Info icon={Wallet} label="Price" value={formatINR(b.price_paise)} sub="Pay at the salon · online payments coming soon" />
          {b.salons && (
            <Info icon={MapPin} label="Address" value={`${b.salons.address_line}`} sub={`${b.salons.area}, ${b.salons.city}`} />
          )}
          {b.salons?.phone && (
            <Info icon={Phone} label="Salon phone" value={b.salons.phone} />
          )}
        </dl>
        {b.notes && (
          <div className="border-t border-border px-6 py-4 text-sm">
            <span className="text-muted-foreground">Your notes: </span>{b.notes}
          </div>
        )}
        {b.status === "cancelled" && b.cancel_reason && (
          <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">Cancellation reason: {b.cancel_reason}</div>
        )}
        {isMine && upcoming && (
          <div className="flex flex-col gap-2 border-t border-border p-6 sm:flex-row">
            <Button variant="goldOutline" onClick={() => setResOpen(true)} disabled={!salonQ.data}>Reschedule</Button>
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOpen(true)}>
              Cancel booking
            </Button>
          </div>
        )}
      </div>

      {b.salons && (
        <Button asChild variant="link" className="mt-4 px-0">
          <Link to="/salons/$slug" params={{ slug: b.salons.slug }}>View salon</Link>
        </Button>
      )}

      <CancelBookingDialog bookingId={b.id} open={cancelOpen} onOpenChange={setCancelOpen} when={b.start_at} />
      {salonQ.data && (
        <RescheduleDialog
          bookingId={b.id}
          salonId={b.salon_id}
          serviceId={b.service_id}
          staffId={b.staff_id}
          staffName={b.staff?.name}
          hours={salonQ.data.salon_hours}
          open={resOpen}
          onOpenChange={setResOpen}
        />
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value, sub }: { icon: typeof MapPin; label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
        {sub && <dd className="text-sm text-muted-foreground">{sub}</dd>}
      </div>
    </div>
  );
}
