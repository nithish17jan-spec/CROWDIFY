import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Camera, Save, Shield, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useUserRole } from "@/hooks/use-user-role";

export default function Profile() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const { roles, loading: rolesLoading } = useUserRole();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, full_name: fullName });
    }
    setSaving(false);
    if (authError) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    shop_owner: "Shop Owner",
    viewer: "Viewer",
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-hero text-2xl font-bold text-white">
                {fullName ? fullName[0].toUpperCase() : email[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle>{fullName || "Your Name"}</CardTitle>
              <p className="text-sm text-muted-foreground">{email}</p>
              {!rolesLoading && roles.length > 0 && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      {roleLabels[role] || role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                className="pl-9"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" className="pl-9" value={email} disabled readOnly />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed after signup</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </div>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Changes</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Preferences */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  theme === value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
