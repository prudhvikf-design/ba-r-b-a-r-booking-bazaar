import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="BaRbaR home">
      <span className="grid size-8 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-gold">
        <Scissors className="size-4 -rotate-45" aria-hidden="true" />
      </span>
      <span className="font-display text-2xl font-bold tracking-tight">
        Ba<span className="text-gold-gradient">R</span>ba<span className="text-gold-gradient">R</span>
      </span>
    </Link>
  );
}
