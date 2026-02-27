import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wifi, Store, Users } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Onboarding() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"shop_owner" | "viewer">("shop_owner");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role });

    setLoading(false);
    if (error) {
      toast.error("Failed to set role. Please try again.");
    } else {
      toast.success("Welcome to CrowdSense!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hero">
            <Wifi className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">CrowdSense</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">One more step!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you'd like to use CrowdSense
          </p>
        </div>

        <RadioGroup
          value={role}
          onValueChange={(v) => setRole(v as "shop_owner" | "viewer")}
          className="grid grid-cols-2 gap-4"
        >
          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all ${
              role === "shop_owner"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="shop_owner" className="sr-only" />
            <Store className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Shop Owner</span>
            <span className="text-xs text-muted-foreground text-center">
              Add & manage shops and devices
            </span>
          </label>
          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all ${
              role === "viewer"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="viewer" className="sr-only" />
            <Users className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Normal User</span>
            <span className="text-xs text-muted-foreground text-center">
              View crowd data only
            </span>
          </label>
        </RadioGroup>

        <Button
          onClick={handleContinue}
          className="h-11 w-full"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Setting up...
            </div>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
