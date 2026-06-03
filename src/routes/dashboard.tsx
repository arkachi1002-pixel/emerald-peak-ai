import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isToday, isBefore, isAfter, parseISO, startOfDay } from "date-fns";
import { Check, Lock, Flame, Sparkles, ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getDaySchedule, WEEK_SCHEDULE } from "@/lib/generate-workout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · AI_COACH" }] }),
  component: Dashboard,
});

type Workout = {
  id: string;
  workout_date: string;
  status: string;
  plan: { title: string; difficulty: string };
};

function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    if (loading) return;
    if (!user) router.navigate({ to: "/auth" });
    else if (!profile?.onboarded) router.navigate({ to: "/onboarding" });
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("id, workout_date, status, plan")
      .eq("user_id", user.id)
      .order("workout_date", { ascending: false })
      .limit(60)
      .then(({ data }) => setWorkouts((data as Workout[]) ?? []));
  }, [user]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = startOfDay(new Date());

  const workoutByDate = useMemo(() => {
    const m = new Map<string, Workout>();
    for (const w of workouts) m.set(w.workout_date, w);
    return m;
  }, [workouts]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedWorkout = workoutByDate.get(selectedKey);
  const isSelectedToday = isToday(selected);
  const isPast = isBefore(selected, today);
  const isFuture = isAfter(selected, today);

  const completedCount = workouts.filter((w) => w.status === "completed").length;
  const streak = computeStreak(workouts);

  if (!user || !profile) return null;

  return (
    <AppShell>
      {/* Hero */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Completed" value={completedCount} accent="primary" />
        <StatCard label="Streak" value={`${streak}🔥`} accent="amber" />
        <StatCard label="Goal" value={profile.main_goal ?? "—"} accent="primary" />
      </section>

      {/* Calendar */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">This week</h2>
            <p className="text-xs text-muted-foreground">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</p>
          </div>
          <div className="flex gap-1">
            <IconBtn onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}><span className="px-1 text-xs">Today</span></IconBtn>
            <IconBtn onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></IconBtn>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const w = workoutByDate.get(key);
            const isSel = format(selected, "yyyy-MM-dd") === key;
            const isFut = isAfter(d, today);
            const done = w?.status === "completed";
            const sched = WEEK_SCHEDULE[d.getDay()];
            const isRest = sched.kind === "rest";
            return (
              <button
                key={key}
                onClick={() => setSelected(startOfDay(d))}
                className={`group relative flex flex-col items-center gap-1 rounded-xl border p-3 transition ${
                  isSel
                    ? "border-primary bg-[color:var(--green-soft)]"
                    : "border-border bg-white hover:border-primary/60"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                <span className={`font-display text-xl font-bold ${isToday(d) ? "text-[color:var(--green-dark)]" : ""}`}>{format(d, "d")}</span>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${isRest ? "text-muted-foreground" : "text-[color:var(--green-dark)]"}`}>
                  {isRest ? "Rest" : sched.kind === "training" ? sched.groups.map(g => g[0]).join("·") : ""}
                </span>
                <div className="h-2 w-2">
                  {done ? (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  ) : isFut && !isRest ? (
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  ) : w ? (
                    <div className="h-2 w-2 rounded-full bg-accent" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected day panel */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-2xl font-bold">{format(selected, "EEEE, MMM d")}</h3>
          {isSelectedToday && <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">TODAY</span>}
        </div>

        {selectedWorkout ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {selectedWorkout.status === "completed" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                  <Flame className="h-5 w-5 text-accent" />
                </div>
              )}
              <div>
                <div className="font-semibold">{selectedWorkout.plan.title}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedWorkout.status === "completed" ? "Completed" : "In progress"} · {selectedWorkout.plan.difficulty}
                </div>
              </div>
            </div>
            <Link
              to="/workout/$id"
              params={{ id: selectedWorkout.id }}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70"
            >
              View workout →
            </Link>
          </div>
        ) : isFuture ? (
          <EmptyState
            icon={<Lock className="h-6 w-6 text-muted-foreground" />}
            title="Locked"
            desc="Future workouts unlock the morning of."
          />
        ) : isPast ? (
          <EmptyState
            icon={<span className="text-2xl">💤</span>}
            title="Rest day"
            desc="No workout was logged for this day."
          />
        ) : (
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Today's action
            </div>
            <h4 className="mb-2 font-display text-xl font-bold">Ready to train?</h4>
            <p className="mb-4 text-sm text-muted-foreground">
              Complete a 30-second readiness check-in so the AI can dial in today's session.
            </p>
            <Link
              to="/checkin"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 glow-primary"
            >
              Start daily check-in →
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent: "primary" | "amber" }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${accent === "amber" ? "glow-amber" : ""}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold ${accent === "primary" ? "text-primary" : "text-accent"}`}>{value}</div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 min-w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground">
      {children}
    </button>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/20 py-10 text-center">
      <div>{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function computeStreak(workouts: Workout[]): number {
  const completed = new Set(
    workouts.filter((w) => w.status === "completed").map((w) => w.workout_date),
  );
  let streak = 0;
  let d = startOfDay(new Date());
  while (completed.has(format(d, "yyyy-MM-dd"))) {
    streak++;
    d = addDays(d, -1);
  }
  // also allow yesterday if today not done yet
  if (streak === 0) {
    d = addDays(startOfDay(new Date()), -1);
    while (completed.has(format(d, "yyyy-MM-dd"))) {
      streak++;
      d = addDays(d, -1);
    }
  }
  return streak;
}

// Suppress unused warning
void parseISO;
