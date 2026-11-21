import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  Shield,
  Store,
  Users,
  UserRound,
} from "lucide-react";
import { verifyAdminAccess } from "@/lib/admin.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdminBookings,
  AdminOverview,
  AdminSalons,
  AdminServices,
  AdminUsers,
  AdminStaff,
} from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    // Server-side check: the bearer token is validated and the admin role is read
    // from the database. Every admin action is also enforced in the database.
    const result = await verifyAdminAccess().catch(() => ({ isAdmin: false }));
    if (!result.isAdmin) throw redirect({ to: "/admin/login" });
  },
  head: () => ({
    meta: [
      { title: "Admin — BaRbaR" },
      {
        name: "description",
        content: "BaRbaR administration: users, salons, services and bookings.",
      },
      { property: "og:title", content: "Admin — BaRbaR" },
      { property: "og:description", content: "BaRbaR administration dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="container-page py-8">
      <p className="flex items-center gap-2 text-sm text-primary">
        <Shield className="size-4" aria-hidden="true" /> Admin
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Control room</h1>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-auto">
          <TabsTrigger value="overview">
            <LayoutDashboard className="size-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="size-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="salons">
            <Store className="size-4" /> Salons
          </TabsTrigger>
          <TabsTrigger value="services">
            <Scissors className="size-4" /> Services
          </TabsTrigger>
          <TabsTrigger value="staff">
            <UserRound className="size-4" /> Barbers
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <CalendarDays className="size-4" /> Bookings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="salons">
          <AdminSalons />
        </TabsContent>
        <TabsContent value="services">
          <AdminServices />
        </TabsContent>
        <TabsContent value="staff">
          <AdminStaff />
        </TabsContent>
        <TabsContent value="bookings">
          <AdminBookings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
