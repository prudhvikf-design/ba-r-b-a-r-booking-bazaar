import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states";
import { slotsQuery } from "@/lib/queries";
import { addDaysToDateString, formatDateLabel, formatTime, istDateString, weekdayOfDateString } from "@/lib/format";
import type { SalonHours } from "@/lib/types";

const DAYS_AHEAD = 14;

export function SlotPicker({
  salonId,
  serviceId,
  staffId,
  hours,
  date,
  onDateChange,
  value,
  onChange,
}: {
  salonId: string;
  serviceId: string | undefined;
  staffId: string | null;
  hours: SalonHours[];
  date: string;
  onDateChange: (d: string) => void;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const days = useMemo(() => {
    const today = istDateString();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDaysToDateString(today, i));
  }, []);
  const closedDays = new Set(hours.filter((h) => h.is_closed).map((h) => h.weekday));
  const slots = useQuery(slotsQuery(salonId, serviceId, staffId, date));

  const groups = useMemo(() => {
    const g: Record<"Morning" | "Afternoon" | "Evening", string[]> = { Morning: [], Afternoon: [], Evening: [] };
    for (const s of slots.data ?? []) {
      const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date(s)));
      (h < 12 ? g.Morning : h < 17 ? g.Afternoon : g.Evening).push(s);
    }
    return g;
  }, [slots.data]);

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Choose a date">
        {days.map((d) => {
          const l = formatDateLabel(d);
          const closed = closedDays.has(weekdayOfDateString(d));
          const selected = d === date;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${l.day} ${l.num} ${l.month}${closed ? ", closed" : ""}`}
              disabled={closed}
              onClick={() => {
                onDateChange(d);
                onChange(null);
              }}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"
              }`}
            >
              <span className="text-xs uppercase">{l.day}</span>
              <span className="font-display text-xl font-bold">{l.num}</span>
              <span className="text-xs">{closed ? "Closed" : l.month}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4" aria-live="polite">
        {!serviceId ? (
          <p className="text-sm text-muted-foreground">Choose a service first.</p>
        ) : slots.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : slots.isError ? (
          <ErrorState error={slots.error} onRetry={() => slots.refetch()} />
        ) : !slots.data?.length ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No free slots on this day. Try another date{staffId ? " or choose “Any stylist”" : ""}.
          </p>
        ) : (
          <div className="space-y-4">
            {(Object.keys(groups) as (keyof typeof groups)[]).map((k) =>
              groups[k].length ? (
                <div key={k}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{k}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`${k} times`}>
                    {groups[k].map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={value === s}
                        onClick={() => onChange(s)}
                        className={`h-10 rounded-lg border text-sm font-medium transition ${
                          value === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"
                        }`}
                      >
                        {formatTime(s)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}
