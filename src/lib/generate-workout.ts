// Mock AI workout generator. Swap this with an LLM API call later.
//
// Weekly split (3x / week):
//   Monday    → Chest + Biceps
//   Wednesday → Triceps + Back
//   Friday    → Shoulders + Legs
//   Other days → Rest / Active recovery

export type Exercise = {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  notes?: string;
  /** Recommended time for this exercise in seconds (including rest between sets). */
  target_seconds: number;
};

export type WorkoutPlan = {
  title: string;
  focus: string;
  estimated_minutes: number;
  difficulty: string;
  muscle_groups: string[];
  warmup: Exercise[];
  main: Exercise[];
  cooldown: Exercise[];
  ai_note: string;
};

type Inputs = {
  sport: string | null;
  experience: string | null;
  equipment: string | null;
  goal: string | null;
  bodyType?: string | null;
  energy: number;
  soreness: number;
  minutes: number;
  /** JS day index: 0=Sun … 6=Sat. Defaults to today. */
  dayOfWeek?: number;
  trainingDays?: string[] | null;
};

export type DaySchedule =
  | { kind: "training"; label: string; groups: string[] }
  | { kind: "rest"; label: string };

/** Day-of-week (0=Sun…6=Sat) → schedule. */
export const WEEK_SCHEDULE: Record<number, DaySchedule> = {
  0: { kind: "rest", label: "Rest day" },
  1: { kind: "training", label: "Chest + Biceps", groups: ["Chest", "Biceps"] },
  2: { kind: "rest", label: "Active recovery" },
  3: { kind: "training", label: "Triceps + Back", groups: ["Triceps", "Back"] },
  4: { kind: "rest", label: "Active recovery" },
  5: { kind: "training", label: "Shoulders + Legs", groups: ["Shoulders", "Legs"] },
  6: { kind: "rest", label: "Rest day" },
};

export function getDaySchedule(date: Date = new Date(), trainingDays?: string[] | null): DaySchedule {
  return getAdaptiveDaySchedule(date, trainingDays);
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DEFAULT_TRAINING_DAYS = ["Mon", "Wed", "Fri"];

const SPLIT_TEMPLATES: Record<number, Array<{ label: string; groups: string[] }>> = {
  1: [{ label: "Full Body Strength", groups: ["Chest", "Back", "Legs", "Shoulders"] }],
  2: [
    { label: "Upper Body", groups: ["Chest", "Back", "Shoulders"] },
    { label: "Lower Body + Arms", groups: ["Legs", "Biceps", "Triceps"] },
  ],
  3: [
    { label: "Chest + Biceps", groups: ["Chest", "Biceps"] },
    { label: "Back + Triceps", groups: ["Back", "Triceps"] },
    { label: "Shoulders + Legs", groups: ["Shoulders", "Legs"] },
  ],
  4: [
    { label: "Upper Strength", groups: ["Chest", "Back"] },
    { label: "Lower Strength", groups: ["Legs"] },
    { label: "Upper Volume", groups: ["Shoulders", "Biceps", "Triceps"] },
    { label: "Full Body Pump", groups: ["Chest", "Back", "Legs"] },
  ],
  5: [
    { label: "Push", groups: ["Chest", "Shoulders", "Triceps"] },
    { label: "Pull", groups: ["Back", "Biceps"] },
    { label: "Legs", groups: ["Legs"] },
    { label: "Upper + Arms", groups: ["Chest", "Back", "Biceps", "Triceps"] },
    { label: "Full Body", groups: ["Legs", "Shoulders", "Chest", "Back"] },
  ],
  6: [
    { label: "Push Strength", groups: ["Chest", "Shoulders", "Triceps"] },
    { label: "Pull Strength", groups: ["Back", "Biceps"] },
    { label: "Legs Strength", groups: ["Legs"] },
    { label: "Push Volume", groups: ["Chest", "Shoulders", "Triceps"] },
    { label: "Pull Volume", groups: ["Back", "Biceps"] },
    { label: "Legs + Full Body", groups: ["Legs", "Chest", "Back"] },
  ],
  7: [
    { label: "Push Strength", groups: ["Chest", "Shoulders", "Triceps"] },
    { label: "Pull Strength", groups: ["Back", "Biceps"] },
    { label: "Legs Strength", groups: ["Legs"] },
    { label: "Upper Volume", groups: ["Chest", "Back", "Shoulders"] },
    { label: "Lower + Arms", groups: ["Legs", "Biceps", "Triceps"] },
    { label: "Full Body Pump", groups: ["Chest", "Back", "Legs"] },
    { label: "Mobility + Weak Points", groups: ["Shoulders", "Biceps", "Triceps"] },
  ],
};

export function normalizeTrainingDays(trainingDays?: string[] | null): string[] {
  const picked = (trainingDays?.length ? trainingDays : DEFAULT_TRAINING_DAYS)
    .filter((day) => DAY_LABELS.includes(day as (typeof DAY_LABELS)[number]));

  return [...new Set(picked)].sort(
    (a, b) =>
      DAY_LABELS.indexOf(a as (typeof DAY_LABELS)[number]) -
      DAY_LABELS.indexOf(b as (typeof DAY_LABELS)[number]),
  );
}

export function getAdaptiveDaySchedule(date: Date = new Date(), trainingDays?: string[] | null): DaySchedule {
  const days = normalizeTrainingDays(trainingDays);
  const todayLabel = DAY_LABELS[date.getDay()];
  const slot = days.indexOf(todayLabel);

  if (slot === -1) {
    return { kind: "rest", label: days.length >= 5 ? "Recovery day" : "Active recovery" };
  }

  const templates = SPLIT_TEMPLATES[Math.min(Math.max(days.length, 1), 7)];
  const plan = templates[slot % templates.length];
  return { kind: "training", label: plan.label, groups: plan.groups };
}

// Exercises grouped by muscle and equipment tier.
// target_seconds = estimated total time including work + rest between sets.
type EquipTier = "Full Gym" | "Home" | "None";
const EXERCISES: Record<string, Record<EquipTier, Exercise[]>> = {
  Chest: {
    "Full Gym": [
      { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "90s", target_seconds: 540 },
      { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", rest: "75s", target_seconds: 480 },
      { name: "Cable Chest Fly", sets: 3, reps: "12", rest: "60s", target_seconds: 315 },
      { name: "Machine Chest Press", sets: 3, reps: "10-12", rest: "60s", target_seconds: 315 },
    ],
    Home: [
      { name: "Dumbbell Bench Press (floor)", sets: 4, reps: "8-10", rest: "75s", target_seconds: 480 },
      { name: "Dumbbell Fly", sets: 3, reps: "12", rest: "60s", target_seconds: 315 },
      { name: "Push-ups", sets: 4, reps: "AMRAP", rest: "60s", target_seconds: 480 },
      { name: "Incline Push-ups", sets: 3, reps: "12-15", rest: "45s", target_seconds: 285 },
    ],
    None: [
      { name: "Push-ups", sets: 4, reps: "12-15", rest: "60s", target_seconds: 480 },
      { name: "Diamond Push-ups", sets: 3, reps: "8-12", rest: "60s", target_seconds: 360 },
      { name: "Decline Push-ups", sets: 3, reps: "10-12", rest: "60s", target_seconds: 360 },
      { name: "Archer Push-ups", sets: 3, reps: "6/side", rest: "60s", target_seconds: 360 },
    ],
  },
  Biceps: {
    "Full Gym": [
      { name: "Barbell Curl", sets: 4, reps: "8-10", rest: "60s", target_seconds: 420 },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", rest: "60s", target_seconds: 315 },
      { name: "Hammer Curl", sets: 3, reps: "10/side", rest: "45s", target_seconds: 285 },
      { name: "Cable Curl", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
    ],
    Home: [
      { name: "Dumbbell Curl", sets: 4, reps: "10-12", rest: "60s", target_seconds: 420 },
      { name: "Hammer Curl", sets: 3, reps: "10/side", rest: "45s", target_seconds: 285 },
      { name: "Concentration Curl", sets: 3, reps: "12/side", rest: "45s", target_seconds: 315 },
    ],
    None: [
      { name: "Chin-ups (or assisted)", sets: 4, reps: "AMRAP", rest: "75s", target_seconds: 540 },
      { name: "Towel Door Curl", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
      { name: "Isometric Curl Hold", sets: 3, duration: "30s", rest: "45s", target_seconds: 225 },
    ],
  },
  Triceps: {
    "Full Gym": [
      { name: "Close-Grip Bench Press", sets: 4, reps: "6-8", rest: "90s", target_seconds: 540 },
      { name: "Cable Tricep Pushdown", sets: 4, reps: "10-12", rest: "60s", target_seconds: 420 },
      { name: "Overhead Cable Extension", sets: 3, reps: "12", rest: "60s", target_seconds: 315 },
      { name: "Dips", sets: 3, reps: "AMRAP", rest: "60s", target_seconds: 360 },
    ],
    Home: [
      { name: "Dumbbell Skullcrusher", sets: 4, reps: "10", rest: "60s", target_seconds: 420 },
      { name: "Overhead Dumbbell Extension", sets: 3, reps: "12", rest: "60s", target_seconds: 315 },
      { name: "Bench Dips", sets: 3, reps: "12-15", rest: "45s", target_seconds: 285 },
      { name: "Close-Grip Push-ups", sets: 3, reps: "10-12", rest: "60s", target_seconds: 360 },
    ],
    None: [
      { name: "Diamond Push-ups", sets: 4, reps: "10-12", rest: "60s", target_seconds: 480 },
      { name: "Bench / Chair Dips", sets: 4, reps: "12-15", rest: "45s", target_seconds: 380 },
      { name: "Pike Push-ups", sets: 3, reps: "10", rest: "60s", target_seconds: 360 },
    ],
  },
  Back: {
    "Full Gym": [
      { name: "Deadlift", sets: 3, reps: "5", rest: "120s", target_seconds: 495 },
      { name: "Pull-ups", sets: 4, reps: "AMRAP", rest: "90s", target_seconds: 540 },
      { name: "Bent-over Barbell Row", sets: 4, reps: "8-10", rest: "75s", target_seconds: 480 },
      { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: "60s", target_seconds: 315 },
      { name: "Seated Cable Row", sets: 3, reps: "12", rest: "60s", target_seconds: 315 },
    ],
    Home: [
      { name: "Dumbbell Row", sets: 4, reps: "10/side", rest: "60s", target_seconds: 420 },
      { name: "Romanian Deadlift (DB)", sets: 3, reps: "10", rest: "75s", target_seconds: 360 },
      { name: "Reverse Fly", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
      { name: "Renegade Row", sets: 3, reps: "8/side", rest: "60s", target_seconds: 360 },
    ],
    None: [
      { name: "Pull-ups", sets: 4, reps: "AMRAP", rest: "75s", target_seconds: 480 },
      { name: "Inverted Rows (under table)", sets: 4, reps: "10-12", rest: "60s", target_seconds: 480 },
      { name: "Superman Hold", sets: 3, duration: "30s", rest: "30s", target_seconds: 180 },
      { name: "Reverse Snow Angels", sets: 3, reps: "15", rest: "30s", target_seconds: 225 },
    ],
  },
  Shoulders: {
    "Full Gym": [
      { name: "Overhead Barbell Press", sets: 4, reps: "6-8", rest: "90s", target_seconds: 540 },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", rest: "45s", target_seconds: 360 },
      { name: "Cable Rear Delt Fly", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
      { name: "Arnold Press", sets: 3, reps: "10", rest: "60s", target_seconds: 315 },
    ],
    Home: [
      { name: "Dumbbell Shoulder Press", sets: 4, reps: "8-10", rest: "75s", target_seconds: 480 },
      { name: "Lateral Raise", sets: 4, reps: "12-15", rest: "45s", target_seconds: 360 },
      { name: "Front Raise", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
      { name: "Bent-over Rear Delt Fly", sets: 3, reps: "12", rest: "45s", target_seconds: 285 },
    ],
    None: [
      { name: "Pike Push-ups", sets: 4, reps: "8-10", rest: "60s", target_seconds: 420 },
      { name: "Wall Handstand Hold", sets: 3, duration: "30s", rest: "60s", target_seconds: 270 },
      { name: "Plank Shoulder Taps", sets: 3, reps: "20", rest: "45s", target_seconds: 270 },
    ],
  },
  Legs: {
    "Full Gym": [
      { name: "Barbell Back Squat", sets: 4, reps: "6-8", rest: "120s", target_seconds: 600 },
      { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: "90s", target_seconds: 540 },
      { name: "Leg Press", sets: 3, reps: "10-12", rest: "75s", target_seconds: 360 },
      { name: "Walking Lunges", sets: 3, reps: "10/side", rest: "60s", target_seconds: 360 },
      { name: "Standing Calf Raise", sets: 4, reps: "15", rest: "45s", target_seconds: 360 },
    ],
    Home: [
      { name: "Goblet Squat", sets: 4, reps: "10-12", rest: "75s", target_seconds: 480 },
      { name: "Dumbbell RDL", sets: 4, reps: "10", rest: "75s", target_seconds: 480 },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10/side", rest: "60s", target_seconds: 390 },
      { name: "Calf Raise", sets: 3, reps: "15", rest: "30s", target_seconds: 225 },
    ],
    None: [
      { name: "Bodyweight Squat", sets: 4, reps: "20", rest: "60s", target_seconds: 480 },
      { name: "Reverse Lunge", sets: 3, reps: "12/side", rest: "60s", target_seconds: 390 },
      { name: "Pistol Squat (assisted)", sets: 3, reps: "6/side", rest: "60s", target_seconds: 360 },
      { name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", target_seconds: 285 },
      { name: "Calf Raise", sets: 3, reps: "20", rest: "30s", target_seconds: 225 },
    ],
  },
};

const WARMUP: Exercise[] = [
  { name: "Dynamic Mobility Flow", duration: "3 min", target_seconds: 180 },
  { name: "Leg Swings + Arm Circles", duration: "2 min", target_seconds: 120 },
  { name: "Light Cardio Ramp-Up", duration: "3 min", target_seconds: 180 },
];

// Extra warm-up for heavier builds: a bit more low-impact cardio to wake up the heart.
const HEAVY_WARMUP_EXTRA: Exercise[] = [
  { name: "Brisk Walk / Easy Bike", duration: "5 min", rest: "0s", target_seconds: 300, notes: "Low-impact warm-up — joints first." },
];

// Cardio finishers — used for Heavy body type and Fat Loss goal.
const CARDIO_FINISHERS: Record<EquipTier, Exercise[]> = {
  "Full Gym": [
    { name: "Incline Treadmill Walk", duration: "10 min", rest: "0s", target_seconds: 600, notes: "Steady pace, ~120-140 bpm." },
    { name: "Stationary Bike Intervals", sets: 6, duration: "40s on / 60s easy", rest: "60s", target_seconds: 600, notes: "Hard but sustainable." },
    { name: "Rower — Steady", duration: "8 min", rest: "0s", target_seconds: 480, notes: "Long pulls, controlled breathing." },
  ],
  Home: [
    { name: "Marching in Place", duration: "5 min", rest: "0s", target_seconds: 300, notes: "Pump knees, swing arms." },
    { name: "Step-Ups (low bench)", sets: 4, reps: "20/side", rest: "45s", target_seconds: 480 },
    { name: "Shadow Boxing", sets: 4, duration: "60s", rest: "30s", target_seconds: 360 },
  ],
  None: [
    { name: "Marching in Place", duration: "5 min", rest: "0s", target_seconds: 300 },
    { name: "Modified Jumping Jacks (step-out)", sets: 4, duration: "45s", rest: "30s", target_seconds: 300 },
    { name: "Shadow Boxing", sets: 4, duration: "60s", rest: "30s", target_seconds: 360 },
    { name: "Wall Push-up Burst", sets: 3, reps: "15", rest: "30s", target_seconds: 225 },
  ],
};

const COOLDOWN: Exercise[] = [
  { name: "Target Muscle Static Stretch", duration: "60s/side", target_seconds: 120 },
  { name: "Thoracic Twist", duration: "60s", target_seconds: 60 },
  { name: "Deep Breathing", duration: "2 min", target_seconds: 120 },
];

function mapEquipment(equipment: string | null): EquipTier {
  if (equipment === "Full Gym") return "Full Gym";
  if (equipment === "No Equipment") return "None";
  return "Home"; // Home/Dumbbells or anything else
}

type BodyTier = "slim" | "average" | "athletic" | "heavy";
function mapBodyType(b: string | null | undefined): BodyTier {
  const s = (b ?? "").toLowerCase();
  if (s.startsWith("heavy") || s.includes("overweight")) return "heavy";
  if (s.startsWith("slim") || s.startsWith("thin")) return "slim";
  if (s.startsWith("athletic")) return "athletic";
  return "average";
}

export function generateWorkout(inputs: Inputs): WorkoutPlan {
  const day = inputs.dayOfWeek ?? new Date().getDay();
  const schedule = getDaySchedule(new Date(2026, 0, 4 + day), inputs.trainingDays);
  const tier = mapEquipment(inputs.equipment);
  const body = mapBodyType(inputs.bodyType);

  const groups =
    schedule.kind === "training"
      ? schedule.groups
      : ["Chest", "Back"];

  const lowEnergy = inputs.energy <= 4 || inputs.soreness >= 7;
  const highEnergy = inputs.energy >= 8 && inputs.soreness <= 4;

  // Heavy build: reserve time for a cardio finisher.
  const cardioBudget = body === "heavy" ? 12 : inputs.goal === "Fat Loss" ? 8 : 0;
  const strengthMinutes = Math.max(8, inputs.minutes - cardioBudget);
  const totalCount = Math.max(
    body === "heavy" ? 3 : 4,
    Math.round(strengthMinutes / 12) + (highEnergy ? 1 : 0) - (lowEnergy ? 1 : 0),
  );
  const perGroup = Math.max(2, Math.ceil(totalCount / groups.length));

  const main: Exercise[] = [];
  for (const g of groups) {
    const pool = EXERCISES[g]?.[tier] ?? [];
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, perGroup);
    for (const ex of picks) {
      let sets = ex.sets;
      if (sets) {
        sets = Math.max(2, sets + (highEnergy ? 0 : lowEnergy ? -1 : 0));
        if (body === "heavy") sets = Math.max(2, sets - 1);
      }
      const reps = body === "heavy" && ex.reps && /\d/.test(ex.reps)
        ? ex.reps.replace(/(\d+)\s*-\s*(\d+)/, (_, a, b) => `${+a + 2}-${+b + 4}`)
        : ex.reps;
      main.push({
        ...ex,
        sets,
        reps,
        notes: ex.notes ?? g,
      });
    }
  }

  // Cardio finisher: heavy body type or Fat Loss goal.
  if (body === "heavy" || inputs.goal === "Fat Loss") {
    const pool = CARDIO_FINISHERS[tier];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) main.push({ ...pick, notes: pick.notes ?? "Cardio finisher — keep it conversational." });
  }

  const warmup = body === "heavy" ? [...WARMUP, ...HEAVY_WARMUP_EXTRA] : WARMUP;

  const difficulty = lowEnergy ? "Recovery" : highEnergy ? "Hard" : "Moderate";

  const goalLine =
    inputs.goal === "Strength"
      ? "Heavier loads, longer rest — focus on bar speed."
      : inputs.goal === "Endurance"
        ? "Keep rest short, maintain a steady aerobic burn."
        : inputs.goal === "Muscle Mass"
          ? "Push close to failure on the last set of every exercise."
          : inputs.goal === "Fat Loss"
            ? "Trim rest where you can — keep heart rate elevated."
            : "Move with intent. Quality over quantity.";

  const bodyLine =
    body === "heavy"
      ? " Built for a heavier frame: lighter loads, higher reps, longer warm-up, and a cardio finisher to burn fat without trashing your joints."
      : body === "slim"
        ? " Slim build: prioritising volume + pump rep ranges for mass."
        : body === "athletic"
          ? " Athletic build: keeping intensity high — you can handle it."
          : "";

  return {
    title: `${groups.join(" + ")} · ${difficulty}`,
    focus: groups.join(" + "),
    estimated_minutes: inputs.minutes,
    difficulty,
    muscle_groups: groups,
    warmup,
    main,
    cooldown: COOLDOWN,
    ai_note: `${schedule.label} session. Energy ${inputs.energy}/10, soreness ${inputs.soreness}/10 — ${goalLine}${bodyLine}`,
  };
}

/** Format seconds into a human-readable string like "3 min", "1.5 min", "45 sec". */
export function fmtTarget(sec: number | undefined | null): string {
  const n = typeof sec === "number" && Number.isFinite(sec) ? Math.max(0, Math.round(sec)) : 0;
  if (n === 0) return "—";
  if (n < 60) return `${n} sec`;
  if (n === 60) return "1 min";
  if (n % 60 === 0) return `${n / 60} min`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (s === 30) return `${m}.5 min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
