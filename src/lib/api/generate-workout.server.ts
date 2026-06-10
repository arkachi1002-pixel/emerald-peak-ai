import process from "node:process";

import { WorkoutPlan, Inputs, getDaySchedule } from "../generate-workout";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://gemini.labs.google.com/v1/models/${GEMINI_MODEL}:generate`;

function buildPrompt(inputs: Inputs) {
  const trainingDays = inputs.trainingDays?.length
    ? inputs.trainingDays.join(", ")
    : "Mon, Wed, Fri";

  const dayLabel = getDaySchedule(new Date(), inputs.trainingDays).label;
  const goal = inputs.goal ? `${inputs.goal} training` : "general fitness training";
  const equipment = inputs.equipment ? inputs.equipment : "No equipment";
  const experience = inputs.experience ? inputs.experience : "beginner";
  const bodyType = inputs.bodyType ? inputs.bodyType : "balanced";

  return `You are an expert fitness coach.
Create one personalized workout plan for a user in valid JSON only.
Do not include any markdown, explanation, or extra text.

The JSON object must contain exactly these keys:
- title
- focus
- estimated_minutes
- difficulty
- muscle_groups
- warmup
- main
- cooldown
- ai_note

Each exercise item in warmup, main, and cooldown must include:
- name
- target_seconds
Optionally include:
- sets
- reps
- rest
- duration
- notes

User details:
- Goal: ${goal}
- Experience: ${experience}
- Equipment: ${equipment}
- Body type: ${bodyType}
- Available minutes: ${inputs.minutes}
- Energy: ${inputs.energy}/10
- Soreness: ${inputs.soreness}/10
- Training days: ${trainingDays}
- Today is: ${dayLabel}

Make the workout feel adaptive to energy, soreness, and available time. Keep the session focused, efficient, and safe.
Set difficulty to Beginner, Intermediate, or Advanced.
Set estimated_minutes close to the available minutes.
Make muscle_groups an array of the main muscle groups targeted.
Set ai_note to a short summary of why this plan fits the user's current state.
`;
}

function extractTextFromGeminiResponse(responseJson: any): string {
  if (!responseJson) return "";
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  if (Array.isArray(responseJson.candidates) && responseJson.candidates[0]?.content?.[0]?.text) {
    return responseJson.candidates[0].content[0].text;
  }
  if (Array.isArray(responseJson.output?.[0]?.content) && responseJson.output[0].content[0]?.text) {
    return responseJson.output[0].content[0].text;
  }
  return JSON.stringify(responseJson);
}

export async function aiGenerateWorkoutPlan(inputs: Inputs): Promise<WorkoutPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the server environment.");
  }

  const prompt = buildPrompt(inputs);

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: {
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      },
      temperature: 0.2,
      max_output_tokens: 1024,
      candidate_count: 1,
    }),
  });

  const responseText = await response.text();
  let responseJson: any;

  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${responseText}`);
  }

  if (!response.ok) {
    const errorBody = responseJson?.error || responseText;
    throw new Error(`Gemini request failed: ${response.status} ${JSON.stringify(errorBody)}`);
  }

  const rawText = extractTextFromGeminiResponse(responseJson).trim();
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();

  let jsonText = cleaned;
  if (!jsonText.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = cleaned.slice(start, end + 1);
    }
  }

  try {
    const plan = JSON.parse(jsonText) as WorkoutPlan;
    return plan;
  } catch (error: any) {
    throw new Error(`Failed to parse Gemini workout JSON: ${error.message}. Raw output: ${cleaned}`);
  }
}
