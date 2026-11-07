-- Anonymous "active today" signal for Day-1/3/7 return: one row per install per
-- local day. No user id, no content. Clients may only insert; reads are admin
-- SQL only (scripts/retention.sql).

CREATE TABLE public.active_days (
  install_id UUID NOT NULL,
  day DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (install_id, day)
);

ALTER TABLE public.active_days ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.active_days FROM anon, authenticated, PUBLIC;
GRANT INSERT ON public.active_days TO anon, authenticated;

CREATE POLICY active_days_insert ON public.active_days
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
