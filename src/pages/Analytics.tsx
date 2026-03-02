import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, MousePointerClick, Globe, Smartphone, Monitor } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type AnalyticsEvent = Tables<"analytics_events">;

const COLORS = ["hsl(222, 47%, 11%)", "hsl(210, 40%, 30%)", "hsl(215, 16%, 47%)", "hsl(210, 40%, 60%)", "hsl(214, 32%, 75%)", "hsl(210, 40%, 85%)"];

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [links, setLinks] = useState<Tables<"links">[]>([]);
  const [page, setPage] = useState<Tables<"landing_pages"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);

      const [pageRes, eventsRes, linksRes] = await Promise.all([
        supabase.from("landing_pages").select("*").eq("id", id).single(),
        supabase.from("analytics_events").select("*").eq("landing_page_id", id).gte("created_at", cutoff.toISOString()).order("created_at", { ascending: true }),
        supabase.from("links").select("*").eq("landing_page_id", id),
      ]);

      if (pageRes.data) setPage(pageRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (linksRes.data) setLinks(linksRes.data);
      setLoading(false);
    };
    fetch();
  }, [id, period]);

  const visits = events.filter((e) => e.event_type === "visit");
  const clicks = events.filter((e) => e.event_type === "click");

  // Daily chart data
  const dailyData = (() => {
    const map: Record<string, { day: string; visitas: number; clicks: number }> = {};
    for (let i = 0; i < period; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (period - 1 - i));
      const key = d.toISOString().slice(0, 10);
      map[key] = { day: d.toLocaleDateString("es", { month: "short", day: "numeric" }), visitas: 0, clicks: 0 };
    }
    events.forEach((e) => {
      const key = e.created_at.slice(0, 10);
      if (map[key]) {
        if (e.event_type === "visit") map[key].visitas++;
        else map[key].clicks++;
      }
    });
    return Object.values(map);
  })();

  // Clicks per link
  const clicksPerLink = links.map((link) => ({
    name: link.title || "Sin título",
    value: clicks.filter((c) => c.link_id === link.id).length,
  })).sort((a, b) => b.value - a.value);

  // Device breakdown
  const deviceData = (() => {
    const map: Record<string, number> = {};
    visits.forEach((v) => {
      const d = v.device || "Desconocido";
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Browser breakdown
  const browserData = (() => {
    const map: Record<string, number> = {};
    visits.forEach((v) => {
      const b = v.browser || "Desconocido";
      map[b] = (map[b] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Country breakdown
  const countryData = (() => {
    const map: Record<string, number> = {};
    visits.forEach((v) => {
      const c = v.country || "Desconocido";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button variant={period === 7 ? "default" : "outline"} size="sm" onClick={() => setPeriod(7)}>
              7 días
            </Button>
            <Button variant={period === 30 ? "default" : "outline"} size="sm" onClick={() => setPeriod(30)}>
              30 días
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">{page?.title || "Analíticas"}</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Eye className="h-4 w-4" /> Visitas
              </div>
              <p className="text-3xl font-bold">{visits.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <MousePointerClick className="h-4 w-4" /> Clicks
              </div>
              <p className="text-3xl font-bold">{clicks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Globe className="h-4 w-4" /> Países
              </div>
              <p className="text-3xl font-bold">{new Set(visits.map((v) => v.country).filter(Boolean)).size}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Smartphone className="h-4 w-4" /> CTR
              </div>
              <p className="text-3xl font-bold">
                {visits.length > 0 ? Math.round((clicks.length / visits.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas y clicks por día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="visitas" fill="hsl(222, 47%, 11%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="hsl(215, 16%, 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Clicks per link */}
          <Card>
            <CardHeader><CardTitle className="text-base">Clicks por enlace</CardTitle></CardHeader>
            <CardContent>
              {clicksPerLink.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {clicksPerLink.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(20, (item.value / Math.max(...clicksPerLink.map(c => c.value), 1)) * 100)}px` }} />
                        <span className="text-sm font-medium w-8 text-right">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Countries */}
          <Card>
            <CardHeader><CardTitle className="text-base">Países</CardTitle></CardHeader>
            <CardContent>
              {countryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {countryData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devices */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dispositivos</CardTitle></CardHeader>
            <CardContent>
              {deviceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                      {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Browsers */}
          <Card>
            <CardHeader><CardTitle className="text-base">Navegadores</CardTitle></CardHeader>
            <CardContent>
              {browserData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={browserData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                      {browserData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referrers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Referrers</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const refMap: Record<string, number> = {};
              visits.forEach((v) => {
                const r = v.referrer || "Directo";
                refMap[r] = (refMap[r] || 0) + 1;
              });
              const refData = Object.entries(refMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
              if (refData.length === 0) return <p className="text-sm text-muted-foreground">Sin datos</p>;
              return (
                <div className="space-y-2">
                  {refData.map(([name, count], i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{name}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
