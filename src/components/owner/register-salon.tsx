import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, type SalonGender } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

export const salonSchema = z.object({
  name: z.string().trim().min(2, "Enter the salon name").max(120),
  city: z.string().trim().min(2, "Choose a city").max(60),
  area: z.string().trim().min(2, "Enter the area / locality").max(80),
  address_line: z.string().trim().min(3, "Enter the street address").max(250),
  pincode: z.string().trim().refine((v) => v === "" || /^[1-9]\d{5}$/.test(v), "Enter a valid 6-digit PIN code"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(\+91[\s-]?)?[6-9]\d{9}$|^0\d{2,4}[\s-]?\d{6,8}$/.test(v.replace(/\s/g, "")), "Enter a valid Indian phone number"),
  gender: z.enum(["unisex", "men", "women"]),
  description: z.string().trim().max(2000),
});

export function RegisterSalonForm({ onCreated }: { onCreated?: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", city: "", area: "", address_line: "", pincode: "", phone: "", gender: "unisex" as SalonGender, description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const m = useMutation({
    mutationFn: async (v: z.infer<typeof salonSchema>) => {
      const { error } = await supabase.rpc("register_salon", {
        _name: v.name,
        _city: v.city,
        _area: v.area,
        _address_line: v.address_line,
        _phone: v.phone || undefined,
        _gender: v.gender,
        _description: v.description || undefined,
        _pincode: v.pincode || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salon registered! Add services and staff while an admin reviews it.");
      qc.invalidateQueries({ queryKey: ["owner"] });
      qc.invalidateQueries({ queryKey: ["my-roles"] });
      onCreated?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = salonSchema.safeParse(form);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      return setErrors(errs);
    }
    setErrors({});
    m.mutate(p.data);
  };

  const F = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors[id] && <p role="alert" className="text-sm text-destructive">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">{F({ id: "name", label: "Salon name", children: <Input id="name" value={form.name} onChange={set("name")} placeholder="e.g. Sharp Edge Barbers" /> })}</div>
      {F({
        id: "city",
        label: "City",
        children: (
          <Select value={form.city || undefined} onValueChange={(v) => setForm({ ...form, city: v })}>
            <SelectTrigger id="city"><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        ),
      })}
      {F({ id: "area", label: "Area / locality", children: <Input id="area" value={form.area} onChange={set("area")} placeholder="e.g. Jayanagar" /> })}
      <div className="sm:col-span-2">{F({ id: "address_line", label: "Street address", children: <Input id="address_line" value={form.address_line} onChange={set("address_line")} placeholder="Shop no., building, street" /> })}</div>
      {F({ id: "pincode", label: "PIN code", children: <Input id="pincode" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")} placeholder="560011" /> })}
      {F({ id: "phone", label: "Salon phone", children: <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" /> })}
      {F({
        id: "gender",
        label: "Serves",
        children: (
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as SalonGender })}>
            <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unisex">Everyone (unisex)</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
            </SelectContent>
          </Select>
        ),
      })}
      <div className="sm:col-span-2">{F({ id: "description", label: "About the salon (optional)", children: <Textarea id="description" value={form.description} onChange={set("description")} maxLength={2000} /> })}</div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="hero" size="lg" disabled={m.isPending}>{m.isPending ? "Registering…" : "Register salon"}</Button>
        <p className="mt-2 text-xs text-muted-foreground">New salons go live after a quick admin review. Default hours are 10 am – 8 pm (Sun till 6 pm) — you can change them next.</p>
      </div>
    </form>
  );
}
