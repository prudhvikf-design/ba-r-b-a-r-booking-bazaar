import salon1 from "@/assets/salon-1.jpg";
import salon2 from "@/assets/salon-2.jpg";
import salon3 from "@/assets/salon-3.jpg";

export const COVER_PRESETS = [
  { key: "demo:1", label: "Dark barber lounge", src: salon1 },
  { key: "demo:2", label: "Bright unisex studio", src: salon2 },
  { key: "demo:3", label: "Warm family salon", src: salon3 },
] as const;

export function resolveCover(cover: string | null | undefined): string {
  const preset = COVER_PRESETS.find((p) => p.key === cover);
  if (preset) return preset.src;
  if (cover && /^https:\/\//.test(cover)) return cover;
  return salon3;
}
