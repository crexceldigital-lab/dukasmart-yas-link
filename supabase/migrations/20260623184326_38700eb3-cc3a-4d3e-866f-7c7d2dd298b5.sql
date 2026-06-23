GRANT EXECUTE ON FUNCTION public.gen_duka_id() TO authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.duka_id_seq TO authenticated;