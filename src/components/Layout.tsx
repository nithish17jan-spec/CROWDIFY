import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Store,
  Cpu,
  User,
  LogOut,
  Menu,
  X,
  Wifi,
  ChevronDown,
  Sun,
  Moon,
  Monitor } from
"lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel } from
"@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { useUserRole } from "@/hooks/use-user-role";

const allNavItems = [
{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", ownerOnly: false },
{ to: "/shops", icon: Store, label: "Shops", ownerOnly: false },
{ to: "/devices", icon: Cpu, label: "Devices", ownerOnly: true }];


export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { canWrite } = useUserRole();

  const navItems = allNavItems.filter((item) => !item.ownerOnly || canWrite);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors duration-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold leading-none text-foreground text-center text-3xl">CROWDIFY</p>
              <p className="text-muted-foreground text-sm">​  </p>
            </div>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, icon: Icon, label }) =>
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              isActive ?
              "bg-primary text-primary-foreground shadow-sm" :
              "text-muted-foreground hover:bg-accent hover:text-foreground"}`

              }>
              
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {resolvedTheme === "dark" ?
                  <Moon className="h-4 w-4" /> :

                  <Sun className="h-4 w-4" />
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent" : ""}>
                  <Sun className="mr-2 h-4 w-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent" : ""}>
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent" : ""}>
                  <Monitor className="mr-2 h-4 w-4" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-hero text-xs font-bold text-white">
                    <User className="h-4 w-4" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}>
              
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen &&
        <nav className="animate-in slide-in-from-top-2 border-t bg-card px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map(({ to, icon: Icon, label }) =>
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:bg-accent hover:text-foreground"}`

              }>
              
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
            )}
              <button
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
              
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </nav>
        }
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>);

}