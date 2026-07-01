-- Extend get_link_with_merchant to expose voice bonus fields on the public pay page.
-- The function is SECURITY INVOKER — anon can call it; it only returns safe columns.
-- bonus_voice_mins and bonus_awarded are product-level read-only display data, safe
-- to expose publicly (they don't reveal PII or sensitive business data).

CREATE OR REPLACE FUNCTION public.get_link_with_merchant(p_slug text)
RETURNS TABLE(
  label text,
  amount integer,
  product_photo text,
  product_description text,
  merchant_name text,
  merchant_city text,
  bonus_voice_mins integer,
  bonus_awarded boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.label,
    l.amount,
    l.product_photo,
    l.product_description,
    m.business_name AS merchant_name,
    m.city AS merchant_city,
    p.bonus_voice_mins,
    COALESCE(p.bonus_awarded, false) AS bonus_awarded
  FROM public.payment_links l
  JOIN public.merchants m ON m.id = l.merchant_id
  LEFT JOIN public.products p ON p.id = l.product_id
  WHERE l.slug = p_slug AND l.is_active = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_link_with_merchant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_link_with_merchant(text) TO anon, authenticated, service_role;
