import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Store, RefreshCw, MapPin, Users, AlertTriangle,
  Search, User, Info, Pencil, Building2, UtensilsCrossed, Landmark, Building
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Shop {
  id: string;
  name: string;
  location: string;
  crowd_count: number;
  is_public: boolean;
  updated_at: string;
  user_id: string;
  shop_type: string;
  owner_name?: string;
}

const SHOP_TYPES = [
  { value: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "super_market", label: "Super Market", icon: Building2 },
  { value: "government_office", label: "Government Office", icon: Building },
  { value: "other", label: "Other", icon: Store },
] as const;

function getShopTypeInfo(type: string) {
  return SHOP_TYPES.find((t) => t.value === type) || SHOP_TYPES[4];
}

function getCrowdStatus(count: number) {
  if (count <= 10) return { label: "Low", cls: "bg-crowd-low", dot: "bg-green-500" };
  if (count <= 25) return { label: "Medium", cls: "bg-crowd-medium", dot: "bg-yellow-500" };
  return { label: "High", cls: "bg-crowd-high", dot: "bg-red-500" };
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [infoShop, setInfoShop] = useState<Shop | null>(null);
  const [form, setForm] = useState({ name: "", location: "", shop_type: "other" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [crowdForm, setCrowdForm] = useState({ shopId: "", count: "" });
  const [crowdDialogOpen, setCrowdDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { canWrite } = useUserRole();

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || shop.shop_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const fetchShops = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load shops"); setLoading(false); return; }

    const userIds = [...new Set((data || []).map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));
    setShops((data || []).map((s) => ({ ...s, owner_name: nameMap.get(s.user_id) || "Unknown" })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShops();
    const interval = setInterval(fetchShops, 10000);
    return () => clearInterval(interval);
  }, [fetchShops]);

  const openAdd = () => {
    setEditShop(null);
    setForm({ name: "", location: "", shop_type: "other" });
    setDialogOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditShop(shop);
    setForm({ name: shop.name, location: shop.location, shop_type: shop.shop_type });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    if (editShop) {
      const { error } = await supabase
        .from("shops")
        .update({ name: form.name, location: form.location, shop_type: form.shop_type as any })
        .eq("id", editShop.id);
      if (error) toast.error("Failed to update shop");
      else { toast.success("Shop updated!"); fetchShops(); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("shops").insert({
        name: form.name,
        location: form.location,
        shop_type: form.shop_type as any,
        user_id: user!.id,
      });
      if (error) toast.error("Failed to add shop");
      else { toast.success("Shop added!"); fetchShops(); }
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("shops").delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete shop");
    else { toast.success("Shop deleted"); fetchShops(); }
    setDeleteId(null);
  };

  const openCrowdUpdate = (shop: Shop) => {
    setCrowdForm({ shopId: shop.id, count: String(shop.crowd_count) });
    setCrowdDialogOpen(true);
  };

  const handleCrowdUpdate = async () => {
    const count = parseInt(crowdForm.count);
    if (isNaN(count) || count < 0) { toast.error("Enter a valid number"); return; }
    const { error } = await supabase
      .from("shops")
      .update({ crowd_count: count, manual_override: true, manual_count: count })
      .eq("id", crowdForm.shopId);
    if (error) toast.error("Failed to update crowd data");
    else { toast.success("Crowd data updated!"); fetchShops(); }
    setCrowdDialogOpen(false);
  };

  const isOwner = (shop: Shop) => currentUserId === shop.user_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shops</h1>
          <p className="text-sm text-muted-foreground">Browse and manage monitored locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchShops(); toast.success("Refreshed!"); }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shop
            </Button>
          )}
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={typeFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter(null)}
        >
          <Store className="mr-2 h-4 w-4" />
          All
        </Button>
        {SHOP_TYPES.filter((t) => t.value !== "other").map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.value}
              variant={typeFilter === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(typeFilter === type.value ? null : type.value)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Search */}
      {!loading && shops.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shops by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">No shops yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your first shop to start tracking crowd levels.</p>
            </div>
            {canWrite && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Shop</Button>}
          </CardContent>
        </Card>
      ) : filteredShops.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No shops found</h3>
              <p className="mt-1 text-sm text-muted-foreground">No shops match your filters. Try a different search or category.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredShops.map((shop) => {
            const status = getCrowdStatus(shop.crowd_count);
            const typeInfo = getShopTypeInfo(shop.shop_type);
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={shop.id} className="shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold">{shop.name}</h3>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{shop.location}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-end gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-4xl font-bold leading-none">{shop.crowd_count}</p>
                      <p className="mt-1 text-xs text-muted-foreground">people</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className={`h-2 w-2 animate-pulse rounded-full ${status.dot}`} />
                      <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                  </div>
                  {shop.crowd_count > 25 && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Very busy — consider visiting later
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Updated {timeAgo(shop.updated_at)}</p>
                </CardContent>
                <CardFooter className="gap-2 pt-0">
                  {/* Info button for everyone */}
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setInfoShop(shop)}>
                    <Info className="mr-2 h-3.5 w-3.5" />Info
                  </Button>
                  {/* Edit, Delete, Crowd only for owner */}
                  {isOwner(shop) && canWrite && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(shop)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openCrowdUpdate(shop)}>
                        <Users className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(shop.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Dialog */}
      <Dialog open={!!infoShop} onOpenChange={(o) => !o && setInfoShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shop Information</DialogTitle>
          </DialogHeader>
          {infoShop && (() => {
            const status = getCrowdStatus(infoShop.crowd_count);
            const typeInfo = getShopTypeInfo(infoShop.shop_type);
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <typeInfo.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{infoShop.name}</h3>
                    <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{infoShop.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Owner: {infoShop.owner_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Current crowd: <strong>{infoShop.crowd_count}</strong> people</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Last updated {timeAgo(infoShop.updated_at)}</p>
              </div>
            );
          })()}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editShop ? "Edit Shop" : "Add New Shop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Shop Name</Label>
              <Input placeholder="e.g. Main Street Coffee" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Place / Location</Label>
              <Input placeholder="e.g. 123 Main St, City" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Shop Type</Label>
              <Select value={form.shop_type} onValueChange={(v) => setForm((f) => ({ ...f, shop_type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : editShop ? "Save Changes" : "Add Shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crowd Update Dialog */}
      <Dialog open={crowdDialogOpen} onOpenChange={setCrowdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Crowd Count</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>People Count</Label>
              <Input
                type="number"
                min="0"
                placeholder="Enter current crowd count"
                value={crowdForm.count}
                onChange={(e) => setCrowdForm((f) => ({ ...f, count: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCrowdUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the shop and its crowd data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
