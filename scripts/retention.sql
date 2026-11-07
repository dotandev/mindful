WITH firsts AS (
  SELECT install_id, MIN(day) AS cohort_day
  FROM public.active_days
  GROUP BY install_id
),
cohort_platform AS (
  SELECT f.install_id, f.cohort_day, a.platform
  FROM firsts f
  JOIN public.active_days a
    ON a.install_id = f.install_id AND a.day = f.cohort_day
),
returns AS (
  SELECT
    c.install_id,
    c.cohort_day,
    c.platform,
    BOOL_OR(a.day = c.cohort_day + 1) AS d1,
    BOOL_OR(a.day = c.cohort_day + 3) AS d3,
    BOOL_OR(a.day = c.cohort_day + 7) AS d7
  FROM cohort_platform c
  JOIN public.active_days a ON a.install_id = c.install_id
  GROUP BY c.install_id, c.cohort_day, c.platform
)
SELECT
  cohort_day,
  platform,
  COUNT(*) AS installs,
  COUNT(*) FILTER (WHERE d1) AS d1_returned,
  COUNT(*) FILTER (WHERE d3) AS d3_returned,
  COUNT(*) FILTER (WHERE d7) AS d7_returned,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d1) / COUNT(*), 1) AS d1_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d3) / COUNT(*), 1) AS d3_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d7) / COUNT(*), 1) AS d7_pct,
  cohort_day + 7 < CURRENT_DATE AS d7_window_closed
FROM returns
GROUP BY cohort_day, platform
ORDER BY cohort_day DESC, platform;
