import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { myBookingsQuery, type BookingWithRefs } from "@/lib/queries";
import { formatDateTime, formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "My bookings — BaRbaR" },
      { name: "description", content: "View, reschedule or cancel your upcoming and past salon appointments." },
      { property: "og:title", content: "My bookings — BaRbaR" },
      { property: "og:description", content: "View, reschedule or cancel your salon appointments." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const q = useQuery({ ...myBookingsQuery(user?.id ?? ""), enabled: !!user });
  const now = Date.now();
  const all = q.data ?? [];
  const upcoming = all
    .filter((b) => ["pending", "confirmed"].includes(b.status) && new Date(b.end_at).getTime() > now)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const past = all.filter((b) => !upcoming.includes(b));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="container-page py-8">
      <PageHeader
        title="My bookings"
        description="Your appointments, all in one place."
        actions={<Button asChild variant="hero"><Link to="/salons">Book something new</Link></Button>}
      />
      <div role="tablist" className="mb-5 inline-grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-5 py-2 text-sm font-medium capitalize ${tab === t ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {t} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>
      {q.isLoading || !user ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={tab === "upcoming" ? "No upcoming bookings" : "No past bookings yet"}
          description={tab === "upcoming" ? "Find a salon you like and grab a slot." : "Completed and cancelled bookings will show here."}
          action={tab === "upcoming" ? <Button asChild variant="hero"><Link to="/salons">Explore salons</Link></Button> : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => <BookingRow key={b.id} b={b} />)}
        </ul>
      )}
    </div>
  );
}

export function BookingRow({ b }: { b: BookingWithRefs }) {
  return (
    <li>
      <Link
        to="/bookings/$id"
        params={{ id: b.id }}
        search={{}}
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
      >
        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-accent text-center">
          <span className="text-[10px] uppercase text-muted-foreground">
            {new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(new Date(b.start_at))}
          </span>
          <span className="-mt-1 font-display text-xl font-bold text-primary">
            {new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(b.start_at))}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{b.service_name}</p>
            <BookingStatusBadge status={b.status} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {b.salons?.name ?? "Salon"} · {formatDateTime(b.start_at)}
          </p>
          {b.salons && (
            <p className="hidden truncate text-xs text-muted-foreground sm:flex sm:items-center sm:gap-1">
              <MapPin className="size-3" aria-hidden="true" /> {b.salons.area}, {b.salons.city}
            </p>
          )}
        </div>
        <span className="hidden font-semibold sm:block">{formatINR(b.price_paise)}</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
