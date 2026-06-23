-- ============================================================
-- FIX: transactions_public_readable + transactions_realtime_public_broadcast
-- ============================================================
DROP POLICY IF EXISTS pub_status_r ON public.transactions;
REVOKE ALL ON public.transactions FROM anon;
-- anon no longer touches transactions directly; payment-status polling
-- will go through a backend edge function using the service role.

-- ============================================================
-- FIX: SUPA_anon_security_definer_function_executable
--      SUPA_authenticated_security_definer_function_executable
-- ============================================================

-- cur_mid: SECURITY INVOKER. Authenticated users read their own merchants
-- row via the per-user 'own' policy below, so this still works.
CREATE OR REPLACE FUNCTION public.cur_mid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$ SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1; $$;

REVOKE EXECUTE ON FUNCTION public.cur_mid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cur_mid() FROM anon;
GRANT EXECUTE ON FUNCTION public.cur_mid() TO authenticated, service_role;

-- get_link_with_merchant: SECURITY INVOKER. anon RLS access on
-- payment_links (pub_r) + new narrow merchants policy makes the join work
-- without elevated privileges.
CREATE OR REPLACE FUNCTION public.get_link_with_merchant(p_slug text)
RETURNS TABLE(label text, amount integer, product_photo text, product_description text, merchant_name text, merchant_city text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT l.label, l.amount, l.product_photo, l.product_description,
         m.business_name AS merchant_name, m.city AS merchant_city
  FROM public.payment_links l
  JOIN public.merchants m ON m.id = l.merchant_id
  WHERE l.slug = p_slug AND l.is_active = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_link_with_merchant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_link_with_merchant(text) TO anon, authenticated, service_role;

-- Lock down anon column access on merchants: only safe public columns,
-- only for rows referenced by an active payment link.
REVOKE ALL ON public.merchants FROM anon;
GRANT SELECT (id, business_name, city) ON public.merchants TO anon;

CREATE POLICY merch_pub_lookup ON public.merchants
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.payment_links pl
    WHERE pl.merchant_id = merchants.id AND pl.is_active
  ));

-- Lock down anon table-level perms on payment_links to SELECT only.
REVOKE ALL ON public.payment_links FROM anon;
GRANT SELECT ON public.payment_links TO anon;

-- ============================================================
-- FIX: merchants_staff_phones_credit_score
-- Split the 'own' ALL policy into explicit per-action policies scoped to
-- authenticated, with an extra auth.uid() IS NOT NULL guard. This makes
-- the audit explicit and ensures no path for authenticated users to read
-- another merchant's sensitive fields (staff_phones, credit_score, plan).
-- ============================================================
DROP POLICY IF EXISTS own ON public.merchants;

CREATE POLICY merch_own_select ON public.merchants
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY merch_own_insert ON public.merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY merch_own_update ON public.merchants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY merch_own_delete ON public.merchants
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());