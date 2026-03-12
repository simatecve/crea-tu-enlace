
-- Add visitor_id column
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS visitor_id text;

-- Update get_analytics_summary to include unique_visitors
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
    RETURN json_build_object('visits', 0, 'clicks', 0, 'countries', 0, 'ctr', 0, 'unique_visitors', 0);
  END IF;

  SELECT json_build_object(
    'visits', COALESCE(SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END), 0),
    'clicks', COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
    'countries', COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN country END),
    'ctr', CASE 
      WHEN SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) > 0 
      THEN ROUND((SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END)::numeric / SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END)::numeric) * 100, 1)
      ELSE 0 
    END,
    'unique_visitors', COUNT(DISTINCT CASE WHEN event_type = 'visit' AND visitor_id IS NOT NULL THEN visitor_id END)
  ) INTO _result
  FROM analytics_events
  WHERE landing_page_id = _page_id AND created_at >= _cutoff;

  RETURN _result;
END;
$$;

-- Update get_analytics_breakdowns to include new_vs_returning
CREATE OR REPLACE FUNCTION public.get_analytics_breakdowns(_page_id uuid, _days integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cutoff timestamptz := now() - (_days || ' days')::interval;
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

  -- New vs Returning visitors
  -- "New" = visitor_id whose first visit event for this page is within the period
  -- "Returning" = visitor_id who had a visit event before the period
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
$$;
