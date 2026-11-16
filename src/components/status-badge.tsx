import { Badge } from "@/components/ui/badge";
import type { BookingStatus, SalonStatus } from "@/lib/types";

const bookingMap: Record<BookingStatus, { label: string; variant: "warning" | "success" | "gold" | "muted" | "danger" }> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  completed: { label: "Completed", variant: "gold" },
  cancelled: { label: "Cancelled", variant: "muted" },
  no_show: { label: "No-show", variant: "danger" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const m = bookingMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

const salonMap: Record<SalonStatus, { label: string; variant: "warning" | "success" | "danger" }> = {
  pending: { label: "Awaiting approval", variant: "warning" },
  active: { label: "Live", variant: "success" },
  suspended: { label: "Suspended", variant: "danger" },
};

export function SalonStatusBadge({ status }: { status: SalonStatus }) {
  const m = salonMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <Badge variant="muted" className={`uppercase tracking-wider ${className}`} title="Sample data for preview — not a real business">
      Demo listing
    </Badge>
  );
}
