import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Edit3, Save, X, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · AI_COACH" }] }),
  component: Profile,
});

const FIELDS = [
  { key: "sport_type", label: "Sport", options: ["Gym", "Football", "MMA", "Running", "Bodyweight"] },
  { key: "experience_level", label: "Experience", options: ["Beginner", "Intermediate", "Pro"] },
  { key: "body_type", label: "Body type", options: ["Slim", "Average", "Athletic", "Heavy / Overweight"] },
  { key: "equipment", label: "Equipment", options: ["Full Gym", "Home/Dumbbells", "No Equipment"] },
  { key: "main_goal", label: "Goal", options: ["Strength", "Endurance", "Muscle Mass", "Fat Loss"] },
] as const;

type HistoryItem = {
  id: string;
  workout_date: string;
  status: string;
  duration_seconds: number | null;
  plan: { title: string; difficulty: string };
};

function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("id, workout_date, status, duration_seconds, plan")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data as HistoryItem[]) ?? []));
  }, [user]);

  useEffect(() => {
    if (profile && !editing) {
      setDraft({
        sport_type: profile.sport_type ?? "",
        experience_level: profile.experience_level ?? "",
        equipment: profile.equipment ?? "",
        main_goal: profile.main_goal ?? "",
      });
    }
  }, [profile, editing]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(draft as never).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    setEditing(false);
    toast.success("Profile updated.");
  };

  if (!user || !profile) return null;

  const totalMinutes = history.reduce((acc, h) => acc + Math.round((h.duration_seconds ?? 0) / 60), 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground glow-primary">
            {(profile.display_name ?? user.email ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{profile.display_name ?? "Athlete"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-primary">{history.length}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Workouts</div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Stat label="Total minutes trained" value={totalMinutes} />
          <Stat label="Recent difficulty" value={history[0]?.plan.difficulty ?? "—"} />
        </div>

        {/* Preferences */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Training preferences</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70">
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button onClick={save} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
                {editing ? (
                  <select
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <div className="rounded-lg bg-secondary/40 px-3 py-2 font-medium">{(profile as any)[f.key] ?? "—"}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Recent workouts</h2>
          </div>
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/20 py-8 text-center text-sm text-muted-foreground">
              No completed workouts yet. Crush one today!
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{h.plan.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(h.workout_date), "MMM d, yyyy")} · {Math.round((h.duration_seconds ?? 0) / 60)} min
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{h.plan.difficulty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
