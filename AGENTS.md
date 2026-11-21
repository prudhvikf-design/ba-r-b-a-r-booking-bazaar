<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (BaRbaR)

- All booking writes (create, reschedule, cancel, status change) go through SECURITY DEFINER SQL functions; `bookings` has no INSERT/UPDATE/DELETE policies. Why: slot, hours, overlap and ownership checks must be enforced server-side in one place.
- `_resolve_booking_slot` is the single validator for new/rescheduled times and refuses salons that are not active or are flagged `is_demo`. Why: demo listings must never take real bookings; `get_available_slots` may still show preview times.
- Protected salon fields (status, owner, slug, rating, review count, demo flag) are guarded by the `salons_guard` trigger; only admins may change them. Why: owners must not self-approve or alter trust signals.
- Roles live only in `user_roles`, changed only via `admin_set_role` (admin-checked). Why: prevent privilege escalation.
- Admin UI access is verified by the `verifyAdminAccess` server function (bearer-validated, DB role check) on `/admin/login` and `/admin`; the first admin is granted once by the owner with a direct database insert, never via app code. Why: no client-trusted roles and no public self-assignment path.
- Money is stored as integer paise and times are interpreted in Asia/Kolkata. Why: avoid float rounding and timezone drift.
- Code must satisfy the strict tsconfig (`exactOptionalPropertyTypes`, bracket access on index signatures); omit optional RPC args with conditional spreads instead of passing `undefined`.
