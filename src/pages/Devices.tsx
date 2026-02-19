import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Cpu, RefreshCw, Copy, Check, RotateCcw, Key } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Device {
  id: string;
  device_name: string;
  device_uid: string;
  shop_id: string | null;
  last_seen: string | null;
  updated_at: string;
}

interface Shop {
  id: string;
  name: string;
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [form, setForm] = useState({ device_name: "", device_uid: "", shop_id: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [projectUrl] = useState(`https://rvojzpwkcecjrykhpfnb.supabase.co/functions/v1`);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [devRes, shopRes, keyRes] = await Promise.all([
      supabase.from("esp32_devices").select("*").order("created_at", { ascending: false }),
      supabase.from("shops").select("id, name"),
      supabase.from("api_keys").select("api_key").eq("user_id", user.id).single(),
    ]);

    setDevices(devRes.data || []);
    setShops(shopRes.data || []);
    if (keyRes.data) setApiKey(keyRes.data.api_key);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const openAdd = () => {
    setEditDevice(null);
    setForm({ device_name: "", device_uid: "", shop_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditDevice(device);
    setForm({ device_name: device.device_name, device_uid: device.device_uid, shop_id: device.shop_id || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.device_name.trim() || !form.device_uid.trim()) {
      toast.error("Device name and ID are required");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (editDevice) {
      const { error } = await supabase
        .from("esp32_devices")
        .update({ device_name: form.device_name, device_uid: form.device_uid, shop_id: form.shop_id || null })
        .eq("id", editDevice.id);
      if (error) toast.error(error.message.includes("unique") ? "Device ID already in use" : "Failed to update device");
      else { toast.success("Device updated!"); fetchAll(); }
    } else {
      const { error } = await supabase.from("esp32_devices").insert({
        device_name: form.device_name,
        device_uid: form.device_uid,
        shop_id: form.shop_id || null,
        user_id: user!.id,
      });
      if (error) toast.error(error.message.includes("unique") ? "Device ID already in use" : "Failed to add device");
      else { toast.success("Device added!"); fetchAll(); }
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("esp32_devices").delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete device");
    else { toast.success("Device deleted"); fetchAll(); }
    setDeleteId(null);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabase.from("api_keys").update({ api_key: newKey }).eq("user_id", user!.id);
    if (error) toast.error("Failed to regenerate key");
    else { setApiKey(newKey); toast.success("API key regenerated!"); }
    setRegenerating(false);
  };

  const copyText = (text: string, setCb: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCb(true);
    setTimeout(() => setCb(false), 2000);
  };

  const arduinoCode = `#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiKey = "${apiKey}";
const char* deviceId = "YOUR_DEVICE_UID";
const char* serverUrl = "${projectUrl}/esp32-update";

// Count people using IR sensors or ultrasonic
int getPeopleCount() {
  // TODO: Replace with your actual sensor reading
  return analogRead(34) > 2000 ? 1 : 0;
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    int count = getPeopleCount();
    String body = "{\\"device_id\\":\\"" + String(deviceId) +
                  "\\",\\"people_count\\":" + String(count) +
                  ",\\"api_key\\":\\"" + String(apiKey) + "\\"}";
    
    int code = http.POST(body);
    Serial.println("Response: " + String(code));
    http.end();
  }
  delay(30000); // Send every 30 seconds
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ESP32 Devices</h1>
          <p className="text-sm text-muted-foreground">Manage your IoT crowd sensors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchAll(); toast.success("Refreshed!"); }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
      </div>

      {/* API Key Card */}
      <Card className="border-primary/20 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Your API Key</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Use this key to authenticate your ESP32 devices when sending data.</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={apiKey || "Loading..."}
              className="font-mono text-xs"
              type="password"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            />
            <Button variant="outline" size="sm" onClick={() => copyText(apiKey, setCopiedKey)} disabled={!apiKey}>
              {copiedKey ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
              <RotateCcw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Devices Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <Cpu className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">No devices yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add an ESP32 device and link it to a shop.</p>
            </div>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Device</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => {
            const online = isOnline(device.last_seen);
            const shop = shops.find((s) => s.id === device.shop_id);
            return (
              <Card key={device.id} className="shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{device.device_name}</h3>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{device.device_uid}</p>
                    </div>
                    <span className={`ml-2 shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                      {online ? "Online" : "Offline"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Linked shop</span>
                    <span className="font-medium">{shop?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last seen</span>
                    <span className="font-medium">{timeAgo(device.last_seen)}</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 pt-0">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(device)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(device.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Arduino Code Section */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">ESP32 Arduino Code</h3>
            <Button variant="outline" size="sm" onClick={() => copyText(arduinoCode, setCopied)}>
              {copied ? <><Check className="mr-2 h-4 w-4 text-green-600" />Copied!</> : <><Copy className="mr-2 h-4 w-4" />Copy Code</>}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Copy this code into your Arduino IDE. Your API key is pre-filled.</p>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
            <code>{arduinoCode}</code>
          </pre>
        </CardContent>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-2 text-sm font-semibold text-primary">API Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-mono text-primary-foreground">POST</span>
                <span className="ml-2 font-mono text-xs">{projectUrl}/esp32-update</span>
              </div>
              <div>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">GET</span>
                <span className="ml-2 font-mono text-xs">{projectUrl}/esp32-status?device_id=XXX&api_key=YYY</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDevice ? "Edit Device" : "Add ESP32 Device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input placeholder="e.g. Entrance Sensor 1" value={form.device_name} onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Unique Device ID</Label>
              <Input placeholder="e.g. ESP32-A1B2C3" className="font-mono" value={form.device_uid} onChange={(e) => setForm((f) => ({ ...f, device_uid: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Use the MAC address or a custom unique identifier</p>
            </div>
            <div className="space-y-2">
              <Label>Link to Shop (optional)</Label>
              <Select value={form.shop_id} onValueChange={(v) => setForm((f) => ({ ...f, shop_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop..." />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : editDevice ? "Save Changes" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this device. The ESP32 will no longer be able to send data.</AlertDialogDescription>
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
