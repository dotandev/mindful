-- The owner-only policies called auth.uid() once per row. Wrapping it in a
-- sub-select lets Postgres evaluate it once per statement (an "init plan"),
-- which is what InsForge's advisor asks for. Who may see or change what is
-- unchanged: each policy still compares the same column with the signed-in
-- user's id, for the same role and command.

ALTER POLICY own_circles_select ON public.circles USING (owner_id = (SELECT auth.uid()));
ALTER POLICY own_circles_insert ON public.circles WITH CHECK (owner_id = (SELECT auth.uid()));
ALTER POLICY own_circles_update ON public.circles USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
ALTER POLICY own_circles_delete ON public.circles USING (owner_id = (SELECT auth.uid()));

ALTER POLICY own_journal_select ON public.journal_entries USING (user_id = (SELECT auth.uid()));
ALTER POLICY own_journal_insert ON public.journal_entries WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_journal_update ON public.journal_entries USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_journal_delete ON public.journal_entries USING (user_id = (SELECT auth.uid()));

ALTER POLICY own_progress_select ON public.progress USING (user_id = (SELECT auth.uid()));
ALTER POLICY own_progress_insert ON public.progress WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_progress_update ON public.progress USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_progress_delete ON public.progress USING (user_id = (SELECT auth.uid()));

ALTER POLICY own_push_select ON public.push_subscriptions USING (user_id = (SELECT auth.uid()));
ALTER POLICY own_push_insert ON public.push_subscriptions WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_push_update ON public.push_subscriptions USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY own_push_delete ON public.push_subscriptions USING (user_id = (SELECT auth.uid()));
