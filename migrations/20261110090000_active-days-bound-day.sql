-- active_days decides the launch retention bar, but its insert policy let an
-- anonymous client write any date. Bound `day` the same way
-- circle_reflections does: within one day of the server's date, which covers
-- every time zone. Still insert-only with no select. Existing rows are not
-- rechecked (a policy only applies to new inserts).

ALTER POLICY active_days_insert ON public.active_days
  WITH CHECK (day BETWEEN current_date - 1 AND current_date + 1);
