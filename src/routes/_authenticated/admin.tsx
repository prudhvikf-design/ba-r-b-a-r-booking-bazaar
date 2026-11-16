import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Scissors, Shield, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBookings, AdminOverview, AdminSalons, AdminServices, AdminUsers } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    // UI gate only; every admin action is also enforced in the database.
    const userId = (context as { user?: { id: string } }).user?.id;
    if (!userId) throw redirect({ to: "/home" });
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!data) throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Admin — BaRbaR" },
      { name: "description", content: "BaRbaR administration: users, salons, services and bookings." },
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
      <p className="flex items-center gap-2 text-sm text-primary"><Shield className="size-4" aria-hidden="true" /> Admin</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Control room</h1>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="size-4" /> Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="size-4" /> Customers</TabsTrigger>
          <TabsTrigger value="salons"><Store className="size-4" /> Salons</TabsTrigger>
          <TabsTrigger value="services"><Scissors className="size-4" /> Services</TabsTrigger>
          <TabsTrigger value="bookings"><CalendarDays className="size-4" /> Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><AdminOverview /></TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="salons"><AdminSalons /></TabsContent>
        <TabsContent value="services"><AdminServices /></TabsContent>
        <TabsContent value="bookings"><AdminBookings /></TabsContent>
      </Tabs>
    </div>
  );
}
