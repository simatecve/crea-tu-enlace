
-- 1. Aggregation table for daily summaries
CREATE TABLE public.analytics_daily_agg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL,
  device text,
  browser text,
  country text,
  city text,
  referrer text,
  link_id uuid,
  event_count integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  UNIQUE(landing_page_id, event_date, event_type, device, browser, country, city, referrer, link_id)
);

ALTER TABLE public.analytics_daily_agg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own agg" ON public.analytics_daily_agg
  FOR SELECT TO authenticated
  USING (owns_landing_page(landing_page_id));

CREATE POLICY "Service role can manage agg" ON public.analytics_daily_agg
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Composite index on analytics_events
CREATE INDEX IF NOT EXISTS idx_ae_page_date_type ON public.analytics_events(landing_page_id, created_at, event_type);

-- 3. Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_ae_visitor_dedup ON public.analytics_events(landing_page_id, visitor_id, created_at DESC) WHERE event_type = 'visit';

-- 4. RPC: get_cloud_usage
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
  SELECT COUNT(*) INTO _total_events FROM analytics_events;
  SELECT COUNT(*) INTO _total_agg_rows FROM analytics_daily_agg;

  SELECT pg_total_relation_size('analytics_events') INTO _events_size;
  SELECT pg_total_relation_size('analytics_daily_agg') INTO _agg_size;

  -- Events per day last 7 days
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) INTO _daily
  FROM (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS count
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
  ) t;

  -- Top pages by event count
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

-- 5. Update get_analytics_summary to combine raw + agg
CREATE OR REPLACE FUNCTION public.get_analytics_summary(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result json;
  _cutoff timestamptz := now() - (_days || ' days')::interval;
  _cutoff_date date := (now() - (_days || ' days')::interval)::date;
  _raw_visits bigint; _raw_clicks bigint; _raw_countries text[];  _raw_unique bigint;
  _agg_visits bigint; _agg_clicks bigint; _agg_countries text[]; _agg_unique bigint;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN json_build_object('visits', 0, 'clicks', 0, 'countries', 0, 'ctr', 0, 'unique_visitors', 0);
  END IF;

  -- Raw events (recent)
  SELECT
    COALESCE(SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
    array_agg(DISTINCT CASE WHEN event_type = 'visit' THEN country END),
    COUNT(DISTINCT CASE WHEN event_type = 'visit' AND visitor_id IS NOT NULL THEN visitor_id END)
  INTO _raw_visits, _raw_clicks, _raw_countries, _raw_unique
  FROM analytics_events
  WHERE landing_page_id = _page_id AND created_at >= _cutoff;

  -- Aggregated events (historical)
  SELECT
    COALESCE(SUM(CASE WHEN event_type = 'visit' THEN event_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'click' THEN event_count ELSE 0 END), 0),
    array_agg(DISTINCT CASE WHEN event_type = 'visit' THEN country END),
    COALESCE(SUM(CASE WHEN event_type = 'visit' THEN unique_visitors ELSE 0 END), 0)
  INTO _agg_visits, _agg_clicks, _agg_countries, _agg_unique
  FROM analytics_daily_agg
  WHERE landing_page_id = _page_id AND event_date >= _cutoff_date;

  SELECT json_build_object(
    'visits', _raw_visits + _agg_visits,
    'clicks', _raw_clicks + _agg_clicks,
    'countries', (SELECT COUNT(DISTINCT v) FROM unnest(_raw_countries || _agg_countries) v WHERE v IS NOT NULL),
    'ctr', CASE WHEN (_raw_visits + _agg_visits) > 0
      THEN ROUND(((_raw_clicks + _agg_clicks)::numeric / (_raw_visits + _agg_visits)::numeric) * 100, 1)
      ELSE 0 END,
    'unique_visitors', _raw_unique + _agg_unique
  ) INTO _result;

  RETURN _result;
END;
$function$;

-- 6. Update get_analytics_daily to combine raw + agg
CREATE OR REPLACE FUNCTION public.get_analytics_daily(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result json;
  _cutoff timestamptz := now() - (_days || ' days')::interval;
  _cutoff_date date := (now() - (_days || ' days')::interval)::date;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) INTO _result
  FROM (
    SELECT day, SUM(visits) AS visits, SUM(clicks) AS clicks
    FROM (
      -- Raw events
      SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
        SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) AS visits,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
      FROM analytics_events
      WHERE landing_page_id = _page_id AND created_at >= _cutoff
      GROUP BY (created_at AT TIME ZONE 'UTC')::date
      UNION ALL
      -- Aggregated
      SELECT event_date AS day,
        SUM(CASE WHEN event_type = 'visit' THEN event_count ELSE 0 END) AS visits,
        SUM(CASE WHEN event_type = 'click' THEN event_count ELSE 0 END) AS clicks
      FROM analytics_daily_agg
      WHERE landing_page_id = _page_id AND event_date >= _cutoff_date
      GROUP BY event_date
    ) combined
    GROUP BY day
  ) t;

  RETURN _result;
END;
$function$;

-- 7. Update get_analytics_breakdowns to combine raw + agg
CREATE OR REPLACE FUNCTION public.get_analytics_breakdowns(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cutoff timestamptz := now() - (_days || ' days')::interval;
  _cutoff_date date := (now() - (_days || ' days')::interval)::date;
  _devices json;
  _browsers json;
  _countries json;
  _referrers json;
  _links json;
  _new_vs_returning json;
  _new_count bigint;
  _returning_count bigint;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN json_build_object('devices', '[]'::json, 'browsers', '[]'::json, 'countries', '[]'::json, 'referrers', '[]'::json, 'links', '[]'::json, 'new_vs_returning', '[]'::json);
  END IF;

  -- Devices (raw + agg)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _devices
  FROM (
    SELECT name, SUM(value) AS value FROM (
      SELECT COALESCE(device, 'Desconocido') AS name, COUNT(*) AS value
      FROM analytics_events WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
      GROUP BY device
      UNION ALL
      SELECT COALESCE(device, 'Desconocido') AS name, SUM(event_count) AS value
      FROM analytics_daily_agg WHERE landing_page_id = _page_id AND event_date >= _cutoff_date AND event_type = 'visit'
      GROUP BY device
    ) combined GROUP BY name ORDER BY value DESC
  ) t;

  -- Browsers (raw + agg)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _browsers
  FROM (
    SELECT name, SUM(value) AS value FROM (
      SELECT COALESCE(browser, 'Desconocido') AS name, COUNT(*) AS value
      FROM analytics_events WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
      GROUP BY browser
      UNION ALL
      SELECT COALESCE(browser, 'Desconocido') AS name, SUM(event_count) AS value
      FROM analytics_daily_agg WHERE landing_page_id = _page_id AND event_date >= _cutoff_date AND event_type = 'visit'
      GROUP BY browser
    ) combined GROUP BY name ORDER BY value DESC
  ) t;

  -- Countries (raw + agg)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _countries
  FROM (
    SELECT name, SUM(value) AS value FROM (
      SELECT COALESCE(country, 'Desconocido') AS name, COUNT(*) AS value
      FROM analytics_events WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
      GROUP BY country
      UNION ALL
      SELECT COALESCE(country, 'Desconocido') AS name, SUM(event_count) AS value
      FROM analytics_daily_agg WHERE landing_page_id = _page_id AND event_date >= _cutoff_date AND event_type = 'visit'
      GROUP BY country
    ) combined GROUP BY name ORDER BY value DESC LIMIT 10
  ) t;

  -- Referrers (raw + agg)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _referrers
  FROM (
    SELECT name, SUM(value) AS value FROM (
      SELECT COALESCE(referrer, 'Directo') AS name, COUNT(*) AS value
      FROM analytics_events WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
      GROUP BY referrer
      UNION ALL
      SELECT COALESCE(referrer, 'Directo') AS name, SUM(event_count) AS value
      FROM analytics_daily_agg WHERE landing_page_id = _page_id AND event_date >= _cutoff_date AND event_type = 'visit'
      GROUP BY referrer
    ) combined GROUP BY name ORDER BY value DESC LIMIT 10
  ) t;

  -- Clicks per link (raw + agg)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _links
  FROM (
    SELECT link_id, name, SUM(value) AS value FROM (
      SELECT ae.link_id, COALESCE(l.title, 'Sin título') AS name, COUNT(*) AS value
      FROM analytics_events ae LEFT JOIN links l ON l.id = ae.link_id
      WHERE ae.landing_page_id = _page_id AND ae.created_at >= _cutoff AND ae.event_type = 'click'
      GROUP BY ae.link_id, l.title
      UNION ALL
      SELECT a.link_id, COALESCE(l.title, 'Sin título') AS name, SUM(a.event_count) AS value
      FROM analytics_daily_agg a LEFT JOIN links l ON l.id = a.link_id
      WHERE a.landing_page_id = _page_id AND a.event_date >= _cutoff_date AND a.event_type = 'click'
      GROUP BY a.link_id, l.title
    ) combined GROUP BY link_id, name ORDER BY value DESC
  ) t;

  -- New vs Returning (raw only - agg doesn't track this well)
  SELECT COUNT(*) INTO _new_count
  FROM (
    SELECT visitor_id
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit' AND visitor_id IS NOT NULL
    GROUP BY visitor_id
    HAVING MIN(created_at) = (
      SELECT MIN(created_at) FROM analytics_events ae2
      WHERE ae2.landing_page_id = _page_id AND ae2.visitor_id = analytics_events.visitor_id AND ae2.event_type = 'visit'
    )
  ) sub;

  SELECT COUNT(DISTINCT visitor_id) - _new_count INTO _returning_count
  FROM analytics_events
  WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit' AND visitor_id IS NOT NULL;
  
  IF _returning_count < 0 THEN _returning_count := 0; END IF;

  _new_vs_returning := json_build_array(
    json_build_object('name', 'Nuevos', 'value', _new_count),
    json_build_object('name', 'Recurrentes', 'value', _returning_count)
  );

  RETURN json_build_object('devices', _devices, 'browsers', _browsers, 'countries', _countries, 'referrers', _referrers, 'links', _links, 'new_vs_returning', _new_vs_returning);
END;
$function$;
