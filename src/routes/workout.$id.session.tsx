import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Pause, Check, Loader2, ChevronLeft, ChevronRight,
  RotateCcw, Flame, Snowflake, Dumbbell, Sparkles, X,
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

function fmt(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const SECTION_META = {
  warmup: { label: "Warm-up", Icon: Flame, color: "text-accent", bg: "bg-accent/15", border: "border-accent/30" },
  main:   { label: "Main",    Icon: Dumbbell, color: "text-primary", bg: "bg-primary/15", border: "border-primary/30" },
  cool:   { label: "Cool-down", Icon: Snowflake, color: "text-accent", bg: "bg-accent/15", border: "border-accent/30" },
} as const;

function SessionPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [idx, setIdx] = useState(0);
  const [elapsedMap, setElapsedMap] = useState<Record<string, number>>({});
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
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
  const currentKey = current?.key;
  const elapsed = currentKey ? (elapsedMap[currentKey] ?? 0) : 0;
  const target = current?.ex.target_seconds ?? 0;
  const pct = target > 0 ? Math.min(100, (elapsed / target) * 100) : 0;
  const totalElapsed = useMemo(
    () => Object.values(elapsedMap).reduce((s, v) => s + v, 0),
    [elapsedMap],
  );
  const doneCount = useMemo(
    () => items.filter((it) => doneMap[it.key]).length,
    [items, doneMap],
  );

  // Pause when navigating between exercises
  useEffect(() => { setRunning(false); }, [idx]);

  // Ticking
  useEffect(() => {
    if (!running || !currentKey) return;
    tickRef.current = window.setInterval(() => {
      setElapsedMap((m) => ({ ...m, [currentKey]: (m[currentKey] ?? 0) + 1 }));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, currentKey]);

  const resetCurrent = () => {
    if (!currentKey) return;
    setRunning(false);
    setElapsedMap((m) => ({ ...m, [currentKey]: 0 }));
  };

  const markDoneAndNext = () => {
    if (!currentKey) return;
    setRunning(false);
    setDoneMap((m) => ({ ...m, [currentKey]: true }));
    if (idx < items.length - 1) setIdx(idx + 1);
  };

  const goPrev = () => idx > 0 && setIdx(idx - 1);
  const goNext = () => idx < items.length - 1 && setIdx(idx + 1);

  const finishWorkout = async () => {
    if (!user) return;
    setRunning(false);
    setCompleting(true);
    const { error } = await supabase
      .from("workouts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: totalElapsed,
      })
      .eq("id", id);
    setCompleting(false);
    if (error) { toast.error(error.message); return; }
    setStatus("completed");
    toast.success("💪 Workout completed! Streak +1");
    setTimeout(() => router.navigate({ to: "/dashboard" }), 800);
  };

  if (!plan || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const meta = SECTION_META[current.section];
  const Icon = meta.Icon;
  const isCompleted = status === "completed";
  const isLast = idx === items.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/workout/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </Link>
          <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">
            Exercise {idx + 1} / {items.length}
          </div>
          <div className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-mono tabular-nums text-muted-foreground">
            Σ {fmt(totalElapsed)}
          </div>
        </div>

        {/* Progress bar (overall) */}
        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>

        {/* Section pill */}
        <div className={`mb-4 inline-flex w-fit items-center gap-2 self-center rounded-full border ${meta.border} ${meta.bg} px-3 py-1`}>
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
        </div>

        {/* Exercise name */}
        <h1 className="mb-2 text-center font-display text-4xl font-bold leading-tight">
          {current.ex.name}
        </h1>

        {/* Specs */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          {current.ex.sets && <Chip>{current.ex.sets} sets</Chip>}
          {current.ex.reps && <Chip>{current.ex.reps} reps</Chip>}
          {current.ex.duration && <Chip>{current.ex.duration}</Chip>}
          {current.ex.rest && <Chip tone="muted">rest {current.ex.rest}</Chip>}
          <Chip tone="accent">target ~{fmtTarget(current.ex.target_seconds)}</Chip>
        </div>

        {/* Notes */}
        {current.ex.notes && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">{current.ex.notes}</p>
          </div>
        )}

        {/* Big timer */}
        <div className="my-4 flex flex-1 flex-col items-center justify-center">
          <div className="relative">
            <svg className="h-64 w-64 -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" className="fill-none stroke-secondary" strokeWidth="10" />
              <circle
                cx="100" cy="100" r="92"
                className="fill-none stroke-primary transition-all duration-300"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 92}
                strokeDashoffset={2 * Math.PI * 92 * (1 - pct / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-6xl font-bold tabular-nums text-gradient">
                {fmt(elapsed)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                of ~{fmtTarget(target)}
              </div>
              {doneMap[currentKey!] && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  <Check className="h-3 w-3" /> Done
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={resetCurrent}
              disabled={isCompleted || elapsed === 0}
              title="Reset"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              disabled={isCompleted}
              className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50 glow-primary"
            >
              {running ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
            </button>
            <button
              onClick={markDoneAndNext}
              disabled={isCompleted}
              title="Mark done & next"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary transition hover:bg-primary/30 disabled:opacity-40"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary/70 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          {isLast ? (
            <button
              onClick={finishWorkout}
              disabled={completing || isCompleted}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 glow-primary"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finish workout
            </button>
          ) : (
            <div className="text-xs text-muted-foreground">
              {doneCount} / {items.length} done
            </div>
          )}

          <button
            onClick={goNext}
            disabled={isLast}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary/70 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mini queue */}
        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2">
          {items.map((it, i) => {
            const isDone = doneMap[it.key];
            const isCur = i === idx;
            return (
              <button
                key={it.key}
                onClick={() => setIdx(i)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-mono transition ${
                  isCur ? "bg-primary text-primary-foreground" :
                  isDone ? "bg-primary/20 text-primary" :
                  "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                title={it.ex.name}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
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
