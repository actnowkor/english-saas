-- 경로: supabase/payments-schema.sql
-- 역할: 결제(Product/Payment) 및 이용권(Entitlement) 관련 스키마, 함수, RLS 정책 정의
-- 의존관계: public.users 테이블, pgcrypto 확장, Supabase RLS
-- 포함 함수: touch_updated_at(), refresh_user_pro_until(), can_start_session()

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  description text DEFAULT NULL,
  list_price_krw integer NOT NULL CHECK (list_price_krw > 0),
  launch_price_krw integer CHECK (launch_price_krw IS NULL OR launch_price_krw > 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE,
  provider text NOT NULL,
  provider_tx_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  amount_krw integer NOT NULL CHECK (amount_krw > 0),
  paid_at timestamptz,
  canceled_at timestamptz,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id text REFERENCES public.products(id) ON UPDATE CASCADE,
  payment_id uuid UNIQUE REFERENCES public.payments(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL CHECK (end_at > start_at),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_touch_updated_at ON public.products;
CREATE TRIGGER trg_products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_payments_touch_updated_at ON public.payments;
CREATE TRIGGER trg_payments_touch_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_entitlements_touch_updated_at ON public.entitlements;
CREATE TRIGGER trg_entitlements_touch_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_user_pro_until()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid := COALESCE(NEW.user_id, OLD.user_id);
  v_latest timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT MAX(end_at)
  INTO v_latest
  FROM public.entitlements
  WHERE user_id = v_user_id
    AND is_active = true
    AND end_at > now();

  UPDATE public.users
  SET pro_until = v_latest
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_entitlements_refresh_pro_until ON public.entitlements;
CREATE TRIGGER trg_entitlements_refresh_pro_until
  AFTER INSERT OR UPDATE OR DELETE ON public.entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_user_pro_until();

CREATE OR REPLACE FUNCTION public.can_start_session(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_completed_today integer := 0;
  v_pro_until timestamptz := NULL;
  v_has_active boolean := false;
  v_can_start boolean := false;
  v_reason text := 'NO_FREE_LEFT';
  v_daily_free_limit constant integer := 1;
BEGIN
  SELECT COUNT(*) INTO v_completed_today
  FROM public.sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND (timezone('Asia/Seoul', ended_at))::date = v_today;

  SELECT pro_until INTO v_pro_until FROM public.users WHERE id = p_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements
    WHERE user_id = p_user_id
      AND is_active = true
      AND start_at <= now()
      AND end_at > now()
  ) INTO v_has_active;

  IF v_has_active OR (v_pro_until IS NOT NULL AND v_pro_until > now()) THEN
    v_can_start := true;
    v_reason := 'OK_WITH_PRO';
  ELSIF v_completed_today < v_daily_free_limit THEN
    v_can_start := true;
    v_reason := 'OK_WITH_FREE';
  END IF;

  RETURN jsonb_build_object(
    'can_start', v_can_start,
    'reason', v_reason,
    'free_sessions_used_today', v_completed_today,
    'pro_until', v_pro_until
  );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON public.entitlements(user_id) WHERE is_active = true;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_active ON public.products;
CREATE POLICY products_select_active
  ON public.products
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS products_service_all ON public.products;
CREATE POLICY products_service_all
  ON public.products
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payments_service_all ON public.payments;
CREATE POLICY payments_service_all
  ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS payment_events_select_own ON public.payment_events;
CREATE POLICY payment_events_select_own
  ON public.payment_events
  FOR SELECT
  USING (auth.uid() = (
    SELECT user_id FROM public.payments WHERE id = payment_id
  ));

DROP POLICY IF EXISTS payment_events_service_all ON public.payment_events;
CREATE POLICY payment_events_service_all
  ON public.payment_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS entitlements_select_own ON public.entitlements;
CREATE POLICY entitlements_select_own
  ON public.entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS entitlements_service_all ON public.entitlements;
CREATE POLICY entitlements_service_all
  ON public.entitlements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
