import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Store, Cpu, Wifi, TrendingUp, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Stats {
  shopCount: number;
  deviceCount: number;
  onlineDevices: number;
  avgCrowdCount: number;
  topShop: { name: string; crowd_count: number } | null;
  highCrowdShops: { name: string; crowd_count: number }[];
}

function getCrowdStatus(count: number) {
  if (count <= 10) return { label: "Low", cls: "bg-crowd-low" };
  if (count <= 25) return { label: "Medium", cls: "bg-crowd-medium" };
  return { label: "High", cls: "bg-crowd-high" };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const { canWrite } = useUserRole();

  const fetchStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User");

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [shopsRes, devicesRes] = await Promise.all([
      supabase.from("shops").select("id, name, crowd_count").eq("user_id", user.id),
      supabase.from("esp32_devices").select("id, last_seen").eq("user_id", user.id),
    ]);

    const shops = shopsRes.data || [];
    const devices = devicesRes.data || [];
    const onlineDevices = devices.filter(
      (d) => d.last_seen && new Date(d.last_seen) > new Date(fiveMinAgo)
    ).length;

    const avgCrowdCount = shops.length
      ? Math.round(shops.reduce((sum, s) => sum + (s.crowd_count || 0), 0) / shops.length)
      : 0;

    const topShop = shops.length
      ? shops.reduce((max, s) => (s.crowd_count > max.crowd_count ? s : max), shops[0])
      : null;

    const highCrowdShops = shops.filter((s) => s.crowd_count > 25);

    setStats({ shopCount: shops.length, deviceCount: devices.length, onlineDevices, avgCrowdCount, topShop, highCrowdShops });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const summaryCards = stats
    ? [
        {
          title: "Total Shops",
          value: stats.shopCount,
          icon: Store,
          color: "text-primary",
          bg: "bg-primary/10",
          sub: "Managed by you",
          link: "/shops",
        },
        {
          title: "ESP32 Devices",
          value: stats.deviceCount,
          icon: Cpu,
          color: "text-[hsl(175,70%,38%)]",
          bg: "bg-[hsl(175,70%,38%)]/10",
          sub: `${stats.onlineDevices} online`,
          link: "/devices",
        },
        {
          title: "Devices Online",
          value: stats.onlineDevices,
          icon: Wifi,
          color: "text-[hsl(var(--crowd-low))]",
          bg: "bg-[hsl(var(--crowd-low))]/10",
          sub: "Active in last 5 min",
          link: "/devices",
        },
        {
          title: "Avg Crowd Count",
          value: stats.avgCrowdCount,
          icon: TrendingUp,
          color: "text-[hsl(var(--crowd-medium))]",
          bg: "bg-[hsl(var(--crowd-medium))]/10",
          sub: getCrowdStatus(stats.avgCrowdCount).label + " level",
          link: "/shops",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome{userName ? `, ${userName}` : ""}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's your crowd monitoring overview. Data refreshes every 10 seconds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); toast.success("Refreshed!"); }} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* High crowd warning */}
      {stats && stats.highCrowdShops.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--crowd-high))]/30 bg-[hsl(var(--crowd-high))]/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--crowd-high))]" />
          <div>
            <p className="font-semibold text-[hsl(var(--crowd-high))]">High Crowd Alert</p>
            <p className="text-sm text-muted-foreground">
              {stats.highCrowdShops.map((s) => s.name).join(", ")} {stats.highCrowdShops.length === 1 ? "has" : "have"} high crowd levels (&gt;25 people).
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Link key={card.title} to={card.link}>
              <Card className="shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Busiest Shop */}
      {stats?.topShop && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Busiest Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold">{stats.topShop.name}</p>
                <p className="text-sm text-muted-foreground">Current crowd count</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary">{stats.topShop.crowd_count}</p>
                <Badge className={`mt-1 ${getCrowdStatus(stats.topShop.crowd_count).cls}`}>
                  {getCrowdStatus(stats.topShop.crowd_count).label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Quick actions */}
      {canWrite && stats && stats.shopCount === 0 && (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
...
          </CardContent>
        </Card>
      )}
    </div>
  );
}
