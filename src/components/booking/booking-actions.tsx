import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlotPicker } from "@/components/booking/slot-picker";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatLongDate, formatTime, istDateString } from "@/lib/format";
import type { SalonHours } from "@/lib/types";

export function CancelBookingDialog({
  bookingId,
  open,
  onOpenChange,
  when,
}: {
  bookingId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  when: string;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cancel_booking", { _booking_id: bookingId, _reason: reason.trim() || undefined });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["owner"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            Your appointment on {formatDateTime(when)} will be cancelled and the slot released. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Plans changed" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending}>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={m.isPending}
            onClick={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            {m.isPending ? "Cancelling…" : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RescheduleDialog({
  bookingId,
  salonId,
  serviceId,
  staffId,
  staffName,
  hours,
  open,
  onOpenChange,
}: {
  bookingId: string;
  salonId: string;
  serviceId: string;
  staffId: string | null;
  staffName?: string | null;
  hours: SalonHours[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(istDateString());
  const [slot, setSlot] = useState<string | null>(null);
  const [keepStylist, setKeepStylist] = useState(!!staffId);
  const chosenStaff = keepStylist ? staffId : null;

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reschedule_booking", {
        _booking_id: bookingId,
        _start_at: slot!,
        _staff_id: (chosenStaff ?? undefined) as string | undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking rescheduled — awaiting salon confirmation");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      onOpenChange(false);
      setSlot(null);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ["slots"] });
      setSlot(null);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Reschedule</DialogTitle>
          <DialogDescription>Pick a new date and time (IST). Your current slot is held until you confirm.</DialogDescription>
        </DialogHeader>
        {staffId && (
          <div className="flex gap-2 text-sm">
            <Button size="sm" variant={keepStylist ? "default" : "outline"} onClick={() => { setKeepStylist(true); setSlot(null); }}>
              Keep {staffName ?? "same stylist"}
            </Button>
            <Button size="sm" variant={!keepStylist ? "default" : "outline"} onClick={() => { setKeepStylist(false); setSlot(null); }}>
              Any stylist
            </Button>
          </div>
        )}
        <SlotPicker
          salonId={salonId}
          serviceId={serviceId}
          staffId={chosenStaff}
          hours={hours}
          date={date}
          onDateChange={setDate}
          value={slot}
          onChange={setSlot}
        />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="hero" disabled={!slot || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Saving…" : slot ? `Move to ${formatLongDate(slot)}, ${formatTime(slot)}` : "Choose a time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
