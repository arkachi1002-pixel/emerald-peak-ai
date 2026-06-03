import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Check, Loader2, Flame, Snowflake, Dumbbell, Sparkles, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutPlan, Exercise } from "@/lib/generate-workout";
import { toast } from "sonner";

export const Route = createFileRoute("/workout/$id")({
  head: () => ({ meta: [{ title: "Workout · AI_COACH" }] }),
  component: WorkoutDetail,
});

type TimerMap = Record<string, { elapsed: number; done: boolean }>;

function fmt(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function WorkoutDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [timers, setTimers] = useState<TimerMap>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

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

  // Single ticking interval drives the currently active exercise
  useEffect(() => {
    if (!activeKey) return;
    const i = window.setInterval(() => {
      setTimers((t) => {
        const cur = t[activeKey] ?? { elapsed: 0, done: false };
        return { ...t, [activeKey]: { ...cur, elapsed: cur.elapsed + 1 } };
      });
    }, 1000);
    return () => clearInterval(i);
  }, [activeKey]);

  const totalElapsed = useMemo(
    () => Object.values(timers).reduce((sum, t) => sum + t.elapsed, 0),
    [timers],
  );

  const toggle = (key: string) => {
    setActiveKey((cur) => (cur === key ? null : key));
    setTimers((t) => (t[key] ? t : { ...t, [key]: { elapsed: 0, done: false } }));
  };
  const reset = (key: string) => {
    if (activeKey === key) setActiveKey(null);
    setTimers((t) => ({ ...t, [key]: { elapsed: 0, done: false } }));
  };
  const markDone = (key: string) => {
    if (activeKey === key) setActiveKey(null);
    setTimers((t) => ({ ...t, [key]: { elapsed: t[key]?.elapsed ?? 0, done: !(t[key]?.done) } }));
  };

  const complete = async () => {
    if (!user) return;
    setActiveKey(null);
    setCompleting(true);
    const { error } = await supabase
      .from("workouts")
      .update({ status: "completed", completed_at: new Date().toISOString(), duration_seconds: totalElapsed })
      .eq("id", id);
    setCompleting(false);
    if (error) { toast.error(error.message); return; }
    setStatus("completed");
    toast.success("💪 Workout completed! Streak +1");
    setTimeout(() => router.navigate({ to: "/dashboard" }), 800);
  };

  if (!plan) return (
    <AppShell>
      <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </AppShell>
  );

  const isCompleted = status === "completed";

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {plan.difficulty}
            </span>
            <span className="text-xs text-muted-foreground">{plan.estimated_minutes} min · {plan.focus}</span>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold">{plan.title}</h1>
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground"><span className="text-primary">AI note:</span> {plan.ai_note}</p>
          </div>
        </div>

        {/* Total + complete */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {isCompleted ? "Final total" : "Total time"}
          </div>
          <div className="mb-4 font-display text-5xl font-bold tabular-nums text-gradient">{fmt(totalElapsed)}</div>
          {!isCompleted ? (
            <button
              onClick={complete}
              disabled={completing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 glow-primary"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finish Workout
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" /> Completed
            </div>
          )}
        </div>

        <Section sectionKey="warmup" icon={<Flame className="h-5 w-5 text-accent" />} title="Warm-up" tone="amber"
          items={plan.warmup} timers={timers} activeKey={activeKey} disabled={isCompleted}
          onToggle={toggle} onReset={reset} onDone={markDone} />
        <Section sectionKey="main" icon={<Dumbbell className="h-5 w-5 text-primary" />} title="Main workout" tone="primary"
          items={plan.main} timers={timers} activeKey={activeKey} disabled={isCompleted}
          onToggle={toggle} onReset={reset} onDone={markDone} />
        <Section sectionKey="cool" icon={<Snowflake className="h-5 w-5 text-accent" />} title="Cool-down" tone="amber"
          items={plan.cooldown} timers={timers} activeKey={activeKey} disabled={isCompleted}
          onToggle={toggle} onReset={reset} onDone={markDone} />

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

type SectionProps = {
  sectionKey: string;
  icon: React.ReactNode;
  title: string;
  tone: "primary" | "amber";
  items: Exercise[];
  timers: TimerMap;
  activeKey: string | null;
  disabled: boolean;
  onToggle: (k: string) => void;
  onReset: (k: string) => void;
  onDone: (k: string) => void;
};

function Section({ sectionKey, icon, title, tone, items, timers, activeKey, disabled, onToggle, onReset, onDone }: SectionProps) {
  const accent = tone === "primary" ? "border-primary/30" : "border-accent/30";
  return (
    <div className={`mb-4 rounded-2xl border ${accent} bg-card p-5`}>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map((ex, i) => {
          const key = `${sectionKey}-${i}`;
          const t = timers[key] ?? { elapsed: 0, done: false };
          const isActive = activeKey === key;
          return (
            <li key={key} className={`rounded-lg border bg-secondary/40 px-4 py-3 transition ${isActive ? "border-primary/60 bg-primary/10" : "border-transparent"} ${t.done ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`font-semibold ${t.done ? "line-through" : ""}`}>{ex.name}</div>
                  {ex.notes && <div className="text-xs text-muted-foreground">{ex.notes}</div>}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                  {ex.sets && <Badge>{ex.sets} sets</Badge>}
                  {ex.reps && <Badge>{ex.reps} reps</Badge>}
                  {ex.duration && <Badge>{ex.duration}</Badge>}
                  {ex.rest && <Badge tone="muted">rest {ex.rest}</Badge>}
                  <Badge tone="time">~{fmtTarget(ex.target_seconds)}</Badge>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="font-display text-2xl font-bold tabular-nums text-foreground">{fmt(t.elapsed)}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggle(key)}
                    disabled={disabled || t.done}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    {isActive ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> {t.elapsed > 0 ? "Resume" : "Start"}</>}
                  </button>
                  <button
                    onClick={() => onReset(key)}
                    disabled={disabled || (t.elapsed === 0 && !t.done)}
                    title="Reset"
                    className="inline-flex items-center rounded-lg bg-background p-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDone(key)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${t.done ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                  >
                    <Check className="h-3.5 w-3.5" /> {t.done ? "Done" : "Mark"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "muted" }) {
  return (
    <span className={`rounded-md px-2 py-1 font-mono ${tone === "muted" ? "bg-background text-muted-foreground" : "bg-primary/15 text-primary"}`}>
      {children}
    </span>
  );
}
