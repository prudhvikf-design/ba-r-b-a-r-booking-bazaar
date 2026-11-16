import { Link } from "@tanstack/react-router";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Discover salons and barbers across India and book your chair in seconds.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Explore</span>
          <Link to="/salons" className="text-muted-foreground hover:text-foreground">Find a salon</Link>
          <Link to="/owner" className="text-muted-foreground hover:text-foreground">List your salon</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="text-muted-foreground hover:text-foreground">Create an account</Link>
        </nav>
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">About this preview</p>
          <p className="mt-2">
            Listings marked “Demo listing” are sample data, not real businesses. Payment is at the salon; online
            payments are coming soon.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BaRbaR. Made for India.
      </div>
    </footer>
  );
}
