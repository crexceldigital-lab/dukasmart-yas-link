CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX phone_otps_phone_idx ON public.phone_otps(phone);
CREATE INDEX phone_otps_expires_idx ON public.phone_otps(expires_at);

GRANT ALL ON public.phone_otps TO service_role;

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (used by edge functions) can access.

CREATE TRIGGER phone_otps_touch_upd
  BEFORE UPDATE ON public.phone_otps
  FOR EACH ROW EXECUTE FUNCTION public.touch_upd();