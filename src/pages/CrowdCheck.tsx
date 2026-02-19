import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Wifi, Search, MapPin, Users, Clock, ArrowLeft } from "lucide-react";

interface ShopResult {
  id: string;
  name: string;
  location: string;
  crowd_count: number;
  updated_at: string;
}

function getCrowdStatus(count: number) {
  if (count <= 10) return { label: "Low", cls: "bg-crowd-low", emoji: "🟢" };
  if (count <= 25) return { label: "Medium", cls: "bg-crowd-medium", emoji: "🟡" };
  return { label: "High", cls: "bg-crowd-high", emoji: "🔴" };
}

function getAdvice(count: number) {
  if (count <= 10) return "Great time to visit! Very few people.";
  if (count <= 25) return "Moderate crowd. Plan accordingly.";
  return "Very busy right now. Consider visiting later.";
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function CrowdCheck() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShopResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data } = await supabase
      .from("shops")
      .select("id, name, location, crowd_count, updated_at")
      .eq("is_public", true)
      .or(`name.ilike.%${query}%,location.ilike.%${query}%`)
      .order("crowd_count", { ascending: false })
      .limit(20);

    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-hero px-6 py-12 text-center">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Wifi className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Check Crowd Levels</h1>
          <p className="mt-3 text-lg text-white/80">
            Search any shop or location to see how crowded it is right now.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by shop name or location..."
                className="h-12 bg-white pl-9 text-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-white text-primary hover:bg-white/90" disabled={loading}>
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : "Search"}
            </Button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {!searched ? (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { emoji: "🔍", title: "Search", desc: "Type a shop name or location above" },
                { emoji: "📊", title: "View Count", desc: "See the live crowd count and status" },
                { emoji: "✅", title: "Decide", desc: "Plan your visit at the right time" },
              ].map((step) => (
                <Card key={step.title} className="shadow-card">
                  <CardContent className="pt-6 text-center">
                    <div className="mb-3 text-3xl">{step.emoji}</div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-semibold">No results found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different shop name or location</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
            {results.map((shop) => {
              const status = getCrowdStatus(shop.crowd_count);
              return (
                <Card key={shop.id} className="shadow-card transition-all hover:shadow-card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{shop.name}</CardTitle>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{shop.location}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${status.cls}`}>
                        {status.emoji} {status.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold">{shop.crowd_count}</p>
                          <p className="text-xs text-muted-foreground">people counted</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{getAdvice(shop.crowd_count)}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Updated {timeAgo(shop.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Sign in to manage your own shops
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
