import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Flame,
  Brain,
  CalendarDays,
  TrendingUp,
  Zap,
  Activity,
  ArrowRight,
  ChevronRight,
  Dumbbell,
  Sparkles,
  Timer,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI_COACH — Your AI Personal Trainer" },
      { name: "description", content: "AI-powered personal training. Daily check-ins, adaptive workouts, calendar streaks." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.navigate({ to: profile?.onboarded ? "/dashboard" : "/onboarding" });
    }
  }, [session, profile, loading, router]);

  if (loading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading AI_COACH…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001e2b]">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">AI_COACH</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="btn-pill bg-secondary text-foreground hover:bg-muted"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="btn-pill bg-primary text-primary-foreground hover:opacity-90 glow-primary"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered training, personalized for you
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
              Train smarter with{" "}
              <span className="text-gradient">AI_COACH</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Daily readiness check-ins, adaptive 3-day split workouts, and intelligent progress tracking — all powered by AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="btn-pill inline-flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 glow-primary"
              >
                Start training free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="btn-pill inline-flex items-center gap-2 bg-secondary text-foreground hover:bg-muted"
              >
                See how it works
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" /> AI generated
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-primary" /> Adaptive plans
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Goal focused
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto mt-16 max-w-4xl">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#001e2b]">
                    <Flame className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-display font-bold">Weekly Schedule</span>
                </div>
                <span className="rounded-full bg-[color:var(--green-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--green-dark)]">
                  Mon · Wed · Fri
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: "Mo", label: "C·B", active: true },
                  { day: "Tu", label: "Rest", active: false },
                  { day: "We", label: "T·B", active: true },
                  { day: "Th", label: "Rest", active: false },
                  { day: "Fr", label: "S·L", active: true },
                  { day: "Sa", label: "Rest", active: false },
                  { day: "Su", label: "Rest", active: false },
                ].map((d) => (
                  <div
                    key={d.day}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 ${
                      d.active
                        ? "border-primary bg-[color:var(--green-soft)]"
                        : "border-border bg-secondary/30"
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">{d.day}</span>
                    <span className={`text-xs font-bold ${d.active ? "text-[color:var(--green-dark)]" : "text-muted-foreground"}`}>
                      {d.label}
                    </span>
                    {d.active && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-primary/30 bg-[color:var(--green-soft)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--green-dark)]">
                  <Brain className="h-4 w-4" />
                  Monday — Chest + Biceps
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bench Press · Incline Dumbbell Press · Cable Flys · Barbell Curls · Hammer Curls
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Everything you need to <span className="text-gradient">level up</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              No more guesswork. Your AI coach adapts to your body, schedule, and goals.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI-Generated Workouts"
              desc="Daily plans tailored to your energy, soreness, and available time. No two workouts are the same."
            />
            <FeatureCard
              icon={<CalendarDays className="h-6 w-6" />}
              title="3-Day Split Calendar"
              desc="Monday Chest+Biceps, Wednesday Triceps+Back, Friday Shoulders+Legs. Rest days built in."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Smart Progression"
              desc="AI scales volume and difficulty based on your check-in data. Continuous improvement, zero plateaus."
            />
            <FeatureCard
              icon={<Timer className="h-6 w-6" />}
              title="Built-In Timer"
              desc="Rest timers, exercise timers, and total workout duration tracking — all in one place."
            />
            <FeatureCard
              icon={<Dumbbell className="h-6 w-6" />}
              title="Equipment Adaptable"
              desc="Full gym, home gym, or bodyweight only. The AI adjusts exercises to match what you have."
            />
            <FeatureCard
              icon={<Activity className="h-6 w-6" />}
              title="Readiness Check-In"
              desc="A quick 30-second daily survey tunes your workout intensity based on how you feel."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            How <span className="text-gradient">AI_COACH</span> works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Three simple steps between you and your next workout.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <StepCard
            step="1"
            title="Check in daily"
            desc="Tell us how you feel — energy, soreness, and how much time you have. Takes 30 seconds."
          />
          <StepCard
            step="2"
            title="Get your plan"
            desc="AI generates a personalized workout for the day based on your split, equipment, and readiness."
          />
          <StepCard
            step="3"
            title="Train & track"
            desc="Follow the workout, mark exercises complete, and watch your streak grow."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-dark" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-bold text-white md:text-5xl">
            Ready to start your <span className="text-primary">first workout?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            Join thousands using AI_COACH to train smarter, recover better, and hit their goals faster.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="btn-pill inline-flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 glow-primary"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="btn-pill inline-flex items-center gap-2 border border-white/20 text-white hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#001e2b]">
              <Flame className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-display text-sm font-bold">AI_COACH</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for athletes who want intelligent training.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50 hover:shadow-lg">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--green-soft)] text-[color:var(--green-dark)] transition group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mb-2 font-display text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="mb-2 font-display text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
