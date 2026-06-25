-- Remove anonymous SELECT on merchants table. Public payment-link lookups
-- use the SECURITY DEFINER function public.get_link_with_merchant which
-- exposes only safe columns (business_name, city).
DROP POLICY IF EXISTS merch_pub_lookup ON public.merchants;
REVOKE SELECT ON public.merchants FROM anon;
REVOKE SELECT (id, business_name, city) ON public.merchants FROM anon;