import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Battery, Activity, Clock, Sparkles, Loader2, Coffee } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { generateWorkout, getDaySchedule } from "@/lib/generate-workout";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/checkin")({
  head: () => ({ meta: [{ title: "Check-in · AI_COACH" }] }),
  component: CheckIn,
});

const TIME_OPTIONS = [15, 30, 45, 60];

function CheckIn() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [minutes, setMinutes] = useState(45);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  const generate = async () => {
    if (!user || !profile) return;
    setGenerating(true);

    // simulate AI think time
    await new Promise((r) => setTimeout(r, 1200));

    const plan = generateWorkout({
      sport: profile.sport_type,
      experience: profile.experience_level,
      equipment: profile.equipment,
      goal: profile.main_goal,
      bodyType: (profile as { body_type?: string | null }).body_type ?? null,
      energy,
      soreness,
      minutes,
      dayOfWeek: new Date().getDay(),
    });

    const today = format(new Date(), "yyyy-MM-dd");

    // upsert: delete any existing pending for today, then insert
    await supabase.from("workouts").delete().eq("user_id", user.id).eq("workout_date", today).eq("status", "pending");

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        workout_date: today,
        status: "pending",
        energy,
        soreness,
        available_minutes: minutes,
        plan,
      })
      .select("id")
      .single();

    setGenerating(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your AI workout is ready!");
    router.navigate({ to: "/workout/$id", params: { id: data.id } });
  };

  if (!user) return null;

  const today = new Date();
  const schedule = getDaySchedule(today);

  if (schedule.kind === "rest") {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-border bg-card p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Coffee className="h-6 w-6 text-[color:var(--green-dark)]" />
            </div>
            <div className="mb-2 inline-flex rounded-full bg-[color:var(--green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--green-dark)]">
              {schedule.label}
            </div>
            <h1 className="font-display text-3xl font-bold">No training today</h1>
            <p className="mt-2 text-muted-foreground">
              Your split runs <b>Mon · Wed · Fri</b>. Recover well — eat, hydrate, sleep.
              Your next session is coming up.
            </p>
            <Link
              to="/dashboard"
              className="btn-pill mt-6 inline-flex bg-primary text-primary-foreground hover:opacity-90 glow-primary"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex rounded-full bg-[color:var(--green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--green-dark)]">
            Today · {schedule.label}
          </div>
          <h1 className="font-display text-3xl font-bold">How are you feeling?</h1>
          <p className="mt-1 text-muted-foreground">Tune today's {schedule.label.toLowerCase()} session to your body.</p>
        </div>

        <div className="space-y-5">
          <SliderCard
            icon={<Battery className="h-5 w-5" />}
            label="Energy level"
            value={energy}
            setValue={setEnergy}
            color="primary"
            hint={energy >= 8 ? "Beast mode" : energy >= 5 ? "Solid" : "Take it easy"}
          />
          <SliderCard
            icon={<Activity className="h-5 w-5" />}
            label="Muscle soreness"
            value={soreness}
            setValue={setSoreness}
            color="amber"
            hint={soreness >= 7 ? "Recovery focus" : soreness >= 4 ? "Some tightness" : "Fresh"}
          />

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Available time</div>
                <div className="text-xs text-muted-foreground">Pick a session length</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setMinutes(t)}
                  className={`rounded-xl border py-3 text-center font-semibold transition ${
                    minutes === t
                      ? "border-primary bg-primary/10 text-primary glow-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t}<span className="text-xs"> min</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-4 font-display text-lg font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 glow-primary"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> AI is building your workout…</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Generate My AI Workout</>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function SliderCard({
  icon, label, value, setValue, color, hint,
}: {
  icon: React.ReactNode; label: string; value: number; setValue: (v: number) => void;
  color: "primary" | "amber"; hint: string;
}) {
  const accentClass = color === "primary" ? "text-primary" : "text-accent";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${accentClass}`}>{icon}</div>
          <div>
            <div className="font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{hint}</div>
          </div>
        </div>
        <div className={`font-display text-3xl font-bold ${accentClass}`}>{value}<span className="text-sm text-muted-foreground">/10</span></div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-current"
        style={{ accentColor: color === "primary" ? "oklch(0.78 0.18 155)" : "oklch(0.82 0.17 80)" }}
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Low</span><span>High</span>
      </div>
    </div>
  );
}
