import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Salon = T["salons"]["Row"];
export type Service = T["services"]["Row"];
export type Staff = T["staff"]["Row"];
export type SalonHours = T["salon_hours"]["Row"];
export type Booking = T["bookings"]["Row"];
export type Profile = T["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type SalonStatus = Database["public"]["Enums"]["salon_status"];
export type SalonGender = Database["public"]["Enums"]["salon_gender"];

export const CITIES = ["Bengaluru", "Mumbai", "New Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Kochi"];
export const SERVICE_CATEGORIES = ["Hair", "Beard", "Colour", "Spa", "Skin"];
