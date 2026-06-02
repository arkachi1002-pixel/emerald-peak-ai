// Mock AI workout generator. Swap this with an LLM API call later.

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
};

const POOLS: Record<string, Exercise[]> = {
  Gym: [
    { name: "Barbell Back Squat", sets: 4, reps: "6-8", rest: "90s" },
    { name: "Bench Press", sets: 4, reps: "6-8", rest: "90s" },
    { name: "Deadlift", sets: 3, reps: "5", rest: "120s" },
    { name: "Pull-ups", sets: 4, reps: "AMRAP", rest: "75s" },
    { name: "Overhead Press", sets: 3, reps: "8-10", rest: "75s" },
    { name: "Bent-over Row", sets: 4, reps: "8-10", rest: "75s" },
    { name: "Romanian Deadlift", sets: 3, reps: "10", rest: "75s" },
  ],
  Football: [
    { name: "Sprint Intervals", sets: 6, reps: "40m", rest: "60s" },
    { name: "Cone Agility Drill", sets: 5, reps: "30s", rest: "45s" },
    { name: "Box Jumps", sets: 4, reps: "8", rest: "60s" },
    { name: "Lateral Bounds", sets: 4, reps: "12", rest: "45s" },
    { name: "Single-Leg RDL", sets: 3, reps: "10/side", rest: "60s" },
  ],
  MMA: [
    { name: "Shadow Boxing", sets: 5, duration: "3 min", rest: "60s" },
    { name: "Heavy Bag Combos", sets: 5, duration: "3 min", rest: "60s" },
    { name: "Burpee → Sprawl", sets: 4, reps: "15", rest: "45s" },
    { name: "Med Ball Slams", sets: 4, reps: "12", rest: "45s" },
    { name: "Plank to Push-up", sets: 3, reps: "12", rest: "45s" },
  ],
  Running: [
    { name: "Easy Pace Run", sets: 1, duration: "20 min", notes: "Zone 2" },
    { name: "Tempo Intervals", sets: 5, duration: "3 min on / 90s easy" },
    { name: "Hill Sprints", sets: 8, duration: "30s", rest: "90s" },
    { name: "Strides", sets: 6, duration: "20s fast" },
  ],
  Bodyweight: [
    { name: "Push-ups", sets: 4, reps: "12-15", rest: "45s" },
    { name: "Pistol Squat (assisted)", sets: 3, reps: "6/side", rest: "60s" },
    { name: "Pike Push-ups", sets: 3, reps: "10", rest: "60s" },
    { name: "Inverted Rows", sets: 4, reps: "10-12", rest: "60s" },
    { name: "Hollow Body Hold", sets: 3, duration: "30s", rest: "30s" },
  ],
};

const WARMUP: Exercise[] = [
  { name: "Dynamic Mobility Flow", duration: "3 min" },
  { name: "Leg Swings + Arm Circles", duration: "2 min" },
  { name: "Light Cardio Ramp-Up", duration: "3 min" },
];

const COOLDOWN: Exercise[] = [
  { name: "Hip Flexor Stretch", duration: "45s/side" },
  { name: "Hamstring Stretch", duration: "45s/side" },
  { name: "Thoracic Twist", duration: "60s" },
  { name: "Deep Breathing", duration: "2 min" },
];

export function generateWorkout(inputs: Inputs): WorkoutPlan {
  const sport = inputs.sport && POOLS[inputs.sport] ? inputs.sport : "Bodyweight";
  const pool = POOLS[sport];

  // Scale volume by energy and time
  const lowEnergy = inputs.energy <= 4 || inputs.soreness >= 7;
  const highEnergy = inputs.energy >= 8 && inputs.soreness <= 4;
  const exerciseCount = Math.max(
    3,
    Math.min(pool.length, Math.round(inputs.minutes / 12) + (highEnergy ? 1 : 0) - (lowEnergy ? 1 : 0)),
  );

  // Shuffle pool deterministically-ish
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, exerciseCount);

  // Adjust sets based on intensity
  const main = shuffled.map((ex) => ({
    ...ex,
    sets: ex.sets ? Math.max(2, ex.sets + (highEnergy ? 0 : lowEnergy ? -1 : 0)) : ex.sets,
  }));

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
    title: `${sport} · ${difficulty} Session`,
    focus: inputs.goal ?? "General",
    estimated_minutes: inputs.minutes,
    difficulty,
    warmup: WARMUP,
    main,
    cooldown: COOLDOWN,
    ai_note: `Based on energy ${inputs.energy}/10 and soreness ${inputs.soreness}/10 — ${goalLine}`,
  };
}
