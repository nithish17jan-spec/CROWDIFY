import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface ShopHistory {
  shop_id: string;
  crowd_count: number;
  recorded_at: string;
}

interface Shop {
  id: string;
  name: string;
  crowd_count: number;
}

function getCrowdStatus(count: number) {
  if (count <= 10) return { label: "Low", color: "hsl(142, 72%, 42%)" };
  if (count <= 25) return { label: "Medium", color: "hsl(38, 92%, 50%)" };
  return { label: "High", color: "hsl(0, 84%, 60%)" };
}

export default function Analytics() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [history, setHistory] = useState<ShopHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1h" | "24h">("1h");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const since = timeRange === "1h"
      ? new Date(Date.now() - 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [shopsRes, historyRes] = await Promise.all([
      supabase.from("shops").select("id, name, crowd_count").eq("user_id", user.id),
      supabase
        .from("crowd_history")
        .select("shop_id, crowd_count, recorded_at")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(500),
    ]);

    setShops(shopsRes.data || []);
    setHistory(historyRes.data || []);
    setLoading(false);
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Prepare line chart data - group by time buckets
  const lineData = (() => {
    if (!history.length) return [];
    const bucketMinutes = timeRange === "1h" ? 5 : 30;
    const buckets: Record<string, { time: string; [shopName: string]: number | string }> = {};

    history.forEach((h) => {
      const date = new Date(h.recorded_at);
      const bucketTime = new Date(
        Math.floor(date.getTime() / (bucketMinutes * 60 * 1000)) * bucketMinutes * 60 * 1000
      );
      const key = bucketTime.toISOString();
      const shop = shops.find((s) => s.id === h.shop_id);
      if (!shop) return;

      if (!buckets[key]) {
        buckets[key] = {
          time: bucketTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
      buckets[key][shop.name] = h.crowd_count;
    });

    return Object.values(buckets);
  })();

  // Bar chart data - current crowd per shop
  const barData = shops.map((shop) => ({
    name: shop.name.length > 12 ? shop.name.slice(0, 12) + "…" : shop.name,
    fullName: shop.name,
    count: shop.crowd_count,
    fill: getCrowdStatus(shop.crowd_count).color,
  }));

  const lineChartConfig: ChartConfig = shops.reduce((acc, shop, i) => {
    const colors = [
      "hsl(210, 90%, 55%)",
      "hsl(175, 70%, 38%)",
      "hsl(38, 92%, 50%)",
      "hsl(0, 84%, 60%)",
      "hsl(280, 70%, 55%)",
    ];
    acc[shop.name] = { label: shop.name, color: colors[i % colors.length] };
    return acc;
  }, {} as ChartConfig);

  const barChartConfig: ChartConfig = {
    count: { label: "Crowd Count", color: "hsl(210, 90%, 55%)" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Crowd trends and comparisons</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              onClick={() => setTimeRange("1h")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === "1h" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              1 Hour
            </button>
            <button
              onClick={() => setTimeRange("24h")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === "24h" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              24 Hours
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchData(); toast.success("Refreshed!"); }}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Line Chart - Crowd over time */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Crowd Count Over Time</CardTitle>
            <p className="text-xs text-muted-foreground">
              Last {timeRange === "1h" ? "1 hour" : "24 hours"} • Auto-refreshes every 30s
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : lineData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp className="h-10 w-10 opacity-30" />
              <p className="text-sm">No history data yet</p>
              <p className="text-xs">Data will appear as your ESP32 devices send updates</p>
            </div>
          ) : (
            <ChartContainer config={lineChartConfig} className="h-64 w-full">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {shops.map((shop) => (
                  <Line
                    key={shop.id}
                    type="monotone"
                    dataKey={shop.name}
                    stroke={lineChartConfig[shop.name]?.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart - Comparison */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Shop Comparison</CardTitle>
            <p className="text-xs text-muted-foreground">Current crowd levels across all shops</p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : barData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <BarChart3 className="h-10 w-10 opacity-30" />
              <p className="text-sm">No shops to compare</p>
            </div>
          ) : (
            <ChartContainer config={barChartConfig} className="h-64 w-full">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, _name, props) => (
                    <span className="font-semibold">{props.payload.fullName}: {value} people</span>
                  )}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
