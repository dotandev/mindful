-- The reminder cron POSTs to whatever a web row holds in `endpoint`, so a web
-- endpoint must at least be an https URL. (The function also checks the host
-- against the known push services.) Added NOT VALID first so the table is not
-- locked for a scan, then validated; VALIDATE fails if an existing web row
-- has a non-https endpoint. Check before applying:
--   SELECT endpoint FROM public.push_subscriptions
--   WHERE platform = 'web' AND endpoint !~ '^https://';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_web_https_check'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_web_https_check
      CHECK (platform <> 'web' OR endpoint ~ '^https://') NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.push_subscriptions
  VALIDATE CONSTRAINT push_subscriptions_web_https_check;
