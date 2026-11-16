import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Phone, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { CancelBookingDialog } from "@/components/booking/booking-actions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateTime, formatINR, formatTime } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { BookingStatus } from "@/lib/types";

export interface ManagedBooking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  service_name: string;
  price_paise: number;
  notes: string | null;
  staff?: { name: string } | null;
  profiles?: { full_name: string; phone: string | null } | null;
  salons?: { name: string } | null;
}

type Filter = "upcoming" | "pending" | "past" | "all";

export function ManageBookings({ rows, showSalon = false }: { rows: ManagedBooking[]; showSalon?: boolean }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [cancelId, setCancelId] = useState<ManagedBooking | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ b: ManagedBooking; status: BookingStatus } | null>(null);
  const now = Date.now();

  const filtered = rows
    .filter((b) => {
      const active = b.status === "pending" || b.status === "confirmed";
      if (filter === "upcoming") return active && new Date(b.end_at).getTime() > now;
      if (filter === "pending") return b.status === "pending";
      if (filter === "past") return !active || new Date(b.end_at).getTime() <= now;
      return true;
    })
    .sort((a, b) => (filter === "upcoming" || filter === "pending" ? a.start_at.localeCompare(b.start_at) : b.start_at.localeCompare(a.start_at)));

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.rpc("set_booking_status", { _booking_id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Booking marked ${v.status.replace("_", "-")}`);
      qc.invalidateQueries({ queryKey: ["owner"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
      setConfirmAction(null);
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirmAction(null); },
  });

  const counts = {
    upcoming: rows.filter((b) => (b.status === "pending" || b.status === "confirmed") && new Date(b.end_at).getTime() > now).length,
    pending: rows.filter((b) => b.status === "pending").length,
  };

  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1 sm:inline-flex">
        {(["upcoming", "pending", "past", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${filter === f ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {f}
            {f === "upcoming" ? ` (${counts.upcoming})` : f === "pending" ? ` (${counts.pending})` : ""}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No appointments here" description="New bookings will appear as customers book." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => {
            const past = new Date(b.start_at).getTime() <= now;
            return (
              <li key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{b.service_name}</p>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(b.start_at)} – {formatTime(b.end_at)}
                      {b.staff ? ` · with ${b.staff.name}` : ""}
                      {showSalon && b.salons ? ` · ${b.salons.name}` : ""}
                    </p>
                    <p className="mt-1 text-sm">
                      {b.profiles?.full_name || "Customer"}
                      {b.profiles?.phone && (
                        <a href={`tel:${b.profiles.phone.replace(/\s/g, "")}`} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                          <Phone className="size-3" aria-hidden="true" /> {b.profiles.phone}
                        </a>
                      )}
                    </p>
                    {b.notes && <p className="mt-1 text-sm text-muted-foreground">“{b.notes}”</p>}
                  </div>
                  <span className="font-semibold">{formatINR(b.price_paise)}</span>
                </div>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.status === "pending" && (
                      <Button size="sm" variant="hero" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: b.id, status: "confirmed" })}>
                        <Check /> Confirm
                      </Button>
                    )}
                    {b.status === "confirmed" && (
                      <>
                        <Button size="sm" variant="goldOutline" onClick={() => setConfirmAction({ b, status: "completed" })}>
                          <CheckCheck /> Mark completed
                        </Button>
                        {past && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ b, status: "no_show" })}>
                            <UserX /> No-show
                          </Button>
                        )}
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelId(b)}>
                      <X /> Cancel
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {cancelId && (
        <CancelBookingDialog bookingId={cancelId.id} when={cancelId.start_at} open onOpenChange={(o) => !o && setCancelId(null)} />
      )}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as {confirmAction?.status === "no_show" ? "no-show" : "completed"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && `${confirmAction.b.service_name} on ${formatDateTime(confirmAction.b.start_at)}. This closes the booking.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmAction && setStatus.mutate({ id: confirmAction.b.id, status: confirmAction.status }); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
