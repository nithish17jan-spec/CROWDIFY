import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, Users, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

interface Shop {
  id: string;
  name: string;
  crowd_count: number;
}

interface HistoryRecord {
  recorded_at: string;
  crowd_count: number;
  shop_id: string;
}

interface HourlyData {
  hour: string;
  avg: number;
  max: number;
}

interface DailyData {
  date: string;
  avg: number;
  max: number;
  total: number;
}

function formatHour(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}${ampm}`;
}

export default function Analytics() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name, crowd_count")
      .eq("user_id", user.id);

    setShops(shopsData || []);

    const days = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const shopIds = (shopsData || []).map((s) => s.id);
    if (shopIds.length === 0) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const { data: historyData } = await supabase
      .from("crowd_history")
      .select("recorded_at, crowd_count, shop_id")
      .in("shop_id", shopIds)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true });

    setHistory(historyData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const filtered = useMemo(() => {
    if (selectedShop === "all") return history;
    return history.filter((h) => h.shop_id === selectedShop);
  }, [history, selectedShop]);

  // Summary stats
  const stats = useMemo(() => {
    if (filtered.length === 0) return { avg: 0, max: 0, peak: "N/A", total: 0 };
    const counts = filtered.map((h) => h.crowd_count);
    const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    const max = Math.max(...counts);
    const total = filtered.length;

    // Peak hour
    const hourBuckets: Record<number, number[]> = {};
    filtered.forEach((h) => {
      const hr = new Date(h.recorded_at).getHours();
      if (!hourBuckets[hr]) hourBuckets[hr] = [];
      hourBuckets[hr].push(h.crowd_count);
    });
    let peakHour = 0;
    let peakAvg = 0;
    Object.entries(hourBuckets).forEach(([hr, vals]) => {
      const a = vals.reduce((x, y) => x + y, 0) / vals.length;
      if (a > peakAvg) { peakAvg = a; peakHour = Number(hr); }
    });

    return { avg, max, peak: formatHour(peakHour), total };
  }, [filtered]);

  // Hourly breakdown
  const hourlyData = useMemo<HourlyData[]>(() => {
    const buckets: Record<number, number[]> = {};
    for (let i = 0; i < 24; i++) buckets[i] = [];
    filtered.forEach((h) => {
      const hr = new Date(h.recorded_at).getHours();
      buckets[hr].push(h.crowd_count);
    });
    return Object.entries(buckets).map(([hr, vals]) => ({
      hour: formatHour(Number(hr)),
      avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      max: vals.length ? Math.max(...vals) : 0,
    }));
  }, [filtered]);

  // Daily breakdown
  const dailyData = useMemo<DailyData[]>(() => {
    const buckets: Record<string, number[]> = {};
    filtered.forEach((h) => {
      const d = new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!buckets[d]) buckets[d] = [];
      buckets[d].push(h.crowd_count);
    });
    return Object.entries(buckets).map(([date, vals]) => ({
      date,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      max: Math.max(...vals),
      total: vals.length,
    }));
  }, [filtered]);

  const statCards = [
    { title: "Average Crowd", value: stats.avg, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { title: "Peak Count", value: stats.max, icon: TrendingUp, color: "text-[hsl(var(--crowd-high))]", bg: "bg-[hsl(var(--crowd-high))]/10" },
    { title: "Peak Hour", value: stats.peak, icon: Clock, color: "text-[hsl(var(--crowd-medium))]", bg: "bg-[hsl(var(--crowd-medium))]/10" },
    { title: "Data Points", value: stats.total, icon: BarChart3, color: "text-[hsl(175,70%,38%)]", bg: "bg-[hsl(175,70%,38%)]/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Crowd trends and insights for your shops</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { fetchData(); toast.success("Refreshed!"); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No crowd history data yet</p>
            <p className="text-sm text-muted-foreground/70">Data will appear here as your ESP32 devices report crowd counts.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Crowd trend chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Crowd Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" fill="url(#crowdGradient)" strokeWidth={2} name="Avg Crowd" />
                  <Line type="monotone" dataKey="max" stroke="hsl(var(--crowd-high))" strokeWidth={2} dot={false} name="Peak" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly breakdown */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Hourly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg Crowd" />
                  <Bar dataKey="max" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} name="Peak" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
