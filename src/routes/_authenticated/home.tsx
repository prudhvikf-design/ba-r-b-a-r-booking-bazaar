import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Search, Store, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalonCard } from "@/components/salon-card";
import { BookingRow } from "@/components/booking/booking-row";
import { CardGridSkeleton, EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { featuredSalonsQuery, myBookingsQuery, myProfileQuery, salonSearchQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your home — BaRbaR" },
      { name: "description", content: "Your upcoming appointments and salons picked for you." },
      { property: "og:title", content: "Your home — BaRbaR" },
      { property: "og:description", content: "Your upcoming appointments and salons picked for you." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const uid = user?.id ?? "";
  const profile = useQuery({ ...myProfileQuery(uid), enabled: !!user });
  const bookings = useQuery({ ...myBookingsQuery(uid), enabled: !!user });
  const city = profile.data?.city ?? undefined;
  const byCity = useQuery({ ...salonSearchQuery({ city: city ?? "" }), enabled: !!city });
  const featured = useQuery({ ...featuredSalonsQuery(), enabled: !city });
  const nearby = city ? byCity : featured;

  const now = Date.now();
  const upcoming = (bookings.data ?? [])
    .filter((b) => ["pending", "confirmed"].includes(b.status) && new Date(b.end_at).getTime() > now)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, 3);

  const firstName = (profile.data?.full_name || "").split(" ")[0];

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/salons", search: { q: q.trim() || undefined, city } });
  };

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-4xl font-bold">
        {firstName ? <>Namaste, <span className="text-gold-gradient">{firstName}</span></> : "Welcome to BaRbaR"}
      </h1>
      <p className="mt-1 text-muted-foreground">Ready for a fresh look?</p>

      <form onSubmit={onSearch} role="search" className="mt-6 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" placeholder="Search salons or areas" aria-label="Search salons" maxLength={60} />
        </div>
        <Button variant="hero" size="lg" type="submit">Search</Button>
      </form>

      {(hasRole("salon_owner") || hasRole("admin")) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {hasRole("salon_owner") && (
            <Button asChild variant="goldOutline"><Link to="/owner"><Store /> Salon dashboard</Link></Button>
          )}
          {hasRole("admin") && (
            <Button asChild variant="goldOutline"><Link to="/admin"><Shield /> Admin dashboard</Link></Button>
          )}
        </div>
      )}

      <section className="mt-10" aria-labelledby="upcoming">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upcoming" className="font-display text-2xl font-bold">Upcoming appointments</h2>
          <Link to="/bookings" className="text-sm text-primary hover:underline">See all</Link>
        </div>
        {bookings.isLoading ? (
          <ListSkeleton rows={2} />
        ) : bookings.isError ? (
          <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Nothing booked yet"
            description="Pick a salon below and reserve your slot in under a minute."
          />
        ) : (
          <ul className="space-y-3">{upcoming.map((b) => <BookingRow key={b.id} b={b} />)}</ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="nearby">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="nearby" className="font-display text-2xl font-bold">{city ? `Salons in ${city}` : "Top-rated salons"}</h2>
          {!city && (
            <Link to="/profile" className="text-sm text-primary hover:underline">Set your city</Link>
          )}
        </div>
        {nearby.isLoading ? (
          <CardGridSkeleton count={3} />
        ) : nearby.isError ? (
          <ErrorState error={nearby.error} onRetry={() => nearby.refetch()} />
        ) : !nearby.data?.length ? (
          <EmptyState
            title={`No salons in ${city ?? "your area"} yet`}
            description="We're growing fast. Try exploring other cities."
            action={<Button asChild variant="outline"><Link to="/salons">Explore all salons</Link></Button>}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.data.slice(0, 6).map((s) => <SalonCard key={s.id} salon={s} />)}
          </div>
        )}
      </section>
    </div>
  );
}
