import process from "node:process";

import { WorkoutPlan, Inputs, getDaySchedule } from "../generate-workout";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  return typeof property === "string" ? property : undefined;
}

function extractTextFromGeminiResponse(responseJson: unknown): string {
  if (!responseJson) return "";
  const outputText = getStringProperty(responseJson, "output_text");
  if (outputText) return outputText;

  const candidates = isRecord(responseJson) ? responseJson.candidates : undefined;
  const firstCandidate = Array.isArray(candidates) ? candidates[0] : undefined;
  const content = isRecord(firstCandidate) ? firstCandidate.content : undefined;
  const parts = isRecord(content) ? content.parts : undefined;
  if (Array.isArray(parts)) {
    return parts.map((part) => getStringProperty(part, "text") ?? "").join("");
  }

  const output = isRecord(responseJson) ? responseJson.output : undefined;
  const firstOutput = Array.isArray(output) ? output[0] : undefined;
  const outputContent = isRecord(firstOutput) ? firstOutput.content : undefined;
  const firstContent = Array.isArray(outputContent) ? outputContent[0] : undefined;
  const text = getStringProperty(firstContent, "text");
  if (text) {
    return text;
  }

  return JSON.stringify(responseJson);
}

export async function aiGenerateWorkoutPlan(inputs: Inputs): Promise<WorkoutPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the server environment.");
  }

  const prompt = buildPrompt(inputs);
  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  const responseText = await response.text();
  let responseJson: unknown;

  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${responseText}`);
  }

  if (!response.ok) {
    const errorBody =
      isRecord(responseJson) && responseJson.error ? responseJson.error : responseText;
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Failed to parse Gemini workout JSON: ${message}. Raw output: ${cleaned}`);
  }
}
