import { useEffect, useMemo, useState } from "react";
import { MapPin, LocateFixed, Search, Loader2, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LocationOption = { name: string; type: string; state?: string; district?: string };

function collectOptions(value: unknown, out: LocationOption[], seen: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOptions(item, out, seen));
    return;
  }
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  const name = [obj.name, obj.cityName, obj.districtName, obj.stateName, obj.label, obj.title]
    .find((v) => typeof v === "string" && v.trim()) as string | undefined;
  if (name) {
    const type = String(obj.type ?? obj.level ?? obj.category ?? obj.entityType ?? "Location");
    const state = [obj.stateName, obj.state].find((v) => typeof v === "string") as string | undefined;
    const district = [obj.districtName, obj.district].find((v) => typeof v === "string") as string | undefined;
    const key = [name, type, state, district].join("|").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ name, type, state, district });
    }
  }
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") collectOptions(v, out, seen);
  });
}

export function IndiaLocationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `https://lgd-json-api.vercel.app/api/search?q=${encodeURIComponent(term)}&limit=12`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error("Location search is temporarily unavailable.");
        const payload: unknown = await response.json();
        const found: LocationOption[] = [];
        collectOptions(payload, found, new Set());
        setOptions(found.slice(0, 12));
      } catch (e) {
        if (!controller.signal.aborted) {
          setOptions([]);
          setError(e instanceof Error ? e.message : "Could not load locations.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const mapsSearchUrl = useMemo(() => {
    const term = query.trim();
    return term
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`salons and barbers near ${term}, India`)}`
      : "https://www.google.com/maps/search/?api=1&query=salons+and+barbers+near+me";
  }, [query]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const label = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        setQuery(label);
        onChange(label);
        setLocating(false);
      },
      () => {
        setError("Location permission was denied or your location is unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const choose = (option: LocationOption) => {
    const label = [option.name, option.district, option.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
    setQuery(label);
    onChange(label);
    setOptions([]);
  };

  return (
    <div className="relative min-w-0">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
          placeholder="Search state, district, city or area"
          className="h-12 border-0 bg-muted pl-9 pr-12"
          aria-label="Search Indian state, district, city or area"
          autoComplete="off"
          maxLength={100}
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          aria-label="Use my current location"
          title="Use my current location"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary disabled:opacity-50"
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        </button>
      </div>
      {options.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-xl" role="listbox" aria-label="Location suggestions">
          {options.map((option, i) => (
            <li key={`${option.name}-${option.type}-${i}`}>
              <button type="button" role="option" aria-selected={false} onClick={() => choose(option)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{option.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[option.type, option.district, option.state].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-destructive" role="status">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <a href={mapsSearchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          <Map className="size-3.5" /> Find nearby salons on Google Maps
        </a>
        {loading && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Searching India locations…</span>}
      </div>
    </div>
  );
}
