import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Pause, Check, Loader2, RotateCcw,
  Flame, Snowflake, Dumbbell, Sparkles, X, Coffee, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutPlan, Exercise } from "@/lib/generate-workout";
import { fmtTarget } from "@/lib/generate-workout";
import { toast } from "sonner";

export const Route = createFileRoute("/workout/$id/session")({
  head: () => ({ meta: [{ title: "Session · AI_COACH" }] }),
  component: SessionPage,
});

type FlatItem = { key: string; section: "warmup" | "main" | "cool"; ex: Exercise };
type Phase = "ready" | "working" | "rest" | "finished";

function fmt(sec: number) {
  const m = String(Math.floor(Math.max(0, sec) / 60)).padStart(2, "0");
  const s = String(Math.max(0, sec) % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Parse "30s", "45 sec", "1 min", "2 minutes" → seconds. Default 30s.
function parseRest(rest?: string): number {
  if (!rest) return 30;
  const s = rest.toLowerCase();
  const min = s.match(/(\d+)\s*m/);
  const sec = s.match(/(\d+)\s*s/);
  let total = 0;
  if (min) total += parseInt(min[1], 10) * 60;
  if (sec) total += parseInt(sec[1], 10);
  if (!total) {
    const n = s.match(/(\d+)/);
    if (n) total = parseInt(n[1], 10);
  }
  return total || 30;
}

const SECTION_META = {
  warmup: { label: "Warm-up", Icon: Flame, color: "text-accent", bg: "bg-accent/15", border: "border-accent/40" },
  main:   { label: "Main",    Icon: Dumbbell, color: "text-primary", bg: "bg-primary/15", border: "border-primary/40" },
  cool:   { label: "Cool-down", Icon: Snowflake, color: "text-accent", bg: "bg-accent/15", border: "border-accent/40" },
} as const;

function SessionPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [workElapsed, setWorkElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [totals, setTotals] = useState<{ work: number; rest: number }>({ work: 0, rest: 0 });
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("plan, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        setPlan(data.plan as WorkoutPlan);
        setStatus(data.status);
      });
  }, [id, user]);

  const items: FlatItem[] = useMemo(() => {
    if (!plan) return [];
    const list: FlatItem[] = [];
    plan.warmup.forEach((ex, i) => list.push({ key: `warmup-${i}`, section: "warmup", ex }));
    plan.main.forEach((ex, i) => list.push({ key: `main-${i}`, section: "main", ex }));
    plan.cooldown.forEach((ex, i) => list.push({ key: `cool-${i}`, section: "cool", ex }));
    return list;
  }, [plan]);

  const current = items[idx];
  const target = current?.ex.target_seconds ?? 0;
  const restTotal = useMemo(() => parseRest(current?.ex.rest), [current]);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      if (phase === "working") {
        setWorkElapsed((s) => s + 1);
      } else if (phase === "rest") {
        setRestLeft((s) => {
          if (s <= 1) {
            // auto-advance to next exercise
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, phase]);

  // Auto-transition when rest hits zero
  useEffect(() => {
    if (phase === "rest" && restLeft === 0 && running) {
      setRunning(false);
      advanceToNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft, phase, running]);

  const startExercise = () => {
    setWorkElapsed(0);
    setPhase("working");
    setRunning(true);
  };

  const finishExercise = () => {
    setRunning(false);
    setTotals((t) => ({ ...t, work: t.work + workElapsed }));
    const isLast = idx === items.length - 1;
    if (isLast) {
      setPhase("finished");
      void finishWorkout(totals.work + workElapsed + totals.rest);
    } else {
      setRestLeft(restTotal);
      setPhase("rest");
      setRunning(true);
    }
  };

  const skipRest = () => {
    setRunning(false);
    setTotals((t) => ({ ...t, rest: t.rest + (restTotal - restLeft) }));
    advanceToNext();
  };

  const advanceToNext = () => {
    setTotals((t) => ({ ...t, rest: t.rest + restTotal })); // count full rest
    setIdx((i) => Math.min(i + 1, items.length - 1));
    setPhase("ready");
    setWorkElapsed(0);
    setRestLeft(0);
    setRunning(false);
  };

  const finishWorkout = async (finalSeconds: number) => {
    if (!user) return;
    setRunning(false);
    setCompleting(true);
    const { error } = await supabase
      .from("workouts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: finalSeconds,
      })
      .eq("id", id);
    setCompleting(false);
    if (error) { toast.error(error.message); return; }
    setStatus("completed");
    toast.success("💪 Workout completed! Streak +1");
    setTimeout(() => router.navigate({ to: "/dashboard" }), 1200);
  };

  if (!plan || !current) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const meta = SECTION_META[current.section];
  const Icon = meta.Icon;
  const overallPct = (idx / items.length) * 100;
  const workPct = target > 0 ? Math.min(100, (workElapsed / target) * 100) : 0;
  const restPct = restTotal > 0 ? ((restTotal - restLeft) / restTotal) * 100 : 0;

  // ===== FINISHED SCREEN =====
  if (phase === "finished" || status === "completed") {
    const total = totals.work + totals.rest;
    return (
      <FullScreen>
        <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 glow-primary">
            <Check className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-3 font-display text-5xl font-bold text-gradient">Workout complete!</h1>
          <p className="mb-8 text-muted-foreground">Great work. Streak +1 🔥</p>
          <div className="mb-8 grid grid-cols-3 gap-3 text-center">
            <Stat label="Total" value={fmt(total)} />
            <Stat label="Work" value={fmt(totals.work)} />
            <Stat label="Rest" value={fmt(totals.rest)} />
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground glow-primary"
          >
            Back to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          {completing && <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />}
        </div>
      </FullScreen>
    );
  }

  // ===== REST SCREEN =====
  if (phase === "rest") {
    const next = items[idx + 1];
    return (
      <FullScreen tint="rest">
        <TopBar idx={idx} total={items.length} overallPct={overallPct} workoutId={id} />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1">
            <Coffee className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Rest</span>
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold">Take a breath</h1>
          {next && (
            <p className="mb-8 text-sm text-muted-foreground">
              Next: <span className="text-foreground">{next.ex.name}</span>
            </p>
          )}

          <RingTimer
            pct={restPct}
            big={fmt(restLeft)}
            small={`of ${fmt(restTotal)}`}
            color="accent"
          />

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/70"
            >
              {running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
            </button>
            <button
              onClick={skipRest}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground glow-primary transition hover:opacity-90"
            >
              Skip rest <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </FullScreen>
    );
  }

  // ===== READY / WORKING SCREEN =====
  return (
    <FullScreen>
      <TopBar idx={idx} total={items.length} overallPct={overallPct} workoutId={id} />

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full border ${meta.border} ${meta.bg} px-3 py-1`}>
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
        </div>

        <h1 className="mb-3 font-display text-4xl font-bold leading-tight md:text-5xl">
          {current.ex.name}
        </h1>

        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          {current.ex.sets && <Chip>{current.ex.sets} sets</Chip>}
          {current.ex.reps && <Chip>{current.ex.reps} reps</Chip>}
          {current.ex.duration && <Chip>{current.ex.duration}</Chip>}
          {current.ex.rest && <Chip tone="muted">rest {current.ex.rest}</Chip>}
          <Chip tone="accent">target ~{fmtTarget(target)}</Chip>
        </div>

        {current.ex.notes && (
          <div className="mb-6 flex max-w-md items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">{current.ex.notes}</p>
          </div>
        )}

        <RingTimer
          pct={phase === "working" ? workPct : 0}
          big={fmt(workElapsed)}
          small={`of ~${fmtTarget(target)}`}
          color="primary"
        />

        <div className="mt-8 flex items-center gap-3">
          {phase === "ready" ? (
            <button
              onClick={startExercise}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground glow-primary transition hover:opacity-90"
            >
              <Play className="h-5 w-5" /> Start
            </button>
          ) : (
            <>
              <button
                onClick={() => { setRunning(false); setWorkElapsed(0); }}
                disabled={workElapsed === 0}
                title="Reset"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRunning((r) => !r)}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-foreground shadow-lg transition hover:bg-secondary/70"
              >
                {running ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
              </button>
              <button
                onClick={finishExercise}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground glow-primary transition hover:opacity-90"
              >
                <Check className="h-4 w-4" />
                {idx === items.length - 1 ? "Finish" : "Done"}
              </button>
            </>
          )}
        </div>
      </div>
    </FullScreen>
  );
}

function FullScreen({ children, tint }: { children: React.ReactNode; tint?: "rest" }) {
  const bg = tint === "rest"
    ? "bg-gradient-to-br from-accent/10 via-background to-background"
    : "bg-gradient-to-br from-background via-secondary/20 to-background";
  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden ${bg}`}>
      {children}
    </div>
  );
}

function TopBar({ idx, total, overallPct, workoutId }: { idx: number; total: number; overallPct: number; workoutId: string }) {
  return (
    <div className="w-full px-4 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          to="/workout/$id"
          params={{ id: workoutId }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Exit
        </Link>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {idx + 1} / {total}
        </div>
        <div className="w-[60px]" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${overallPct}%` }}
        />
      </div>
    </div>
  );
}

function RingTimer({ pct, big, small, color }: { pct: number; big: string; small: string; color: "primary" | "accent" }) {
  const stroke = color === "primary" ? "stroke-primary" : "stroke-accent";
  return (
    <div className="relative">
      <svg className="h-64 w-64 -rotate-90 sm:h-72 sm:w-72" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" className="fill-none stroke-secondary" strokeWidth="10" />
        <circle
          cx="100" cy="100" r="92"
          className={`fill-none ${stroke} transition-all duration-300`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 92}
          strokeDashoffset={2 * Math.PI * 92 * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-6xl font-bold tabular-nums text-gradient sm:text-7xl">{big}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{small}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Chip({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "muted" | "accent" }) {
  const c =
    tone === "muted" ? "bg-background text-muted-foreground" :
    tone === "accent" ? "bg-accent/20 text-accent" :
    "bg-primary/15 text-primary";
  return <span className={`rounded-md px-2 py-1 font-mono ${c}`}>{children}</span>;
}
