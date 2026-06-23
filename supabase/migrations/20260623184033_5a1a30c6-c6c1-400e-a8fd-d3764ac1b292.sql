CREATE TABLE IF NOT EXISTS public.phone_users (
  phone text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_users TO service_role;
ALTER TABLE public.phone_users ENABLE ROW LEVEL SECURITY;
-- No public policies: only service_role (edge functions) reads/writes.