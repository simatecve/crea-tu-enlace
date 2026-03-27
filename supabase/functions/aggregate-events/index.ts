import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Aggregate events older than 3 days
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Use raw SQL via rpc to do the aggregation + purge in one go
    // Step 1: Insert aggregated data
    const { error: aggError } = await supabaseAdmin.rpc('run_aggregation', { _cutoff: cutoff });

    if (aggError) {
      // Fallback: do it in JS
      // Fetch old events in batches
      let totalProcessed = 0;
      let totalDeleted = 0;
      const batchSize = 5000;
      let hasMore = true;

      while (hasMore) {
        const { data: events, error: fetchError } = await supabaseAdmin
          .from("analytics_events")
          .select("id, landing_page_id, event_type, device, browser, country, city, referrer, link_id, visitor_id, created_at")
          .lt("created_at", cutoff)
          .limit(batchSize);

        if (fetchError || !events || events.length === 0) {
          hasMore = false;
          break;
        }

        // Group by dimensions
        const groups = new Map<string, { count: number; visitors: Set<string> }>();
        const eventIds: string[] = [];

        for (const e of events) {
          eventIds.push(e.id);
          const date = e.created_at.substring(0, 10); // YYYY-MM-DD
          const key = [
            e.landing_page_id, date, e.event_type,
            e.device || '', e.browser || '', e.country || '',
            e.city || '', e.referrer || '', e.link_id || ''
          ].join('|');

          if (!groups.has(key)) {
            groups.set(key, { count: 0, visitors: new Set() });
          }
          const g = groups.get(key)!;
          g.count++;
          if (e.visitor_id) g.visitors.add(e.visitor_id);
        }

        // Upsert aggregated rows
        const aggRows = Array.from(groups.entries()).map(([key, val]) => {
          const parts = key.split('|');
          return {
            landing_page_id: parts[0],
            event_date: parts[1],
            event_type: parts[2],
            device: parts[3] || null,
            browser: parts[4] || null,
            country: parts[5] || null,
            city: parts[6] || null,
            referrer: parts[7] || null,
            link_id: parts[8] || null,
            event_count: val.count,
            unique_visitors: val.visitors.size,
          };
        });

        // Insert in chunks of 500
        for (let i = 0; i < aggRows.length; i += 500) {
          const chunk = aggRows.slice(i, i + 500);
          await supabaseAdmin.from("analytics_daily_agg").upsert(chunk, {
            onConflict: "landing_page_id,event_date,event_type,device,browser,country,city,referrer,link_id",
          });
        }

        // Delete processed raw events
        for (let i = 0; i < eventIds.length; i += 500) {
          const chunk = eventIds.slice(i, i + 500);
          await supabaseAdmin.from("analytics_events").delete().in("id", chunk);
        }

        totalProcessed += events.length;
        totalDeleted += eventIds.length;

        if (events.length < batchSize) hasMore = false;
      }

      return new Response(JSON.stringify({
        success: true,
        processed: totalProcessed,
        deleted: totalDeleted,
        method: "js_fallback",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, method: "rpc" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
