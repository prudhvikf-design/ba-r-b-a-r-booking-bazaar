import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBadge, DemoNotice, SalonStatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { salonBySlugQuery } from "@/lib/queries";
import { formatClock, formatDuration, formatINR, initials, WEEKDAYS, istDateString, weekdayOfDateString } from "@/lib/format";
import { resolveCover } from "@/lib/salon-images";

export const Route = createFileRoute("/salons/$slug")({
  head: () => ({
    meta: [
      { title: "Salon details & booking — BaRbaR" },
      { name: "description", content: "See services, prices in ₹, stylists and opening hours, then book your slot." },
      { property: "og:title", content: "Salon details & booking — BaRbaR" },
      { property: "og:description", content: "See services, prices, stylists and opening hours, then book your slot." },
    ],
  }),
  component: SalonDetailPage,
});

function SalonDetailPage() {
  const { slug } = Route.useParams();
  const { data: salon, isLoading, isError, error, refetch } = useQuery(salonBySlugQuery(slug));

  if (isLoading) {
    return (
      <div className="container-page py-8" aria-busy="true">
        <Skeleton className="aspect-[21/9] w-full" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-3 h-5 w-1/3" />
      </div>
    );
  }
  if (isError) return <div className="container-page py-10"><ErrorState error={error} onRetry={() => refetch()} /></div>;
  if (!salon) {
    return (
      <div className="container-page py-10">
        <EmptyState
          title="Salon not found"
          description="This salon may have been removed or isn't live yet."
          action={<Button asChild variant="outline"><Link to="/salons">Browse salons</Link></Button>}
        />
      </div>
    );
  }

  const services = salon.services.filter((s) => s.is_active);
  const staff = salon.staff.filter((s) => s.is_active);
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const todayDow = weekdayOfDateString(istDateString());
  const bookable = salon.status === "active";

  return (
    <div className="pb-28 md:pb-10">
      <div className="relative">
        <img
          src={resolveCover(salon.cover_image)}
          alt={`${salon.name} interior`}
          className="aspect-[16/9] w-full object-cover sm:aspect-[21/8]"
          width={1200}
          height={800}
        />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="container-page absolute inset-x-0 top-4">
          <Button asChild variant="secondary" size="sm" className="bg-background/80 backdrop-blur">
            <Link to="/salons"><ArrowLeft /> All salons</Link>
          </Button>
        </div>
      </div>

      <div className="container-page -mt-16 relative">
        <div className="flex flex-wrap items-center gap-2">
          {salon.is_demo && <DemoBadge />}
          {salon.status !== "active" && <SalonStatusBadge status={salon.status} />}
          <Badge variant="outline" className="capitalize">{salon.gender}</Badge>
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{salon.name}</h1>
        {salon.is_demo && <DemoNotice className="mt-3 max-w-2xl" />}
        {salon.tagline && <p className="mt-1 text-lg text-muted-foreground">{salon.tagline}</p>}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {salon.rating != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <Star className="size-4 fill-current" aria-hidden="true" /> {Number(salon.rating).toFixed(1)}
              <span className="font-normal text-muted-foreground">({salon.review_count} ratings{salon.is_demo ? ", demo" : ""})</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" /> {salon.address_line}, {salon.area}, {salon.city}
            {salon.pincode ? ` – ${salon.pincode}` : ""}
          </span>
          {salon.phone && (
            <a href={`tel:${salon.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Phone className="size-4" aria-hidden="true" /> {salon.phone}
            </a>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            {salon.description && <p className="leading-relaxed text-muted-foreground">{salon.description}</p>}

            <section aria-labelledby="menu">
              <h2 id="menu" className="font-display text-2xl font-bold">Service menu</h2>
              {services.length === 0 ? (
                <div className="mt-4"><EmptyState title="No services listed yet" /></div>
              ) : (
                categories.map((cat) => (
                  <div key={cat} className="mt-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{cat}</h3>
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                      {services.filter((s) => s.category === cat).map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                          <div className="min-w-0">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(s.duration_min)}
                              {s.description ? ` · ${s.description}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-semibold">{formatINR(s.price_paise)}</span>
                            {bookable && (
                              <Button asChild size="sm" variant="goldOutline">
                                <Link to="/book/$slug" params={{ slug: salon.slug }} search={{ serviceId: s.id }}>Book</Link>
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>

            <section aria-labelledby="team">
              <h2 id="team" className="font-display text-2xl font-bold">Meet the team</h2>
              {staff.length === 0 ? (
                <div className="mt-4"><EmptyState title="Team details coming soon" /></div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {staff.map((st) => (
                    <div key={st.id} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold-gradient font-display text-lg font-bold text-primary-foreground">
                        {initials(st.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{st.name}</p>
                        <p className="text-sm text-primary">
                          {st.title}
                          {st.years_experience != null ? ` · ${st.years_experience} yrs` : ""}
                        </p>
                        {st.bio && <p className="mt-1 text-sm text-muted-foreground">{st.bio}</p>}
                        {st.specialties.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {st.specialties.map((sp) => <Badge key={sp} variant="muted">{sp}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Clock className="size-4 text-primary" aria-hidden="true" /> Opening hours
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {salon.salon_hours.map((h) => (
                  <div key={h.weekday} className={`flex justify-between ${h.weekday === todayDow ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    <dt>{WEEKDAYS[h.weekday]}{h.weekday === todayDow ? " (today)" : ""}</dt>
                    <dd>{h.is_closed ? "Closed" : `${formatClock(h.open_time)} – ${formatClock(h.close_time)}`}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {salon.amenities.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-display text-xl font-bold">Amenities</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {salon.amenities.map((a) => <Badge key={a} variant="gold">{a}</Badge>)}
                </div>
              </div>
            )}
            {bookable ? (
              <Button asChild variant="hero" size="xl" className="hidden w-full md:inline-flex">
                <Link to="/book/$slug" params={{ slug: salon.slug }} search={{}}>Book an appointment</Link>
              </Button>
            ) : (
              <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">This salon isn't accepting bookings yet.</p>
            )}
          </aside>
        </div>
      </div>

      {bookable && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
          <Button asChild variant="hero" size="xl" className="w-full">
            <Link to="/book/$slug" params={{ slug: salon.slug }} search={{}}>Book an appointment</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
