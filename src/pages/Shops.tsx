import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Store, RefreshCw, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Shop {
  id: string;
  name: string;
  location: string;
  crowd_count: number;
  is_public: boolean;
  updated_at: string;
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
  const [form, setForm] = useState({ name: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchShops = useCallback(async () => {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load shops");
    else setShops(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShops();
    const interval = setInterval(fetchShops, 10000);
    return () => clearInterval(interval);
  }, [fetchShops]);

  const openAdd = () => {
    setEditShop(null);
    setForm({ name: "", location: "" });
    setDialogOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditShop(shop);
    setForm({ name: shop.name, location: shop.location });
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
        .update({ name: form.name, location: form.location })
        .eq("id", editShop.id);
      if (error) toast.error("Failed to update shop");
      else { toast.success("Shop updated!"); fetchShops(); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("shops").insert({
        name: form.name,
        location: form.location,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shops</h1>
          <p className="text-sm text-muted-foreground">Manage your monitored locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchShops(); toast.success("Refreshed!"); }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shop
          </Button>
        </div>
      </div>

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
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Shop</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => {
            const status = getCrowdStatus(shop.crowd_count);
            return (
              <Card key={shop.id} className="shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{shop.name}</h3>
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
                  <p className="mt-3 text-xs text-muted-foreground">Updated {timeAgo(shop.updated_at)}</p>
                </CardContent>
                <CardFooter className="gap-2 pt-0">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(shop)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(shop.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

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
              <Label>Location</Label>
              <Input placeholder="e.g. 123 Main St, City" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
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
