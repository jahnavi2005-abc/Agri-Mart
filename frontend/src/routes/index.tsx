import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sprout,
  Users,
  TrendingUp,
  Sparkles,
  Star,
  Smartphone,
  Download,
} from "lucide-react";
import { TICKER } from "@/lib/mock-data";
import { Navbar } from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const PARTICLES = ["🌾", "🌽", "🍅", "🌶", "🥬", "🥕", "🍆", "🌿", "🥥", "🍋"];

function Particles() {
  const items = Array.from({ length: 18 }, (_, i) => ({
    emoji: PARTICLES[i % PARTICLES.length],
    left: (i * 53) % 100,
    delay: (i * 1.7) % 25,
    duration: 18 + (i % 5) * 4,
    size: 14 + (i % 4) * 6,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute opacity-40"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animation: `drift ${p.duration}s linear infinite`,
            animationDelay: `-${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

function CountUp({
  end,
  suffix = "",
  duration = 1800,
}: {
  end: number;
  suffix?: string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(end * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);
  return (
    <span ref={ref} className="font-mono">
      {n.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
        <HowItWorks />
        <Testimonials />
        <DownloadApp />
      </main>
      <LandingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative grain overflow-hidden">
      <Particles />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 30%, oklch(0.3 0.12 150 / 0.5), transparent 60%)",
        }}
      />

      {/* Main hero content */}
      <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-24 md:px-8 md:py-32">
        <div className="max-w-4xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md"
            style={{ animation: "var(--animate-fade-up)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Trusted by 2,400+ farmers across India
          </div>

          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            <span className="block overflow-hidden">
              <span
                className="block text-gradient"
                style={{
                  animation: "var(--animate-reveal)",
                  animationDelay: "0.1s",
                  animationFillMode: "backwards",
                }}
              >
                Farm Fresh.
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                className="block"
                style={{
                  animation: "var(--animate-reveal)",
                  animationDelay: "0.3s",
                  animationFillMode: "backwards",
                }}
              >
                No Middlemen.
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                className="block text-gradient-amber"
                style={{
                  animation: "var(--animate-reveal)",
                  animationDelay: "0.5s",
                  animationFillMode: "backwards",
                }}
              >
                Direct to You.
              </span>
            </span>
          </h1>

          <p
            className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
            style={{
              animation: "var(--animate-fade-up)",
              animationDelay: "0.7s",
              animationFillMode: "backwards",
            }}
          >
            India's first true farmer-to-buyer commodity marketplace. Get full price for your
            harvest. Buy fresh, know your farmer.
          </p>

          {/* CTA Buttons */}
          <div
            className="mt-10 flex flex-col gap-3 sm:flex-row"
            style={{
              animation: "var(--animate-fade-up)",
              animationDelay: "0.9s",
              animationFillMode: "backwards",
            }}
          >
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-hero px-8 py-4 text-base font-semibold text-primary-foreground press shadow-glow"
            >
              Start Selling
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/40 px-8 py-4 text-base font-semibold backdrop-blur-md press hover:border-primary/50"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </div>

      {/* Live price ticker — below hero content, no overlap */}
      <div className="relative z-10 overflow-hidden border-y border-border bg-card/40 py-3 backdrop-blur-md">
        <div
          className="flex w-max gap-12 whitespace-nowrap"
          style={{ animation: "var(--animate-marquee)" }}
        >
          {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-2 font-mono text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">{t.split(" ")[0]}</span>
              <span className="text-amber font-semibold">{t.split(" ")[1]}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: 2400, suffix: "+", label: "Active Farmers" },
    { value: 12, suffix: "Cr+", label: "Traded (₹)" },
    { value: 18, suffix: "", label: "States Covered" },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="grid gap-4 rounded-3xl border-t-2 border-primary bg-card/60 p-8 backdrop-blur md:grid-cols-3 md:p-12">
        {stats.map((s, i) => (
          <div key={i} className="text-center md:text-left">
            <div className="font-display text-5xl font-bold text-gradient md:text-7xl">
              <CountUp end={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      Icon: Sprout,
      title: "List Your Crop",
      desc: "Upload photos, set your price per kg. Done in 2 minutes.",
    },
    {
      Icon: Users,
      title: "Buyer Places Order",
      desc: "Verified buyers from your district browse and purchase directly.",
    },
    {
      Icon: TrendingUp,
      title: "Get Paid Directly",
      desc: "Razorpay-secured payments. Money in your account, same day.",
    },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="mb-12 max-w-2xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
          How It Works
        </div>
        <h2 className="font-display text-4xl font-bold md:text-5xl">
          Three steps. <span className="text-gradient">Zero middlemen.</span>
        </h2>
      </div>
      <div className="relative grid gap-6 md:grid-cols-3">
        <svg
          className="absolute left-0 top-12 hidden w-full md:block"
          height="2"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1="16%"
            y1="1"
            x2="84%"
            y2="1"
            stroke="oklch(0.5 0.1 150)"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
        </svg>
        {steps.map((s, i) => (
          <div key={i} className="relative rounded-2xl border border-border bg-card p-6 card-lift">
            <div className="mb-4 flex items-center justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-hero shadow-glow">
                <s.Icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-5xl font-bold text-muted/40">0{i + 1}</span>
            </div>
            <h3 className="text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote: "AgriMart లో నేను నా ధాన్యాన్ని 30% ఎక్కువ ధరకు అమ్మాను.",
      author: "Ravi Kumar",
      role: "Rice Farmer · Guntur, AP",
    },
    {
      quote: "बिचौलिए नहीं, सीधे खरीदार। यह क्रांति है।",
      author: "Suresh Patel",
      role: "Wheat Farmer · Sehore, MP",
    },
    {
      quote: "எனது மிளகாய் இப்போது வெளிநாட்டுக்கும் செல்கிறது.",
      author: "Murugan S",
      role: "Spice Farmer · Erode, TN",
    },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="mb-12 max-w-2xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
          Voices
        </div>
        <h2 className="font-display text-4xl font-bold md:text-5xl">Heard from the farms</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-6 card-lift"
            style={{
              animation: "var(--animate-fade-up)",
              animationDelay: `${i * 100}ms`,
              animationFillMode: "backwards",
            }}
          >
            <div className="mb-4 flex gap-0.5 text-amber">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="font-display text-lg leading-snug">"{t.quote}"</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-hero font-semibold text-primary-foreground">
                {t.author[0]}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.author}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DownloadApp() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 shadow-lift">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white, transparent 50%)" }}
        />
        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          {/* Left: Text & Download Buttons */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur">
              <Smartphone className="h-3.5 w-3.5" /> Available on Android & iOS
            </div>
            <h2 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
              Take AgriMart
              <br />
              everywhere you go.
            </h2>
            <p className="mt-4 text-base text-primary-foreground/80">
              Manage your crops, track orders, and check live prices — all from your phone. Download
              the AgriMart app and stay connected to the market, anytime.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {/* Google Play */}
              <a
                href="#"
                className="group flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-background/10 px-5 py-3.5 backdrop-blur press hover:bg-background/20 transition-all"
              >
                <svg className="h-7 w-7 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3.18 23.5c.28.16.6.23.94.2L16.5 12 12.1 7.6 3.18 23.5Z"
                    fill="#EA4335"
                  />
                  <path
                    d="M20.82 10.33 17.6 8.5l-3.66 3.5 3.66 3.5 3.23-1.84A2 2 0 0 0 20.82 10.33Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M3.12.5A2 2 0 0 0 2 2.27v19.46c0 .7.37 1.32.94 1.77L16.5 12 3.12.5Z"
                    fill="#4285F4"
                  />
                  <path d="M3.18.5 12.1 7.6l4.4-4.4L4.12.3A2 2 0 0 0 3.18.5Z" fill="#34A853" />
                </svg>
                <div>
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-wider">
                    Get it on
                  </div>
                  <div className="text-sm font-bold text-primary-foreground leading-tight">
                    Google Play
                  </div>
                </div>
              </a>

              {/* App Store */}
              <a
                href="#"
                className="group flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-background/10 px-5 py-3.5 backdrop-blur press hover:bg-background/20 transition-all"
              >
                <svg className="h-7 w-7 flex-shrink-0" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.24 1.33-2.21 3.98.03 3.2 2.74 4.29 2.77 4.3l-.03.09c-.23.74-.55 1.48-.98 2.14zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-wider">
                    Download on the
                  </div>
                  <div className="text-sm font-bold text-primary-foreground leading-tight">
                    App Store
                  </div>
                </div>
              </a>
            </div>

            {/* QR hint */}
            <p className="mt-5 flex items-center gap-2 text-xs text-primary-foreground/60">
              <Download className="h-3.5 w-3.5" />
              Scan the QR code on the right to download instantly
            </p>
          </div>

          {/* Right: Phone mockup / QR */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-3xl bg-amber/20 blur-3xl" />
              <div className="relative flex flex-col items-center gap-4">
                {/* Simple phone mockup */}
                <div
                  className="relative h-56 w-28 rounded-3xl border-4 border-primary-foreground/30 bg-background/20 backdrop-blur shadow-2xl flex flex-col items-center justify-center overflow-hidden"
                  style={{ animation: "var(--animate-float)" }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-primary-foreground/20 rounded-b-xl" />
                  <Smartphone className="h-10 w-10 text-primary-foreground/60" />
                  <div className="mt-2 text-[10px] text-primary-foreground/50 font-semibold tracking-wider">
                    AgriMart
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 px-2">
                    {["🌾", "🌽", "🍅", "🥬"].map((e, i) => (
                      <div
                        key={i}
                        className="grid h-6 w-6 place-items-center rounded-lg bg-primary-foreground/10 text-xs"
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>

                {/* QR Code placeholder */}
                <div className="rounded-2xl bg-white p-3 shadow-xl">
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-sm"
                        style={{
                          background: [
                            0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 14, 16, 17, 19, 20, 21, 22, 23, 24,
                          ].includes(i)
                            ? "#16531e"
                            : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 text-center text-[9px] font-bold text-gray-600 tracking-widest">
                    SCAN TO DOWNLOAD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <span>© 2026 AgriMart · Built with 🌾 for India</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">
              Privacy
            </a>
            <a href="#" className="hover:text-primary">
              Terms
            </a>
            <a href="#" className="hover:text-primary">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Landing;
