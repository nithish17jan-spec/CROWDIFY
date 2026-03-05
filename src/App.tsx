import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import { useUserRole } from "@/hooks/use-user-role";
import Shops from "./pages/Shops";
import Devices from "./pages/Devices";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import CrowdCheck from "./pages/CrowdCheck";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

function OwnerOnlyRoute({ children }: { children: React.ReactNode }) {
  const { canWrite, loading } = useUserRole();
  if (loading) return null;
  if (!canWrite) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ProtectedRoute({ session, hasRole, children }: { session: Session | null; hasRole: boolean | null; children: React.ReactNode }) {
  if (!session) return <Navigate to="/login" replace />;
  if (hasRole === null) return null; // still loading
  if (!hasRole) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AuthRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppContent = () => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [hasRole, setHasRole] = useState<boolean | null>(null);

  const clearAuth = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setHasRole(null);
  };

  const syncAuthState = async (localSession: Session | null) => {
    if (!localSession) {
      setSession(null);
      setHasRole(null);
      return;
    }
    // Validate token server-side
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      await clearAuth();
      return;
    }
    setSession(localSession);
    // Check role
    const { data, error: roleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (roleError && roleError.message?.includes("JWT")) {
      await clearAuth();
      return;
    }
    setHasRole(!!(data && data.length > 0));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncAuthState(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<AuthRoute session={session}><Login /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute session={session}><Signup /></AuthRoute>} />
      <Route path="/onboarding" element={session ? (hasRole ? <Navigate to="/dashboard" replace /> : <Onboarding onRoleSet={() => setHasRole(true)} />) : <Navigate to="/login" replace />} />
      <Route path="/check" element={<CrowdCheck />} />
      <Route path="/" element={<ProtectedRoute session={session} hasRole={hasRole}><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shops" element={<Shops />} />
        <Route path="devices" element={<OwnerOnlyRoute><Devices /></OwnerOnlyRoute>} />
        <Route path="analytics" element={<OwnerOnlyRoute><Analytics /></OwnerOnlyRoute>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
