import pathlib
import re

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/supabase/payments-schema.sql")
text = path.read_text(encoding="utf-8")
pattern = re.compile(r"CREATE OR REPLACE FUNCTION public.refresh_user_pro_until\(p_user_id uuid\).*?EXECUTE FUNCTION public.refresh_user_pro_until\(COALESCE\(NEW.user_id, OLD.user_id\)\);", re.S)
replacement = """CREATE OR REPLACE FUNCTION public.refresh_user_pro_until()
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
  EXECUTE FUNCTION public.refresh_user_pro_until();"""
new_text, count = pattern.subn(replacement, text)
if count == 0:
  raise SystemExit("refresh_user_pro_until block not found")
path.write_text(new_text, encoding="utf-8")
