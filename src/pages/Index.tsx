import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wifi, Users, Cpu, BarChart3, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "ESP32 IoT Devices",
    desc: "Connect ESP32 sensors to track real-time foot traffic automatically.",
  },
  {
    icon: Users,
    title: "Live Crowd Counts",
    desc: "See how many people are in your shops right now with instant updates.",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    desc: "Monitor all your locations from one beautiful, real-time dashboard.",
  },
];

const steps = [
  { num: "1", title: "Add Your Shop", desc: "Register your shop or location in seconds." },
  { num: "2", title: "Connect ESP32", desc: "Link an ESP32 device to start counting." },
  { num: "3", title: "Monitor Live", desc: "Watch crowd levels update in real time." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Wifi className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Crowdifyyy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/check">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Check Crowd
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
            <CheckCircle className="h-4 w-4" />
            IoT-Powered Crowd Monitoring
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Know How Crowded<br />
            <span className="text-white/80">Before You Go</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Crowdifyyy uses ESP32 IoT sensors to give you real-time crowd data for shops and public spaces. Monitor, manage, and share crowd levels effortlessly.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="h-13 bg-white text-primary hover:bg-white/90 font-semibold text-base px-8">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/check">
              <Button size="lg" variant="outline" className="h-13 border-white/30 text-white hover:bg-white/10 text-base px-8">
                Check a Location
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Why Crowdifyyy?</h2>
          <p className="mt-3 text-muted-foreground">Smart crowd monitoring made simple with IoT technology.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="shadow-card text-center">
              <CardContent className="pt-8 pb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero">
                  <f.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="mt-3 text-muted-foreground">Get up and running in 3 simple steps.</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-hero text-xl font-bold text-white">
                  {s.num}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl gradient-hero p-12 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Monitor Crowds?</h2>
          <p className="mt-3 text-lg text-white/70">
            Create your free account and start tracking crowd levels in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            <span className="font-semibold">Crowdifyyy</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Crowdifyyy</p>
        </div>
      </footer>
    </div>
  );
}
