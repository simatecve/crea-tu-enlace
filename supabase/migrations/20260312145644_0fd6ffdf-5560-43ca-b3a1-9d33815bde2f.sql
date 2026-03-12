
-- RPC 1: Summary (totals)
CREATE OR REPLACE FUNCTION public.get_analytics_summary(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result json;
  _cutoff timestamptz := now() - (_days || ' days')::interval;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN json_build_object('visits', 0, 'clicks', 0, 'countries', 0, 'ctr', 0);
  END IF;

  SELECT json_build_object(
    'visits', COALESCE(SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END), 0),
    'clicks', COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
    'countries', COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN country END),
    'ctr', CASE 
      WHEN SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) > 0 
      THEN ROUND((SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END)::numeric / SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END)::numeric) * 100, 1)
      ELSE 0 
    END
  ) INTO _result
  FROM analytics_events
  WHERE landing_page_id = _page_id AND created_at >= _cutoff;

  RETURN _result;
END;
$$;

-- RPC 2: Daily breakdown
CREATE OR REPLACE FUNCTION public.get_analytics_daily(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result json;
  _cutoff timestamptz := now() - (_days || ' days')::interval;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(t) ORDER BY t.day) INTO _result
  FROM (
    SELECT 
      (created_at AT TIME ZONE 'UTC')::date AS day,
      SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) AS visits,
      SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
  ) t;

  RETURN COALESCE(_result, '[]'::json);
END;
$$;

-- RPC 3: Breakdowns (device, browser, country, referrer, clicks per link)
CREATE OR REPLACE FUNCTION public.get_analytics_breakdowns(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result json;
  _cutoff timestamptz := now() - (_days || ' days')::interval;
  _devices json;
  _browsers json;
  _countries json;
  _referrers json;
  _links json;
BEGIN
  IF NOT owns_landing_page(_page_id) THEN
    RETURN json_build_object('devices', '[]'::json, 'browsers', '[]'::json, 'countries', '[]'::json, 'referrers', '[]'::json, 'links', '[]'::json);
  END IF;

  -- Devices
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _devices
  FROM (
    SELECT COALESCE(device, 'Desconocido') AS name, COUNT(*) AS value
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
    GROUP BY device ORDER BY value DESC
  ) t;

  -- Browsers
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _browsers
  FROM (
    SELECT COALESCE(browser, 'Desconocido') AS name, COUNT(*) AS value
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
    GROUP BY browser ORDER BY value DESC
  ) t;

  -- Countries (top 10)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _countries
  FROM (
    SELECT COALESCE(country, 'Desconocido') AS name, COUNT(*) AS value
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
    GROUP BY country ORDER BY value DESC LIMIT 10
  ) t;

  -- Referrers (top 10)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _referrers
  FROM (
    SELECT COALESCE(referrer, 'Directo') AS name, COUNT(*) AS value
    FROM analytics_events
    WHERE landing_page_id = _page_id AND created_at >= _cutoff AND event_type = 'visit'
    GROUP BY referrer ORDER BY value DESC LIMIT 10
  ) t;

  -- Clicks per link
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _links
  FROM (
    SELECT ae.link_id, COALESCE(l.title, 'Sin título') AS name, COUNT(*) AS value
    FROM analytics_events ae
    LEFT JOIN links l ON l.id = ae.link_id
    WHERE ae.landing_page_id = _page_id AND ae.created_at >= _cutoff AND ae.event_type = 'click'
    GROUP BY ae.link_id, l.title ORDER BY value DESC
  ) t;

  RETURN json_build_object('devices', _devices, 'browsers', _browsers, 'countries', _countries, 'referrers', _referrers, 'links', _links);
END;
$$;
