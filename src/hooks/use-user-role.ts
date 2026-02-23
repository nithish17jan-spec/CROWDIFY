import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "shop_owner" | "viewer";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setRoles((data || []).map((r: any) => r.role as AppRole));
      setLoading(false);
    };
    fetchRoles();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isOwner = hasRole("shop_owner");
  const isViewer = hasRole("viewer");
  const canWrite = isAdmin || isOwner;

  return { roles, loading, hasRole, isAdmin, isOwner, isViewer, canWrite };
}
