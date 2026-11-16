import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalonCard } from "@/components/salon-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/states";
import { citiesQuery, salonSearchQuery, type SalonSearch } from "@/lib/queries";
import { SERVICE_CATEGORIES, type SalonGender } from "@/lib/types";

const GENDERS: SalonGender[] = ["men", "women", "unisex"];
const SORTS = ["rating", "price", "name"] as const;

export const Route = createFileRoute("/salons/")({
  validateSearch: (s: Record<string, unknown>): SalonSearch => ({
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 60) : undefined,
    city: typeof s.city === "string" && s.city ? s.city.slice(0, 60) : undefined,
    gender: GENDERS.includes(s.gender as SalonGender) ? (s.gender as SalonGender) : undefined,
    category: typeof s.category === "string" && SERVICE_CATEGORIES.includes(s.category) ? s.category : undefined,
    sort: SORTS.includes(s.sort as (typeof SORTS)[number]) ? (s.sort as SalonSearch["sort"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find salons & barbers near you — BaRbaR" },
      { name: "description", content: "Browse salons and barbers by city, area, service and price. Book online in seconds." },
      { property: "og:title", content: "Find salons & barbers near you — BaRbaR" },
      { property: "og:description", content: "Browse salons and barbers by city, area, service and price." },
    ],
  }),
  component: SalonsPage,
});

const ALL = "__all";

function SalonsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/salons/" });
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const results = useQuery(salonSearchQuery(search));
  const cities = useQuery(citiesQuery());

  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const update = (patch: Partial<SalonSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() || undefined });
  };
  const hasFilters = !!(search.q || search.city || search.gender || search.category);

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-4xl font-bold">Find your salon</h1>
      <p className="mt-1 text-muted-foreground">
        {search.city ? `Salons in ${search.city}` : "Salons and barbers across India"}
        {search.category ? ` offering ${search.category.toLowerCase()} services` : ""}
      </p>

      <form onSubmit={onSubmit} role="search" className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by salon, area or city"
            className="h-11 pl-9"
            aria-label="Search salons"
            maxLength={60}
          />
        </div>
        <Button type="submit" variant="hero" size="lg">Search</Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="md:hidden"
          aria-expanded={showFilters}
          aria-controls="filters"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal /> <span className="sr-only">Filters</span>
        </Button>
      </form>

      <div id="filters" className={`mt-4 grid-cols-2 gap-3 md:grid md:grid-cols-4 ${showFilters ? "grid" : "hidden"}`}>
        <FilterSelect
          label="City"
          value={search.city}
          options={(cities.data ?? []).map((c) => ({ value: c, label: c }))}
          onChange={(v) => update({ city: v })}
        />
        <FilterSelect
          label="For"
          value={search.gender}
          options={[
            { value: "men", label: "Men" },
            { value: "women", label: "Women" },
            { value: "unisex", label: "Unisex only" },
          ]}
          onChange={(v) => update({ gender: v as SalonGender | undefined })}
        />
        <FilterSelect
          label="Service"
          value={search.category}
          options={SERVICE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => update({ category: v })}
        />
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Sort by</span>
          <Select value={search.sort ?? "rating"} onValueChange={(v) => update({ sort: v as SalonSearch["sort"] })}>
            <SelectTrigger aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="price">Lowest price</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => navigate({ search: { sort: search.sort }, replace: true })}
        >
          <X /> Clear filters
        </Button>
      )}

      <div className="mt-6" aria-live="polite">
        {results.isLoading ? (
          <CardGridSkeleton />
        ) : results.isError ? (
          <ErrorState error={results.error} onRetry={() => results.refetch()} />
        ) : !results.data?.length ? (
          <EmptyState
            title="No salons match"
            description="Try another area, a different city or remove some filters."
            action={
              hasFilters ? (
                <Button variant="outline" onClick={() => navigate({ search: {}, replace: true })}>Clear filters</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.data.length} salon{results.data.length === 1 ? "" : "s"} found
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.data.map((s) => (
                <SalonCard key={s.id} salon={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
