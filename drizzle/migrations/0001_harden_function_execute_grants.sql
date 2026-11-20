REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.salons_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_salon(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_customer_of_my_salon(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_salon(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_customer_of_my_salon(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.salon_visible(uuid) TO anon, authenticated, service_role;