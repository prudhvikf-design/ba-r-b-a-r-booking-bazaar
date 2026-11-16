import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { DemoBadge } from "@/components/status-badge";
import { formatINR } from "@/lib/format";
import { resolveCover } from "@/lib/salon-images";
import type { SalonListItem } from "@/lib/queries";

const genderLabel = { unisex: "Unisex", men: "Men", women: "Women" } as const;

export function SalonCard({ salon }: { salon: SalonListItem }) {
  const active = salon.services.filter((s) => s.is_active);
  const from = active.length ? Math.min(...active.map((s) => s.price_paise)) : null;
  return (
    <Link
      to="/salons/$slug"
      params={{ slug: salon.slug }}
      className="group block overflow-hidden rounded-xl border border-border bg-card-gradient shadow-card transition hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={resolveCover(salon.cover_image)}
          alt={`${salon.name} interior`}
          loading="lazy"
          width={1200}
          height={800}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex justify-between p-3">
          {salon.is_demo ? <DemoBadge className="bg-background/80 backdrop-blur" /> : <span />}
          <span className="rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
            {genderLabel[salon.gender]}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-tight">{salon.name}</h3>
          {salon.rating != null && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              {Number(salon.rating).toFixed(1)}
              <span className="sr-only">out of 5</span>
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {salon.area}, {salon.city}
        </p>
        {from != null && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Services from </span>
            <span className="font-semibold text-foreground">{formatINR(from)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
