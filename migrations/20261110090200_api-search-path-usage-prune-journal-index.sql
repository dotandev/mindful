-- Small database items.

-- 1. Pin search_path on the public-API functions so a caller's search_path
--    cannot change which objects they resolve.
ALTER FUNCTION public.issue_api_key(TEXT, TEXT, TEXT, TEXT, TEXT)
  SET search_path = public;
ALTER FUNCTION public.save_api_key_verification(
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) SET search_path = public;

-- 2. api_hit: same signature, same result (increments and returns the new
--    count), now with search_path pinned and old counters pruned. The prune
--    runs only on a bucket's first hit of a day (count = 1), so the hot path
--    stays a single upsert. Counters are only ever read for the current day;
--    7 days is kept for looking back by hand.
CREATE OR REPLACE FUNCTION public.api_hit(p_bucket TEXT, p_day DATE)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  INSERT INTO public.api_usage (bucket, day, count)
  VALUES (p_bucket, p_day, 1)
  ON CONFLICT (bucket, day)
  DO UPDATE SET count = public.api_usage.count + 1
  RETURNING count INTO n;

  IF n = 1 THEN
    DELETE FROM public.api_usage WHERE day < current_date - 7;
  END IF;

  RETURN n;
END;
$$;

-- CREATE OR REPLACE keeps the existing privileges; restated so the file
-- stands on its own.
REVOKE ALL ON FUNCTION public.api_hit(TEXT, DATE)
  FROM anon, authenticated, PUBLIC;

-- 3. The sync pull reads a user's entries newest first
--    (packages/core/sync/engine.ts). The (user_id, updated_at) index stays.
CREATE INDEX IF NOT EXISTS journal_entries_user_created
  ON public.journal_entries (user_id, created_at DESC);
