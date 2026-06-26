
-- 1. Lock down cur_mid explicitly as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.cur_mid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1; $$;

-- 2. Drop the broad public SELECT policy on payment_links.
-- Public buyers will read via get_link_with_merchant() (SECURITY DEFINER, slug-scoped, safe columns).
DROP POLICY IF EXISTS "pub_r" ON public.payment_links;

-- Make the slug lookup work for anon/auth without table SELECT grant by promoting it to definer.
CREATE OR REPLACE FUNCTION public.get_link_with_merchant(p_slug text)
RETURNS TABLE(label text, amount integer, product_photo text, product_description text, merchant_name text, merchant_city text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.label, l.amount, l.product_photo, l.product_description,
         m.business_name AS merchant_name, m.city AS merchant_city
  FROM public.payment_links l
  JOIN public.merchants m ON m.id = l.merchant_id
  WHERE l.slug = p_slug AND l.is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_link_with_merchant(text) TO anon, authenticated;

-- 3. Harden transactions RLS: restrict to authenticated merchants who actually own the row.
DROP POLICY IF EXISTS "own" ON public.transactions;
CREATE POLICY "tx_own_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND merchant_id IS NOT NULL
    AND merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "tx_own_modify" ON public.transactions
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND merchant_id IS NOT NULL
    AND merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND merchant_id IS NOT NULL
    AND merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );
