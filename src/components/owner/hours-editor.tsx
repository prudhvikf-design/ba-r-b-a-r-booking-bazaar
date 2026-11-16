import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorState, ListSkeleton } from "@/components/states";
import { WEEKDAYS } from "@/lib/format";
import { errorMessage } from "@/lib/errors";

type Row = { weekday: number; is_closed: boolean; open_time: string; close_time: string };

export function HoursEditor({ salonId }: { salonId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "hours", salonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("salon_hours").select("*").eq("salon_id", salonId).order("weekday");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!q.data) return;
    setRows(
      WEEKDAYS.map((_, d) => {
        const r = q.data.find((x) => x.weekday === d);
        return { weekday: d, is_closed: r?.is_closed ?? false, open_time: (r?.open_time ?? "10:00").slice(0, 5), close_time: (r?.close_time ?? "20:00").slice(0, 5) };
      }),
    );
  }, [q.data]);

  const invalid = rows.filter((r) => !r.is_closed && r.close_time <= r.open_time).map((r) => r.weekday);

  const save = useMutation({
    mutationFn: async () => {
      if (invalid.length) throw new Error("Closing time must be after opening time");
      const { error } = await supabase.from("salon_hours").upsert(rows.map((r) => ({ ...r, salon_id: salonId })), { onConflict: "salon_id,weekday" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opening hours saved");
      qc.invalidateQueries({ queryKey: ["owner", "hours", salonId] });
      qc.invalidateQueries({ queryKey: ["salon"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const update = (d: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.weekday === d ? { ...r, ...patch } : r)));

  if (q.isLoading) return <ListSkeleton rows={7} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Times are in IST. Existing bookings are not changed when you edit hours.</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r) => (
          <li key={r.weekday} className="flex flex-wrap items-center gap-3 p-4">
            <span className="w-28 font-medium">{WEEKDAYS[r.weekday]}</span>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!r.is_closed} onCheckedChange={(v) => update(r.weekday, { is_closed: !v })} aria-label={`${WEEKDAYS[r.weekday]} open`} />
              {r.is_closed ? "Closed" : "Open"}
            </label>
            {!r.is_closed && (
              <div className="flex items-center gap-2">
                <Input type="time" step={900} value={r.open_time} onChange={(e) => update(r.weekday, { open_time: e.target.value })} className="w-32" aria-label={`${WEEKDAYS[r.weekday]} opening time`} />
                <span className="text-muted-foreground">to</span>
                <Input type="time" step={900} value={r.close_time} onChange={(e) => update(r.weekday, { close_time: e.target.value })} className="w-32" aria-label={`${WEEKDAYS[r.weekday]} closing time`} />
              </div>
            )}
            {invalid.includes(r.weekday) && <p role="alert" className="w-full text-sm text-destructive">Closing time must be after opening time.</p>}
          </li>
        ))}
      </ul>
      <Button variant="hero" className="mt-4" disabled={save.isPending || invalid.length > 0} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save hours"}
      </Button>
    </div>
  );
}
