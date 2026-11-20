import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearch } from "@/lib/format";
import type { Salon, SalonHours, Service, Staff, SalonGender } from "@/lib/types";

export type SalonListItem = Salon & {
  services: Pick<Service, "price_paise" | "category" | "is_active">[];
};

export interface SalonSearch {
  q?: string | undefined;
  city?: string | undefined;
  gender?: SalonGender | undefined;
  category?: string | undefined;
  sort?: "rating" | "price" | "name" | undefined;
}

export const salonSearchQuery = (s: SalonSearch) =>
  queryOptions({
    queryKey: ["salons", "search", s],
    queryFn: async (): Promise<SalonListItem[]> => {
      let query = supabase
        .from("salons")
        .select("*, services(price_paise, category, is_active)")
        .eq("status", "active")
        .limit(100);
      if (s.city) query = query.ilike("city", s.city);
      if (s.gender) query = query.in("gender", s.gender === "unisex" ? ["unisex"] : [s.gender, "unisex"]);
      const q = s.q ? sanitizeSearch(s.q) : "";
      if (q) query = query.or(`name.ilike.%${q}%,area.ilike.%${q}%,city.ilike.%${q}%,tagline.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []) as SalonListItem[];
      if (s.category) {
        rows = rows.filter((r) => r.services.some((sv) => sv.is_active && sv.category === s.category));
      }
      const minPrice = (r: SalonListItem) =>
        Math.min(...r.services.filter((x) => x.is_active).map((x) => x.price_paise), Number.MAX_SAFE_INTEGER);
      if (s.sort === "price") rows.sort((a, b) => minPrice(a) - minPrice(b));
      else if (s.sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
      else rows.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
      return rows;
    },
  });

export const featuredSalonsQuery = () =>
  queryOptions({
    queryKey: ["salons", "featured"],
    queryFn: async (): Promise<SalonListItem[]> => {
      const { data, error } = await supabase
        .from("salons")
        .select("*, services(price_paise, category, is_active)")
        .eq("status", "active")
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as SalonListItem[];
    },
  });

export const citiesQuery = () =>
  queryOptions({
    queryKey: ["salons", "cities"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("salons").select("city").eq("status", "active");
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.city))).sort();
    },
  });

export type SalonDetail = Salon & { salon_hours: SalonHours[]; services: Service[]; staff: Staff[] };

export const salonBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["salon", slug],
    queryFn: async (): Promise<SalonDetail | null> => {
      const { data, error } = await supabase
        .from("salons")
        .select("*, salon_hours(*), services(*), staff(*)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const d = data as SalonDetail;
      d.services.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      d.salon_hours.sort((a, b) => a.weekday - b.weekday);
      d.staff.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return d;
    },
  });

export const slotsQuery = (salonId: string, serviceId: string | undefined, staffId: string | null, date: string) =>
  queryOptions({
    queryKey: ["slots", salonId, serviceId, staffId, date],
    enabled: !!serviceId,
    staleTime: 15_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("get_available_slots", {
        _salon_id: salonId,
        _service_id: serviceId!,
        _staff_id: staffId as string,
        _date: date,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });

export const BOOKING_SELECT =
  "*, salons(id, name, slug, area, city, address_line, phone, cover_image, is_demo), staff(id, name, title), services(id, name)";

export type BookingWithRefs = Awaited<ReturnType<typeof fetchMyBookings>>[number];

async function fetchMyBookings(userId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("customer_id", userId)
    .order("start_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export const myBookingsQuery = (userId: string) =>
  queryOptions({ queryKey: ["bookings", "mine", userId], queryFn: () => fetchMyBookings(userId) });

export const bookingQuery = (id: string) =>
  queryOptions({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const ownerSalonsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["owner", "salons", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
