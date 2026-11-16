import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import { BookingStatusBadge } from "@/components/status-badge";
import type { BookingWithRefs } from "@/lib/queries";
import { formatDateTime, formatINR } from "@/lib/format";

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
