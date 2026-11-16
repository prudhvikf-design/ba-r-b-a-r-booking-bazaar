import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salonSchema } from "@/components/owner/register-salon";
import { COVER_PRESETS } from "@/lib/salon-images";
import { CITIES, type Salon, type SalonGender } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

export function SalonProfileForm({ salon }: { salon: Salon }) {
  const qc = useQueryClient();
  const init = () => ({
    name: salon.name,
    tagline: salon.tagline ?? "",
    city: salon.city,
    area: salon.area,
    address_line: salon.address_line,
    pincode: salon.pincode ?? "",
    phone: salon.phone ?? "",
    gender: salon.gender as SalonGender,
    description: salon.description ?? "",
    amenities: salon.amenities.join(", "),
    cover_image: salon.cover_image ?? "demo:3",
  });
  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setForm(init()), [salon.id, salon.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMutation({
    mutationFn: async () => {
      const p = salonSchema.safeParse(form);
      if (!p.success) {
        const errs: Record<string, string> = {};
        p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
        setErrors(errs);
        throw new Error("Please fix the highlighted fields");
      }
      if (form.tagline.length > 160) throw new Error("Tagline must be under 160 characters");
      setErrors({});
      const amenities = form.amenities.split(",").map((a) => a.trim()).filter(Boolean).slice(0, 12).map((a) => a.slice(0, 30));
      const { error } = await supabase
        .from("salons")
        .update({
          name: p.data.name,
          tagline: form.tagline.trim() || null,
          city: p.data.city,
          area: p.data.area,
          address_line: p.data.address_line,
          pincode: p.data.pincode || null,
          phone: p.data.phone || null,
          gender: p.data.gender,
          description: p.data.description || null,
          amenities,
          cover_image: form.cover_image,
        })
        .eq("id", salon.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salon profile saved");
      qc.invalidateQueries({ queryKey: ["owner"] });
      qc.invalidateQueries({ queryKey: ["salon"] });
      qc.invalidateQueries({ queryKey: ["salons"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (k: keyof ReturnType<typeof init>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const err = (k: string) => errors[k] && <p role="alert" className="text-sm text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-name">Salon name</Label><Input id="sp-name" value={form.name} onChange={set("name")} />{err("name")}</div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-tagline">Tagline</Label><Input id="sp-tagline" value={form.tagline} onChange={set("tagline")} maxLength={160} placeholder="e.g. Precision fades & beard care" /></div>
      <div className="space-y-1.5">
        <Label htmlFor="sp-city">City</Label>
        <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
          <SelectTrigger id="sp-city"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from(new Set([...CITIES, form.city])).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="sp-area">Area</Label><Input id="sp-area" value={form.area} onChange={set("area")} />{err("area")}</div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-addr">Street address</Label><Input id="sp-addr" value={form.address_line} onChange={set("address_line")} />{err("address_line")}</div>
      <div className="space-y-1.5"><Label htmlFor="sp-pin">PIN code</Label><Input id="sp-pin" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")} />{err("pincode")}</div>
      <div className="space-y-1.5"><Label htmlFor="sp-phone">Phone</Label><Input id="sp-phone" type="tel" value={form.phone} onChange={set("phone")} />{err("phone")}</div>
      <div className="space-y-1.5">
        <Label htmlFor="sp-gender">Serves</Label>
        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as SalonGender })}>
          <SelectTrigger id="sp-gender"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unisex">Everyone (unisex)</SelectItem>
            <SelectItem value="men">Men</SelectItem>
            <SelectItem value="women">Women</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="sp-amen">Amenities (comma separated)</Label><Input id="sp-amen" value={form.amenities} onChange={set("amenities")} placeholder="AC, UPI, Parking" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-desc">About</Label><Textarea id="sp-desc" rows={4} value={form.description} onChange={set("description")} maxLength={2000} /></div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">Cover photo</legend>
        <div className="grid grid-cols-3 gap-3" role="radiogroup">
          {COVER_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={form.cover_image === p.key}
              aria-label={p.label}
              onClick={() => setForm({ ...form, cover_image: p.key })}
              className={`overflow-hidden rounded-lg border-2 transition ${form.cover_image === p.key ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={p.src} alt="" loading="lazy" width={1200} height={800} className="aspect-[3/2] w-full object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Uploading your own photos is coming soon.</p>
      </fieldset>
      <div className="sm:col-span-2"><Button type="submit" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save profile"}</Button></div>
    </form>
  );
}
