GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;
GRANT SELECT ON public.merchants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restocks TO authenticated;
GRANT ALL ON public.restocks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT ALL ON public.payment_links TO service_role;
GRANT SELECT ON public.payment_links TO anon;