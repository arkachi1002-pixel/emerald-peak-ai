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
type EquipTier = "Full Gym" | "Home" | "None";
const EXERCISES: Record<string, Record<EquipTier, Exercise[]>> = {
  Chest: {
    "Full Gym": [
      { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Cable Chest Fly", sets: 3, reps: "12", rest: "60s" },
      { name: "Machine Chest Press", sets: 3, reps: "10-12", rest: "60s" },
    ],
    Home: [
      { name: "Dumbbell Bench Press (floor)", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Dumbbell Fly", sets: 3, reps: "12", rest: "60s" },
      { name: "Push-ups", sets: 4, reps: "AMRAP", rest: "60s" },
      { name: "Incline Push-ups", sets: 3, reps: "12-15", rest: "45s" },
    ],
    None: [
      { name: "Push-ups", sets: 4, reps: "12-15", rest: "60s" },
      { name: "Diamond Push-ups", sets: 3, reps: "8-12", rest: "60s" },
      { name: "Decline Push-ups", sets: 3, reps: "10-12", rest: "60s" },
      { name: "Archer Push-ups", sets: 3, reps: "6/side", rest: "60s" },
    ],
  },
  Biceps: {
    "Full Gym": [
      { name: "Barbell Curl", sets: 4, reps: "8-10", rest: "60s" },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", rest: "60s" },
      { name: "Hammer Curl", sets: 3, reps: "10/side", rest: "45s" },
      { name: "Cable Curl", sets: 3, reps: "12", rest: "45s" },
    ],
    Home: [
      { name: "Dumbbell Curl", sets: 4, reps: "10-12", rest: "60s" },
      { name: "Hammer Curl", sets: 3, reps: "10/side", rest: "45s" },
      { name: "Concentration Curl", sets: 3, reps: "12/side", rest: "45s" },
    ],
    None: [
      { name: "Chin-ups (or assisted)", sets: 4, reps: "AMRAP", rest: "75s" },
      { name: "Towel Door Curl", sets: 3, reps: "12", rest: "45s" },
      { name: "Isometric Curl Hold", sets: 3, duration: "30s", rest: "45s" },
    ],
  },
  Triceps: {
    "Full Gym": [
      { name: "Close-Grip Bench Press", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Cable Tricep Pushdown", sets: 4, reps: "10-12", rest: "60s" },
      { name: "Overhead Cable Extension", sets: 3, reps: "12", rest: "60s" },
      { name: "Dips", sets: 3, reps: "AMRAP", rest: "60s" },
    ],
    Home: [
      { name: "Dumbbell Skullcrusher", sets: 4, reps: "10", rest: "60s" },
      { name: "Overhead Dumbbell Extension", sets: 3, reps: "12", rest: "60s" },
      { name: "Bench Dips", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Close-Grip Push-ups", sets: 3, reps: "10-12", rest: "60s" },
    ],
    None: [
      { name: "Diamond Push-ups", sets: 4, reps: "10-12", rest: "60s" },
      { name: "Bench / Chair Dips", sets: 4, reps: "12-15", rest: "45s" },
      { name: "Pike Push-ups", sets: 3, reps: "10", rest: "60s" },
    ],
  },
  Back: {
    "Full Gym": [
      { name: "Deadlift", sets: 3, reps: "5", rest: "120s" },
      { name: "Pull-ups", sets: 4, reps: "AMRAP", rest: "90s" },
      { name: "Bent-over Barbell Row", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: "60s" },
      { name: "Seated Cable Row", sets: 3, reps: "12", rest: "60s" },
    ],
    Home: [
      { name: "Dumbbell Row", sets: 4, reps: "10/side", rest: "60s" },
      { name: "Romanian Deadlift (DB)", sets: 3, reps: "10", rest: "75s" },
      { name: "Reverse Fly", sets: 3, reps: "12", rest: "45s" },
      { name: "Renegade Row", sets: 3, reps: "8/side", rest: "60s" },
    ],
    None: [
      { name: "Pull-ups", sets: 4, reps: "AMRAP", rest: "75s" },
      { name: "Inverted Rows (under table)", sets: 4, reps: "10-12", rest: "60s" },
      { name: "Superman Hold", sets: 3, duration: "30s", rest: "30s" },
      { name: "Reverse Snow Angels", sets: 3, reps: "15", rest: "30s" },
    ],
  },
  Shoulders: {
    "Full Gym": [
      { name: "Overhead Barbell Press", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", rest: "45s" },
      { name: "Cable Rear Delt Fly", sets: 3, reps: "12", rest: "45s" },
      { name: "Arnold Press", sets: 3, reps: "10", rest: "60s" },
    ],
    Home: [
      { name: "Dumbbell Shoulder Press", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Lateral Raise", sets: 4, reps: "12-15", rest: "45s" },
      { name: "Front Raise", sets: 3, reps: "12", rest: "45s" },
      { name: "Bent-over Rear Delt Fly", sets: 3, reps: "12", rest: "45s" },
    ],
    None: [
      { name: "Pike Push-ups", sets: 4, reps: "8-10", rest: "60s" },
      { name: "Wall Handstand Hold", sets: 3, duration: "30s", rest: "60s" },
      { name: "Plank Shoulder Taps", sets: 3, reps: "20", rest: "45s" },
    ],
  },
  Legs: {
    "Full Gym": [
      { name: "Barbell Back Squat", sets: 4, reps: "6-8", rest: "120s" },
      { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: "90s" },
      { name: "Leg Press", sets: 3, reps: "10-12", rest: "75s" },
      { name: "Walking Lunges", sets: 3, reps: "10/side", rest: "60s" },
      { name: "Standing Calf Raise", sets: 4, reps: "15", rest: "45s" },
    ],
    Home: [
      { name: "Goblet Squat", sets: 4, reps: "10-12", rest: "75s" },
      { name: "Dumbbell RDL", sets: 4, reps: "10", rest: "75s" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10/side", rest: "60s" },
      { name: "Calf Raise", sets: 3, reps: "15", rest: "30s" },
    ],
    None: [
      { name: "Bodyweight Squat", sets: 4, reps: "20", rest: "60s" },
      { name: "Reverse Lunge", sets: 3, reps: "12/side", rest: "60s" },
      { name: "Pistol Squat (assisted)", sets: 3, reps: "6/side", rest: "60s" },
      { name: "Glute Bridge", sets: 3, reps: "15", rest: "45s" },
      { name: "Calf Raise", sets: 3, reps: "20", rest: "30s" },
    ],
  },
};

const WARMUP: Exercise[] = [
  { name: "Dynamic Mobility Flow", duration: "3 min" },
  { name: "Leg Swings + Arm Circles", duration: "2 min" },
  { name: "Light Cardio Ramp-Up", duration: "3 min" },
];

const COOLDOWN: Exercise[] = [
  { name: "Target Muscle Static Stretch", duration: "60s/side" },
  { name: "Thoracic Twist", duration: "60s" },
  { name: "Deep Breathing", duration: "2 min" },
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
