import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, MousePointerClick, Globe, Smartphone, Users } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(222, 47%, 11%)", "hsl(210, 40%, 30%)", "hsl(215, 16%, 47%)", "hsl(210, 40%, 60%)", "hsl(214, 32%, 75%)", "hsl(210, 40%, 85%)"];

interface SummaryData {
  visits: number;
  clicks: number;
  countries: number;
  ctr: number;
  unique_visitors: number;
}

interface DailyRow {
  day: string;
  visits: number;
  clicks: number;
}

interface BreakdownItem {
  name: string;
  value: number;
}

interface BreakdownsData {
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  countries: BreakdownItem[];
  referrers: BreakdownItem[];
  links: BreakdownItem[];
  new_vs_returning: BreakdownItem[];
}

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState("");
  const [summary, setSummary] = useState<SummaryData>({ visits: 0, clicks: 0, countries: 0, ctr: 0, unique_visitors: 0 });
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownsData>({ devices: [], browsers: [], countries: [], referrers: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchAll = async () => {
      const [pageRes, summaryRes, dailyRes, breakdownsRes] = await Promise.all([
        supabase.from("landing_pages").select("title").eq("id", id).single(),
        supabase.rpc("get_analytics_summary", { _page_id: id, _days: period }),
        supabase.rpc("get_analytics_daily", { _page_id: id, _days: period }),
        supabase.rpc("get_analytics_breakdowns", { _page_id: id, _days: period }),
      ]);

      if (pageRes.data) setPageTitle(pageRes.data.title);
      if (summaryRes.data) setSummary(summaryRes.data as unknown as SummaryData);

      // Build daily chart with all days filled
      const dailyMap: Record<string, { visits: number; clicks: number }> = {};
      for (let i = 0; i < period; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (period - 1 - i));
        dailyMap[d.toISOString().slice(0, 10)] = { visits: 0, clicks: 0 };
      }
      if (dailyRes.data && Array.isArray(dailyRes.data)) {
        (dailyRes.data as any[]).forEach((r: any) => {
          const key = String(r.day);
          if (dailyMap[key]) {
            dailyMap[key].visits = Number(r.visits);
            dailyMap[key].clicks = Number(r.clicks);
          }
        });
      }
      setDaily(
        Object.entries(dailyMap).map(([key, val]) => {
          const d = new Date(key + "T00:00:00");
          return { day: d.toLocaleDateString("es", { month: "short", day: "numeric" }), visits: val.visits, clicks: val.clicks };
        })
      );

      if (breakdownsRes.data) setBreakdowns(breakdownsRes.data as unknown as BreakdownsData);
      setLoading(false);
    };

    fetchAll();
  }, [id, period]);

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
            <Button variant={period === 7 ? "default" : "outline"} size="sm" onClick={() => setPeriod(7)}>7 días</Button>
            <Button variant={period === 30 ? "default" : "outline"} size="sm" onClick={() => setPeriod(30)}>30 días</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">{pageTitle || "Analíticas"}</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={<Eye className="h-4 w-4" />} label="Visitas" value={summary.visits} />
          <SummaryCard icon={<MousePointerClick className="h-4 w-4" />} label="Clicks" value={summary.clicks} />
          <SummaryCard icon={<Globe className="h-4 w-4" />} label="Países" value={summary.countries} />
          <SummaryCard icon={<Smartphone className="h-4 w-4" />} label="CTR" value={`${summary.ctr}%`} />
        </div>

        {/* Daily chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas y clicks por día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="visits" name="Visitas" fill="hsl(222, 47%, 11%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" name="Clicks" fill="hsl(215, 16%, 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <BreakdownList title="Clicks por enlace" data={breakdowns.links} showBar />
          <BreakdownList title="Países" data={breakdowns.countries} />
          <PieChartCard title="Dispositivos" data={breakdowns.devices} />
          <PieChartCard title="Navegadores" data={breakdowns.browsers} />
        </div>

        <BreakdownList title="Referrers" data={breakdowns.referrers} />
      </main>
      <AppFooter />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon} {label}</div>
        <p className="text-3xl font-bold">{typeof value === "number" ? value.toLocaleString("es") : value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownList({ title, data, showBar }: { title: string; data: BreakdownItem[]; showBar?: boolean }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  {showBar && <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(20, (item.value / max) * 100)}px` }} />}
                  <span className="font-medium w-12 text-right">{item.value.toLocaleString("es")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PieChartCard({ title, data }: { title: string; data: BreakdownItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
