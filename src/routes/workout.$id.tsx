import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Loader2, Flame, Snowflake, Dumbbell, Sparkles, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutPlan, Exercise } from "@/lib/generate-workout";
import { fmtTarget } from "@/lib/generate-workout";
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

  if (!plan) return (
    <AppShell>
      <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </AppShell>
  );

  const isCompleted = status === "completed";
  const totalExercises = plan.warmup.length + plan.main.length + plan.cooldown.length;

  return (
    <AppShell>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {plan.difficulty}
            </span>
            <span className="text-xs text-muted-foreground">
              {plan.estimated_minutes} min · {plan.focus} · {totalExercises} exercises
            </span>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold">{plan.title}</h1>
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground"><span className="text-primary">AI note:</span> {plan.ai_note}</p>
          </div>
        </div>

        {/* Big Start CTA */}
        <div className="mb-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center">
          {isCompleted ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-5 py-2.5 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" /> Workout completed
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Ready when you are. We'll guide you through each exercise one by one.
              </p>
              <Link
                to="/workout/$id/session"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition hover:opacity-90 glow-primary"
              >
                <Play className="h-5 w-5" /> Start guided session
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                ~{plan.estimated_minutes} min · individual timer per exercise
              </p>
            </>
          )}
        </div>

        {/* Section previews (full width) */}
        <PreviewSection
          icon={<Flame className="h-5 w-5 text-accent" />}
          title="Warm-up"
          tone="amber"
          items={plan.warmup}
        />
        <PreviewSection
          icon={<Dumbbell className="h-5 w-5 text-primary" />}
          title="Main workout"
          tone="primary"
          items={plan.main}
        />
        <PreviewSection
          icon={<Snowflake className="h-5 w-5 text-accent" />}
          title="Cool-down"
          tone="amber"
          items={plan.cooldown}
        />

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

type PreviewProps = {
  icon: React.ReactNode;
  title: string;
  tone: "primary" | "amber";
  items: Exercise[];
};

function PreviewSection({ icon, title, tone, items }: PreviewProps) {
  const accent = tone === "primary" ? "border-primary/30" : "border-accent/30";
  if (!items.length) return null;
  const sectionTotal = items.reduce((s, e) => s + (e.target_seconds || 0), 0);
  return (
    <div className={`mb-4 w-full rounded-2xl border ${accent} bg-card p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <span className="text-xs text-muted-foreground">· {items.length} exercises</span>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
          ~{fmtTarget(sectionTotal)}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((ex, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background font-mono text-xs text-muted-foreground">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{ex.name}</div>
                {ex.notes && <div className="truncate text-xs text-muted-foreground">{ex.notes}</div>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
              {ex.sets && <Badge>{ex.sets}×</Badge>}
              {ex.reps && <Badge>{ex.reps} reps</Badge>}
              {ex.duration && <Badge>{ex.duration}</Badge>}
              {ex.rest && <Badge tone="muted">rest {ex.rest}</Badge>}
              <Badge tone="time">~{fmtTarget(ex.target_seconds)}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "muted" | "time" }) {
  const classes =
    tone === "muted"
      ? "bg-background text-muted-foreground"
      : tone === "time"
        ? "bg-accent/20 text-accent"
        : "bg-primary/15 text-primary";
  return <span className={`rounded-md px-2 py-1 font-mono ${classes}`}>{children}</span>;
}
