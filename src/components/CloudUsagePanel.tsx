import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, HardDrive, Activity, DollarSign, Loader2, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageData {
  total_raw_events: number;
  total_agg_rows: number;
  raw_size_bytes: number;
  agg_size_bytes: number;
  total_size_bytes: number;
  daily_events: { day: string; count: number }[];
  per_page: { name: string; slug: string; events: number }[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estimateMonthlyCost(data: UsageData): { db: string; functions: string; total: string } {
  // Supabase pricing estimates:
  // DB: $0.125/GB/month for storage
  // Edge functions: $2/million invocations
  const dbSizeGB = data.total_size_bytes / (1024 * 1024 * 1024);
  const dbCost = dbSizeGB * 0.125;

  // Estimate daily invocations from recent data
  const avgDaily = data.daily_events.length > 0
    ? data.daily_events.reduce((s, d) => s + d.count, 0) / data.daily_events.length
    : 0;
  const monthlyInvocations = avgDaily * 30;
  const fnCost = (monthlyInvocations / 1_000_000) * 2;

  const total = dbCost + fnCost;
  return {
    db: `$${dbCost.toFixed(2)}`,
    functions: `$${fnCost.toFixed(2)}`,
    total: `$${total.toFixed(2)}`,
  };
}

export default function CloudUsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const { toast } = useToast();

  const fetchUsage = async () => {
    setLoading(true);
    const { data: result, error } = await supabase.rpc("get_cloud_usage");
    if (!error && result) {
      setData(result as unknown as UsageData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const runAggregation = async () => {
    setAggregating(true);
    try {
      const { error } = await supabase.functions.invoke("aggregate-events");
      if (error) throw error;
      toast({ title: "✅ Agregación completada", description: "Los eventos antiguos fueron compactados." });
      fetchUsage();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo ejecutar la agregación", variant: "destructive" });
    }
    setAggregating(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-muted-foreground py-8">No se pudieron cargar los datos de consumo.</p>;
  }

  const costs = estimateMonthlyCost(data);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventos raw</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_raw_events.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{formatBytes(data.raw_size_bytes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Datos agregados</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_agg_rows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{formatBytes(data.agg_size_bytes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamaño total DB</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(data.total_size_bytes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Costo estimado/mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.total}</div>
            <p className="text-xs text-muted-foreground">DB: {costs.db} · Functions: {costs.functions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aggregation action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button onClick={runAggregation} disabled={aggregating} variant="outline">
            {aggregating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {aggregating ? "Compactando..." : "Compactar eventos antiguos"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Agrega eventos de más de 3 días en resúmenes diarios y elimina los datos raw para liberar espacio.
          </p>
        </CardContent>
      </Card>

      {/* Daily events chart */}
      {data.daily_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos por día (últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.daily_events}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Eventos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per page breakdown */}
      {data.per_page.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos por página (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.per_page.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{p.name || "Sin título"}</span>
                    <span className="text-sm text-muted-foreground ml-2">/{p.slug}</span>
                  </div>
                  <span className="font-mono text-sm">{p.events.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
