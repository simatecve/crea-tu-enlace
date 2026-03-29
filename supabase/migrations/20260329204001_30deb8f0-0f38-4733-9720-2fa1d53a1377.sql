
-- Index for visitor_id lookups (used by analytics RPCs)
CREATE INDEX IF NOT EXISTS idx_ae_visitor_id ON analytics_events(landing_page_id, visitor_id, event_type);

-- Optimize get_cloud_usage: use approximate counts and avoid full table scans
CREATE OR REPLACE FUNCTION public.get_cloud_usage()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result json;
  _total_events bigint;
  _total_agg_rows bigint;
  _events_size bigint;
  _agg_size bigint;
  _daily json;
  _per_page json;
BEGIN
  -- Use approximate row counts from pg_stat instead of COUNT(*)
  SELECT COALESCE(n_live_tup, 0) INTO _total_events
  FROM pg_stat_user_tables WHERE relname = 'analytics_events';

  SELECT COALESCE(n_live_tup, 0) INTO _total_agg_rows
  FROM pg_stat_user_tables WHERE relname = 'analytics_daily_agg';

  SELECT pg_total_relation_size('analytics_events') INTO _events_size;
  SELECT pg_total_relation_size('analytics_daily_agg') INTO _agg_size;

  -- Events per day last 7 days (uses existing index)
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) INTO _daily
  FROM (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS count
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
  ) t;

  -- Top pages by event count (last 30 days)
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.events DESC), '[]'::json) INTO _per_page
  FROM (
    SELECT lp.title AS name, lp.slug, COUNT(ae.id) AS events
    FROM analytics_events ae
    JOIN landing_pages lp ON lp.id = ae.landing_page_id
    WHERE lp.user_id = auth.uid() AND ae.created_at >= now() - interval '30 days'
    GROUP BY lp.id, lp.title, lp.slug
    ORDER BY events DESC
    LIMIT 10
  ) t;

  _result := json_build_object(
    'total_raw_events', _total_events,
    'total_agg_rows', _total_agg_rows,
    'raw_size_bytes', _events_size,
    'agg_size_bytes', _agg_size,
    'total_size_bytes', _events_size + _agg_size,
    'daily_events', _daily,
    'per_page', _per_page
  );

  RETURN _result;
END;
$function$;
