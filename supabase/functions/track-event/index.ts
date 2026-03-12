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
    const { landing_page_id, link_id, event_type, referrer, visitor_id } = await req.json();

    if (!landing_page_id || !event_type || !["visit", "click"].includes(event_type)) {
      return new Response(JSON.stringify({ error: "Invalid data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userAgent = req.headers.get("user-agent") || "";

    // Simple device detection
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isTablet = /Tablet|iPad/i.test(userAgent);
    const device = isTablet ? "Tablet" : isMobile ? "Móvil" : "Escritorio";

    // Simple browser detection
    let browser = "Otro";
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = "Safari";
    else if (/Edge/i.test(userAgent)) browser = "Edge";

    // Get country from headers (Cloudflare/Supabase provides this)
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-country") || null;
    const city = req.headers.get("cf-ipcity") || req.headers.get("x-city") || null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      landing_page_id,
      link_id: link_id || null,
      event_type,
      device,
      browser,
      referrer: referrer || null,
      user_agent: userAgent,
      country,
      city,
      visitor_id: visitor_id || null,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
