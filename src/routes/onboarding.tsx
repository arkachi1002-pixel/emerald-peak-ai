import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Dumbbell, Trophy, Wrench, Target, ChevronRight, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding · AI_COACH" }] }),
  component: Onboarding,
});

const STEPS = [
  {
    key: "sport_type" as const,
    title: "Pick your sport",
    icon: Dumbbell,
    options: ["Gym", "Football", "MMA", "Running", "Bodyweight"],
  },
  {
    key: "experience_level" as const,
    title: "Your experience",
    icon: Trophy,
    options: ["Beginner", "Intermediate", "Pro"],
  },
  {
    key: "body_type" as const,
    title: "Your body type",
    icon: User,
    options: ["Slim", "Average", "Athletic", "Heavy / Overweight"],
  },
  {
    key: "equipment" as const,
    title: "Available equipment",
    icon: Wrench,
    options: ["Full Gym", "Home/Dumbbells", "No Equipment"],
  },
  {
    key: "main_goal" as const,
    title: "Main goal",
    icon: Target,
    options: ["Strength", "Endurance", "Muscle Mass", "Fat Loss"],
  },
  {
    key: "training_days" as const,
    title: "Training frequency",
    icon: CalendarDays,
    options: ["3 days / week", "4 days / week", "5 days / week", "6 days / week"],
  },
];

const TRAINING_DAY_PRESETS: Record<string, string[]> = {
  "3 days / week": ["Mon", "Wed", "Fri"],
  "4 days / week": ["Mon", "Tue", "Thu", "Fri"],
  "5 days / week": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "6 days / week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function Onboarding() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.navigate({ to: "/auth" });
  }, [authLoading, user, router]);

  const current = STEPS[step];
  const Icon = current.icon;

  const pick = (val: string) => {
    const next = {
      ...data,
      [current.key]: current.key === "training_days" ? TRAINING_DAY_PRESETS[val] : val,
    };
    setData(next);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish(next);
    }
  };

  const finish = async (final: Record<string, string | string[]>) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...final, onboarded: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("You're all set. Let's train.");
    router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen bg-background px-4 py-12">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative z-10 mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="font-display text-2xl font-bold">{current.title}</h2>
            </div>
          </div>

          <div className="grid gap-2">
            {current.options.map((opt) => (
              <button
                key={opt}
                disabled={saving}
                onClick={() => pick(opt)}
                className="group flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-5 py-4 text-left transition hover:border-primary hover:bg-secondary disabled:opacity-50"
              >
                <span className="font-medium">{opt}</span>
                {saving && step === STEPS.length - 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                )}
              </button>
            ))}
          </div>

          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
