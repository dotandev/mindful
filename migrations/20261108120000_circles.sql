-- Circles: a named group (friends, a study group) reading one surah together.
-- Holds only the name, the surah and an optional focus verse; reflections and
-- journals never touch this table. The owner reads and edits their own rows;
-- anyone holding a link reads exactly one circle through get_circle(), so the
-- table itself is never listable by anon.
-- Code alphabet: a-z and 2-9 without i, l, o (and no 0/1), so a code read
-- aloud or copied by hand stays unambiguous.

CREATE TABLE public.circles (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-hjkmnp-z2-9]{6}$'),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  surah INT NOT NULL CHECK (surah BETWEEN 1 AND 114),
  verse INT CHECK (verse BETWEEN 1 AND 286),
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX circles_owner ON public.circles (owner_id);

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.circles FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;

CREATE POLICY "own_circles_select" ON public.circles FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own_circles_insert" ON public.circles FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own_circles_update" ON public.circles FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own_circles_delete" ON public.circles FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TRIGGER circles_updated_at BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE OR REPLACE FUNCTION public.get_circle(p_code TEXT)
RETURNS TABLE (code TEXT, name TEXT, surah INT, verse INT, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.name, c.surah, c.verse, c.updated_at
  FROM public.circles c
  WHERE c.code = p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_circle(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_circle(TEXT) TO anon, authenticated;

ALTER TABLE public.active_days
  ADD COLUMN circle_code TEXT CHECK (circle_code ~ '^[a-hjkmnp-z2-9]{6}$');

-- A code is the circle's public link and the key reflections count against,
-- so it never changes once created.
CREATE OR REPLACE FUNCTION public.circles_lock_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'circle code cannot change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER circles_lock_code BEFORE UPDATE OF code ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.circles_lock_code();

-- Circle reflections: one row per install, circle and local day on which a
-- journal reflection was kept while in the circle. Only the install id, the
-- code and the date are sent; no text, no verse. Write-only for clients; the
-- only read is the aggregate circle_week_count(), shown when it is 2 or more.
CREATE TABLE public.circle_reflections (
  install_id UUID NOT NULL,
  circle_code TEXT NOT NULL REFERENCES public.circles(code) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (install_id, circle_code, day)
);
CREATE INDEX circle_reflections_code_day ON public.circle_reflections (circle_code, day);

ALTER TABLE public.circle_reflections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.circle_reflections FROM anon, authenticated, PUBLIC;
GRANT INSERT ON public.circle_reflections TO anon, authenticated;

-- A day within one of the server's date covers every time zone; anything else
-- (a skewed clock, a forged far-future day) would sit in the count for good.
CREATE POLICY circle_reflections_insert ON public.circle_reflections
  FOR INSERT TO anon, authenticated
  WITH CHECK (day BETWEEN current_date - 1 AND current_date + 1);

-- Distinct installs with a reflection in the last 7 days. `day` is the
-- client's local date while current_date is the server's (UTC), so the window
-- edge can be off by a day for far-from-UTC zones; fine for a calm count.
CREATE OR REPLACE FUNCTION public.circle_week_count(p_code TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT r.install_id)::INTEGER
  FROM public.circle_reflections r
  WHERE r.circle_code = p_code
    AND r.day BETWEEN current_date - 6 AND current_date + 1;
$$;

REVOKE ALL ON FUNCTION public.circle_week_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.circle_week_count(TEXT) TO anon, authenticated;
