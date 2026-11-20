import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, MapPin, Scissors, Search, Sparkles, Store, Droplets, Palette, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalonCard } from "@/components/salon-card";
import { IndiaLocationSearch } from "@/components/india-location-search";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/states";
import { featuredSalonsQuery } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import heroImg from "@/assets/hero-barber.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BaRbaR — Find & book salons and barbers in India" },
      {
        name: "description",
        content: "Search salons and barbers by city or area, compare services and prices in ₹, and book your slot instantly.",
      },
      { property: "og:title", content: "BaRbaR — Find & book salons and barbers in India" },
      { property: "og:description", content: "Search salons by city or area, compare prices in ₹ and book instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const POPULAR = [
  { label: "Haircut", category: "Hair", icon: Scissors },
  { label: "Beard & shave", category: "Beard", icon: Sparkles },
  { label: "Hair colour", category: "Colour", icon: Palette },
  { label: "Hair spa & champi", category: "Spa", icon: Droplets },
  { label: "Facials & threading", category: "Skin", icon: Smile },
];

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<string>("");
  const [q, setQ] = useState("");
  const featured = useQuery(featuredSalonsQuery());

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const locationTerm = location.trim().split(",")[0];
    navigate({ to: "/salons", search: { q: [locationTerm, q.trim()].filter(Boolean).join(" ") || undefined } });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="A barber giving a fade haircut in a premium barbershop"
          width={1600}
          height={1008}
          className="absolute inset-0 -z-10 size-full object-cover opacity-70"
          fetchPriority="high"
        />
        <div className="absolute inset-0 -z-10 bg-hero-fade" />
        <div className="container-page pb-16 pt-20 sm:pb-24 sm:pt-28">
          <div className="max-w-2xl animate-rise">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Salons · Barbers · India</p>
            <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              Look sharp.
              <br />
              <span className="text-gold-gradient">Book in seconds.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Discover trusted salons and barbers near you, compare prices in rupees, and pick a slot that fits your day.
            </p>
          </div>

          <form
            onSubmit={onSearch}
            className="mt-8 grid max-w-3xl gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-card backdrop-blur sm:grid-cols-[1fr_auto]"
            role="search"
            aria-label="Find a salon"
          >
            <IndiaLocationSearch value={location} onChange={setLocation} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Area or salon name, e.g. Indiranagar"
                className="h-12 border-0 bg-muted pl-9"
                aria-label="Area or salon name"
                maxLength={60}
              />
            </div>
            <Button type="submit" variant="hero" size="xl">Search</Button>
          </form>

          {!user && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <Button asChild variant="goldOutline">
                <Link to="/auth" search={{ mode: "signup" }}>Create free account</Link>
              </Button>
              <Link to="/auth" search={{ mode: "signin" }} className="text-muted-foreground hover:text-foreground">
                Already a member? <span className="text-primary">Sign in</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Popular services */}
      <section className="container-page py-14" aria-labelledby="popular">
        <h2 id="popular" className="font-display text-3xl font-bold">Popular services</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {POPULAR.map((p) => (
            <Link
              key={p.category}
              to="/salons"
              search={{ category: p.category }}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/60"
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent text-primary">
                <p.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-medium">{p.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-6" aria-labelledby="featured">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="featured" className="font-display text-3xl font-bold">Featured salons</h2>
            <p className="mt-1 text-sm text-muted-foreground">Top-rated places to get groomed this week.</p>
          </div>
          <Link to="/salons" className="hidden items-center gap-1 text-sm text-primary hover:underline sm:inline-flex">
            View all <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {featured.isLoading ? (
          <CardGridSkeleton />
        ) : featured.isError ? (
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        ) : !featured.data?.length ? (
          <EmptyState title="No salons yet" description="Salons will appear here once they're approved." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.map((s) => (
              <SalonCard key={s.id} salon={s} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="mt-16 bg-paper py-16 text-paper-foreground" aria-labelledby="how">
        <div className="container-page">
          <h2 id="how" className="font-display text-3xl font-bold sm:text-4xl">How BaRbaR works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Search, title: "Discover", text: "Search by city or area and compare services, prices and stylists." },
              { icon: CalendarCheck, title: "Book a slot", text: "Choose a service, a stylist (or anyone free) and a time that suits you." },
              { icon: Scissors, title: "Show up & shine", text: "Get reminders in your bookings, reschedule or cancel anytime. Pay at the salon." },
            ].map((s, i) => (
              <div key={s.title} className="rounded-xl border border-paper-foreground/10 bg-paper p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gold-gradient text-primary-foreground">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-sm font-semibold text-paper-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-paper-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="container-page py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-primary/40 bg-card-gradient p-8 sm:flex-row sm:items-center">
          <div>
            <Store className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-3 font-display text-3xl font-bold">Own a salon or barbershop?</h2>
            <p className="mt-1 max-w-lg text-muted-foreground">
              List your salon, manage services, staff and opening hours, and accept bookings — free while in preview.
            </p>
          </div>
          <Button asChild variant="hero" size="xl">
            <Link to="/owner">List your salon</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
