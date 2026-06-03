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

export function getDaySchedule(date: Date = new Date()): DaySchedule {
  return WEEK_SCHEDULE[date.getDay()];
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

export function generateWorkout(inputs: Inputs): WorkoutPlan {
  const day = inputs.dayOfWeek ?? new Date().getDay();
  const schedule = WEEK_SCHEDULE[day];
  const tier = mapEquipment(inputs.equipment);

  // Determine target groups; on rest days fall back to a light full-body recovery feel.
  const groups =
    schedule.kind === "training"
      ? schedule.groups
      : ["Chest", "Back"]; // gentle default if generated on a rest day

  const lowEnergy = inputs.energy <= 4 || inputs.soreness >= 7;
  const highEnergy = inputs.energy >= 8 && inputs.soreness <= 4;

  // Aim for ~12 min per exercise — split evenly between the two groups.
  const totalCount = Math.max(
    4,
    Math.round(inputs.minutes / 12) + (highEnergy ? 1 : 0) - (lowEnergy ? 1 : 0),
  );
  const perGroup = Math.max(2, Math.ceil(totalCount / groups.length));

  const main: Exercise[] = [];
  for (const g of groups) {
    const pool = EXERCISES[g]?.[tier] ?? [];
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, perGroup);
    for (const ex of picks) {
      main.push({
        ...ex,
        notes: ex.notes ?? g,
        sets: ex.sets ? Math.max(2, ex.sets + (highEnergy ? 0 : lowEnergy ? -1 : 0)) : ex.sets,
      });
    }
  }

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

  return {
    title: `${groups.join(" + ")} · ${difficulty}`,
    focus: groups.join(" + "),
    estimated_minutes: inputs.minutes,
    difficulty,
    muscle_groups: groups,
    warmup: WARMUP,
    main,
    cooldown: COOLDOWN,
    ai_note: `${schedule.label} session. Energy ${inputs.energy}/10, soreness ${inputs.soreness}/10 — ${goalLine}`,
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
