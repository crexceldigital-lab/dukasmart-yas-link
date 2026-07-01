-- ─────────────────────────────────────────────────────────────
-- POKEA — new features migration
-- 1. Bulk SMS credits on merchants
-- 2. Mjasiriamali Box plan tier
-- 3. Stock value (computed, no schema change needed)
-- 4. Voice bonus per product
-- ─────────────────────────────────────────────────────────────

-- 1. Bulk SMS credits
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS sms_credits integer NOT NULL DEFAULT 0;

-- 2. Mjasiriamali Box plan
-- Extend the plan_type enum with the new tier
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'mjasiriamali'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'plan_type')
  ) THEN
    ALTER TYPE public.plan_type ADD VALUE 'mjasiriamali';
  END IF;
END $$;

-- 4. Voice bonus per product
-- bonus_voice_mins: if set (e.g. 3), the FIRST confirmed buyer of this product
-- gets a 3-min voice call credit. NULL = no bonus on this product.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bonus_voice_mins integer DEFAULT NULL;

-- Track whether the voice bonus has already been awarded for this product
-- (only the first buyer gets it, so we lock it after first confirmed tx)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bonus_awarded boolean NOT NULL DEFAULT false;

-- SMS transactions log (for audit trail of bulk SMS sends)
CREATE TABLE IF NOT EXISTS public.sms_sends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  message      text NOT NULL,
  recipient_count integer NOT NULL,
  credits_used integer NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_sends ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sms_sends TO service_role;
CREATE POLICY "owner can view sms sends"
  ON public.sms_sends FOR SELECT
  USING (merchant_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS sms_sends_merchant_idx ON public.sms_sends(merchant_id);
