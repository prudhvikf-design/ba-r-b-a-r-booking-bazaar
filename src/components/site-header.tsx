import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, LogOut, Menu, Search, Shield, Store, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";

type NavItem = { to: "/salons" | "/home" | "/bookings" | "/owner" | "/admin" | "/profile"; label: string; icon: typeof Search };

export function SiteHeader() {
  const { user, loading, hasRole, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = [{ to: "/salons", label: "Explore", icon: Search }];
  if (user) {
    items.push({ to: "/home", label: "Home", icon: LayoutDashboard });
    items.push({ to: "/bookings", label: "My bookings", icon: CalendarDays });
    items.push({ to: "/owner", label: hasRole("salon_owner") ? "My salon" : "List your salon", icon: Store });
    if (hasRole("admin")) items.push({ to: "/admin", label: "Admin", icon: Shield });
  }

  const name = (user?.user_metadata?.["full_name"] as string | undefined) ?? user?.email ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {!loading && !user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Register</Link>
              </Button>
            </div>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden size-9 place-items-center rounded-full border border-primary/50 bg-accent text-sm font-semibold text-accent-foreground md:grid"
                  aria-label="Account menu"
                >
                  {initials(name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><User /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bookings"><CalendarDays /> My bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left font-display text-2xl">Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1 px-4">
                {items.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 text-base ${pathname.startsWith(it.to) ? "bg-accent text-primary" : "hover:bg-muted"}`}
                  >
                    <it.icon className="size-4" aria-hidden="true" /> {it.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-3 text-base hover:bg-muted">
                      <User className="size-4" aria-hidden="true" /> Profile
                    </Link>
                    <button
                      onClick={() => { setOpen(false); void signOut(); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-left text-base hover:bg-muted"
                    >
                      <LogOut className="size-4" aria-hidden="true" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="mt-4 flex flex-col gap-2">
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                    </Button>
                    <Button asChild variant="hero" onClick={() => setOpen(false)}>
                      <Link to="/auth" search={{ mode: "signup" }}>Create account</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
