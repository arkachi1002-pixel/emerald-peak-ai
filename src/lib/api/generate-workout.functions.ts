import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { aiGenerateWorkoutPlan } from "./generate-workout.server";
import { Inputs } from "../generate-workout";

export const generateWorkoutAi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sport: z.string().nullable(),
      experience: z.string().nullable(),
      equipment: z.string().nullable(),
      goal: z.string().nullable(),
      bodyType: z.string().nullable(),
      energy: z.number().min(1).max(10),
      soreness: z.number().min(1).max(10),
      minutes: z.number().min(5).max(180),
      dayOfWeek: z.number().min(0).max(6).optional(),
      trainingDays: z.array(z.string()).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return await aiGenerateWorkoutPlan(data as Inputs);
  });
