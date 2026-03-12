import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Store, Cpu, Wifi, TrendingUp, RefreshCw, AlertTriangle, MapPin, CalendarCheck, Users, Plus, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from
"@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  location: string;
  crowd_count: number;
  shop_type: string;
  district: string | null;
}

interface Stats {
  shopCount: number;
  deviceCount: number;
  onlineDevices: number;
  avgCrowdCount: number;
  topShop: {name: string;crowd_count: number;} | null;
  highCrowdShops: {name: string;crowd_count: number;}[];
  distinctDistricts: number;
  allShops: ShopItem[];
  districts: string[];
}

interface UserTask {
  id: string;
  shop_name: string;
  task_date: string;
  note: string;
  completed: boolean;
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
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ shop_name: "", task_date: undefined as Date | undefined, note: "" });
  const [savingTask, setSavingTask] = useState(false);
  const { canWrite, isViewer } = useUserRole();

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.
    from("user_tasks").
    select("*").
    eq("user_id", user.id).
    eq("task_date", today).
    order("created_at", { ascending: false });
    setTasks((data || []) as UserTask[]);
  };

  const fetchStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User");

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    if (isViewer) {
      const { data: shops } = await supabase.
      from("shops").
      select("id, name, location, crowd_count, shop_type, district").
      order("crowd_count", { ascending: false });

      const allShops = (shops || []) as ShopItem[];
      const districts = [...new Set(allShops.map((s) => s.district || s.location.trim()).filter(Boolean))].sort();
      const distinctDistricts = districts.length;
      const avgCrowdCount = allShops.length ?
      Math.round(allShops.reduce((sum, s) => sum + (s.crowd_count || 0), 0) / allShops.length) :
      0;
      const highCrowdShops = allShops.filter((s) => s.crowd_count > 25);

      setStats({
        shopCount: allShops.length,
        deviceCount: 0,
        onlineDevices: 0,
        avgCrowdCount,
        topShop: allShops.length ? { name: allShops[0].name, crowd_count: allShops[0].crowd_count } : null,
        highCrowdShops,
        distinctDistricts,
        allShops,
        districts
      });
    } else {
      const [shopsRes, devicesRes] = await Promise.all([
      supabase.from("shops").select("id, name, location, crowd_count, shop_type, district").eq("user_id", user.id),
      supabase.from("esp32_devices").select("id, last_seen").eq("user_id", user.id)]
      );

      const shops = (shopsRes.data || []) as ShopItem[];
      const devices = devicesRes.data || [];
      const onlineDevices = devices.filter(
        (d) => d.last_seen && new Date(d.last_seen) > new Date(fiveMinAgo)
      ).length;
      const avgCrowdCount = shops.length ?
      Math.round(shops.reduce((sum, s) => sum + (s.crowd_count || 0), 0) / shops.length) :
      0;
      const topShop = shops.length ?
      shops.reduce((max, s) => s.crowd_count > max.crowd_count ? s : max, shops[0]) :
      null;
      const highCrowdShops = shops.filter((s) => s.crowd_count > 25);

      setStats({
        shopCount: shops.length,
        deviceCount: devices.length,
        onlineDevices,
        avgCrowdCount,
        topShop,
        highCrowdShops,
        distinctDistricts: new Set(shops.map((s) => s.district || s.location.trim().toLowerCase())).size,
        allShops: [...shops].sort((a, b) => b.crowd_count - a.crowd_count),
        districts: []
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    fetchTasks();
    const interval = setInterval(() => {fetchStats();fetchTasks();}, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = async () => {
    if (!taskForm.shop_name.trim() || !taskForm.task_date) {
      toast.error("Please fill shop name and date");
      return;
    }
    setSavingTask(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {setSavingTask(false);return;}

    const { error } = await supabase.from("user_tasks").insert({
      user_id: user.id,
      shop_name: taskForm.shop_name,
      task_date: format(taskForm.task_date, "yyyy-MM-dd"),
      note: taskForm.note
    });
    if (error) toast.error("Failed to add task");else
    {toast.success("Task added!");fetchTasks();}
    setSavingTask(false);
    setTaskDialogOpen(false);
    setTaskForm({ shop_name: "", task_date: undefined, note: "" });
  };

  const toggleTask = async (task: UserTask) => {
    await supabase.from("user_tasks").update({ completed: !task.completed }).eq("id", task.id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("user_tasks").delete().eq("id", id);
    fetchTasks();
  };

  const filteredShops = stats?.allShops.filter((s) => {
    if (selectedDistrict === "all") return true;
    return (s.district || s.location.trim()) === selectedDistrict;
  }) || [];

  const ownerCards = stats ?
  [
  {
    title: "Total Shops",
    value: stats.shopCount,
    icon: Store,
    color: "text-primary",
    bg: "bg-primary/10",
    sub: "Managed by you",
    link: "/shops"
  },
  {
    title: "ESP32 Devices",
    value: stats.deviceCount,
    icon: Cpu,
    color: "text-[hsl(175,70%,38%)]",
    bg: "bg-[hsl(175,70%,38%)]/10",
    sub: `${stats.onlineDevices} online`,
    link: "/devices"
  },
  {
    title: "Devices Online",
    value: stats.onlineDevices,
    icon: Wifi,
    color: "text-[hsl(var(--crowd-low))]",
    bg: "bg-[hsl(var(--crowd-low))]/10",
    sub: "Active in last 5 min",
    link: "/devices"
  },
  {
    title: "Avg Crowd Count",
    value: stats.avgCrowdCount,
    icon: TrendingUp,
    color: "text-[hsl(var(--crowd-medium))]",
    bg: "bg-[hsl(var(--crowd-medium))]/10",
    sub: getCrowdStatus(stats.avgCrowdCount).label + " level",
    link: "/shops"
  }] :

  [];

  const viewerCards = stats ?
  [
  {
    title: "District Shops",
    value: stats.distinctDistricts,
    icon: MapPin,
    color: "text-primary",
    bg: "bg-primary/10",
    sub: `${stats.shopCount} shops across districts`,
    link: "/shops"
  },
  {
    title: "Avg Crowd Count",
    value: stats.avgCrowdCount,
    icon: TrendingUp,
    color: "text-[hsl(var(--crowd-medium))]",
    bg: "bg-[hsl(var(--crowd-medium))]/10",
    sub: getCrowdStatus(stats.avgCrowdCount).label + " level",
    link: "/shops"
  }] :

  [];

  const summaryCards = isViewer ? viewerCards : ownerCards;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome{userName ? `, ${userName}` : ""}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's your CROWD MONITORING OVERVIEW
         
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {fetchStats();toast.success("Refreshed!");}} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* High crowd warning */}
      {stats && stats.highCrowdShops.length > 0 && <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">High Crowd Alert</p>
            <p className="text-sm text-muted-foreground">
              {stats.highCrowdShops.map((s) => s.name).join(", ")} {stats.highCrowdShops.length === 1 ? "has" : "have"} high crowd levels (&gt;25 people).
            </p>
          </div>
        </div>
      }

      {/* Summary Cards */}
      {loading && !stats ?
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: isViewer ? 2 : 4 }).map((_, i) =>
        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        )}
        </div> :

      <div className={`grid gap-4 sm:grid-cols-2 ${isViewer ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          {summaryCards.map((card) =>
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
        )}
        </div>
      }

      {/* Today's Tasks (for viewers) */}
      {isViewer &&
      <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Today's Tasks
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
            <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ?
          <p className="text-sm text-muted-foreground text-center py-4">No tasks for today. Add one to plan your visits!</p> :

          <div className="space-y-2">
                {tasks.map((task) =>
            <div key={task.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <button onClick={() => toggleTask(task)} className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                task.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
              )}>
                      {task.completed && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-sm", task.completed && "line-through text-muted-foreground")}>{task.shop_name}</p>
                      {task.note && <p className="text-xs text-muted-foreground truncate">{task.note}</p>}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
            )}
              </div>
          }
          </CardContent>
        </Card>
      }

      {/* Shops by Crowd with location filter (for viewers) */}
      {isViewer && stats && stats.allShops.length > 0 &&
      <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Shops by Crowd Level</CardTitle>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {stats.districts.map((d) =>
              <SelectItem key={d} value={d}>{d}</SelectItem>
              )}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredShops.length === 0 ?
          <p className="text-sm text-muted-foreground text-center py-4">No shops in this location.</p> :

          <div className="space-y-3">
                {filteredShops.map((shop) => {
              const status = getCrowdStatus(shop.crowd_count);
              return (
                <Link key={shop.id} to="/shops">
                      <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{shop.name}</p>
                            <p className="text-xs text-muted-foreground">{shop.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">{shop.crowd_count}</span>
                          <Badge className={status.cls}>{status.label}</Badge>
                        </div>
                      </div>
                    </Link>);

            })}
              </div>
          }
          </CardContent>
        </Card>
      }

      {/* Busiest Shop (for owners) */}
      {!isViewer && stats?.topShop &&
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
      }

      {/* Quick actions */}
      {canWrite && stats && stats.shopCount === 0 &&
      <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Get Started</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your first shop to start monitoring crowd levels.</p>
            </div>
            <Link to="/shops">
              <Button>Add Your First Shop</Button>
            </Link>
          </CardContent>
        </Card>
      }

      {/* Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Shop Name</Label>
              <Input
                placeholder="e.g. Visit Main Street Coffee"
                value={taskForm.shop_name}
                onChange={(e) => setTaskForm((f) => ({ ...f, shop_name: e.target.value }))} />
              
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !taskForm.task_date && "text-muted-foreground")}>
                    
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskForm.task_date ? format(taskForm.task_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={taskForm.task_date}
                    onSelect={(d) => setTaskForm((f) => ({ ...f, task_date: d }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")} />
                  
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Check morning crowd levels"
                value={taskForm.note}
                onChange={(e) => setTaskForm((f) => ({ ...f, note: e.target.value }))} />
              
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddTask} disabled={savingTask}>
              {savingTask ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}