-- Rename gen_duka_id() to produce PK- prefixed IDs going forward.
-- Existing merchants keep their DY- IDs — we do not update historical data.
-- New merchants registered after this migration get PK-XXXXX format.
--
-- The sequence (duka_id_seq) is reused; only the prefix in the function changes.

CREATE OR REPLACE FUNCTION public.gen_duka_id()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'PK-' || LPAD(nextval('public.duka_id_seq')::text, 5, '0');
$$;
