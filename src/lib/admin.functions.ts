import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side admin verification. The bearer token is validated by
 * requireSupabaseAuth, then the role is checked in the database as that user.
 * Never trust a client-side role value.
 */
export const verifyAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error("Could not verify administrator access.");
    return { isAdmin: data === true };
  });
