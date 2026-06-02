import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Check, Loader2, Flame, Snowflake, Dumbbell, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutPlan, Exercise } from "@/lib/generate-workout";
import { toast } from "sonner";

export const Route = createFileRoute("/workout/$id")({
  head: () => ({ meta: [{ title: "Workout · AI_COACH" }] }),
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("plan, status, duration_seconds")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        setPlan(data.plan as WorkoutPlan);
        setStatus(data.status);
        setElapsed(data.duration_seconds ?? 0);
      });
  }, [id, user]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const complete = async () => {
    if (!user) return;
    setRunning(false);
    setCompleting(true);
    const { error } = await supabase
      .from("workouts")
      .update({ status: "completed", completed_at: new Date().toISOString(), duration_seconds: elapsed })
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

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
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

        {/* Timer */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {isCompleted ? "Final time" : running ? "In progress" : "Ready"}
          </div>
          <div className="mb-4 font-display text-6xl font-bold tabular-nums text-gradient">{mm}:{ss}</div>
          {!isCompleted && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setRunning((r) => !r)}
                className="flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-semibold transition hover:bg-secondary/70"
              >
                {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {elapsed > 0 ? "Resume" : "Start"} Workout</>}
              </button>
              <button
                onClick={complete}
                disabled={completing}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 glow-primary"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mark Completed
              </button>
            </div>
          )}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" /> Completed
            </div>
          )}
        </div>

        {/* Sections */}
        <Section icon={<Flame className="h-5 w-5 text-accent" />} title="Warm-up" tone="amber" items={plan.warmup} />
        <Section icon={<Dumbbell className="h-5 w-5 text-primary" />} title="Main workout" tone="primary" items={plan.main} />
        <Section icon={<Snowflake className="h-5 w-5 text-accent" />} title="Cool-down" tone="amber" items={plan.cooldown} />

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ icon, title, tone, items }: { icon: React.ReactNode; title: string; tone: "primary" | "amber"; items: Exercise[] }) {
  const accent = tone === "primary" ? "border-primary/30" : "border-accent/30";
  return (
    <div className={`mb-4 rounded-2xl border ${accent} bg-card p-5`}>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map((ex, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-4 py-3">
            <div>
              <div className="font-semibold">{ex.name}</div>
              {ex.notes && <div className="text-xs text-muted-foreground">{ex.notes}</div>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              {ex.sets && <Badge>{ex.sets} sets</Badge>}
              {ex.reps && <Badge>{ex.reps} reps</Badge>}
              {ex.duration && <Badge>{ex.duration}</Badge>}
              {ex.rest && <Badge tone="muted">rest {ex.rest}</Badge>}
            </div>
          </li>
        ))}
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
