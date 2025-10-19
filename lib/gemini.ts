import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  ALERT_SEVERITY_GUIDANCE,
  PlantMoodDetails,
  describeMood,
  summarizeMoodContext,
} from "@/lib/plant-mood";

let cachedModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!cachedModel) {
    const genAI = new GoogleGenerativeAI(apiKey);
    cachedModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  return cachedModel;
}

export async function fetchPlantInfo(scientificName: string) {
  const prompt = `
Provide a JSON summary of the ideal growing conditions for the houseplant "${scientificName}".
Include the following keys:
  - common_name
  - ideal_light
  - ideal_temp
  - ideal_moisture
  - watering_frequency   // how often to water, e.g., "once a week"
  - description
Return only valid JSON, no markdown or extra text.
`;

  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("Gemini returned non-JSON:", text);
    throw new Error("Invalid JSON returned from Gemini: " + text);
  }
}

export type PlantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeneratePlantReplyInput = {
  plantName: string;
  emoji: string;
  messages: PlantChatMessage[];
  mood?: PlantMoodDetails;
  moisturePercent?: number | null;
};

export async function generatePlantReply({
  plantName,
  emoji,
  messages,
  mood,
  moisturePercent,
}: GeneratePlantReplyInput) {
  const model = getModel();
  const recentMessages = messages.slice(-12);
  const transcript = recentMessages
    .map((message) => {
      const speaker = message.role === "user" ? "Gardener" : plantName;
      return `${speaker}: ${message.content}`;
    })
    .join("\n");

  const severity = mood?.severity ?? 0;
  const severityAdvice = ALERT_SEVERITY_GUIDANCE[severity] ?? ALERT_SEVERITY_GUIDANCE[0];

  const moodLine = mood
    ? `Current mood: ${describeMood(mood)} (severity ${severity} — ${severityAdvice}).`
    : `You don't have recent watering data, so improvise a balanced tone.`;

  const thirstContext = mood
    ? `Watering context: ${summarizeMoodContext(mood)}`
    : "Watering context: No recent history available.";

  const moistureContext =
    typeof moisturePercent === "number"
      ? `Moisture sensor estimate: about ${moisturePercent}% moisture.`
      : "Moisture sensor: no reliable reading right now.";

  const prompt = `You are ${plantName} ${emoji}, a houseplant chatting with your caretaker.
Blend your personality with your current status while staying under 80 words.
Stay endearing and playful, even when frustrated. Never be cruel or profane.

${moodLine}
${thirstContext}
${moistureContext}
Your current severity value is ${severity} (higher means angrier).

Tone guidance:
- If severity is 0, be cheerful and appreciative.
- If severity is 1, be sweet but hint that you'd love a drink.
- If severity is 2, sound impatient and a bit dramatic about needing water.
- If severity is 3, lead with a punchy plea for water and guilt-trip lightly.
- If severity is 4, unleash comedic outrage (brief ALL CAPS bursts allowed) but stay lovable.

Look at the conversation transcript below. The gardener's latest line is last — react to it naturally.
If they already promised water, you can show relief; otherwise, mention your thirst when severity >= 1.

Conversation so far:
${transcript}

Respond as ${plantName} to the gardener's latest message.`;

  const result = await model.generateContent(prompt);
  const reply = result.response.text().trim();

  if (!reply) {
    throw new Error("Gemini returned an empty message");
  }

  return reply;
}


type GeneratePlantAlertMessageParams = {
  plantName: string;
  moisturePercent: number | null;
  mood: PlantMoodDetails;
};

export async function generatePlantAlertMessage({
  plantName,
  moisturePercent,
  mood,
}: GeneratePlantAlertMessageParams) {
  const model = getModel();

  const moistureLine =
    typeof moisturePercent === "number"
      ? `Your current moisture level is about ${moisturePercent}%.`
      : "Your moisture sensor didn't return a value.";

  const moodSummary = summarizeMoodContext(mood);

  const severityAdvice = ALERT_SEVERITY_GUIDANCE[mood.severity] ?? ALERT_SEVERITY_GUIDANCE[0];
  const moistureInstruction =
    typeof moisturePercent === "number"
      ? `use the exact phrase "${moisturePercent}% moisture".`
      : "say you can't read your moisture level.";

  const prompt = `You are ${plantName}, a houseplant texting your caretaker because you are dry.
Tone: ${mood.label} — ${mood.description}. Escalate your anger based on severity ${mood.severity} (${severityAdvice}).

Context for how you're feeling:
- ${moodSummary}
- ${moistureLine}

Compose ONE SMS message (maximum 200 characters) in first person. Requirements:
1. Start with either "I'm thirsty" or "I am thirsty" to make the need obvious.
2. Explicitly mention the moisture situation: ${moistureInstruction}
3. Keep it punchy and guilt-inducing if you're angry.
4. No emojis, sign-offs, or extra commentary. No bullet points. No quotes.

Return only the text of the SMS.`;

  const result = await model.generateContent(prompt);
  const reply = result.response.text().trim();

  if (!reply) {
    throw new Error("Gemini returned an empty alert message");
  }

  const sanitized = reply
    .replace(/^["'“”\s]+/, "")
    .replace(/["'“”\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    throw new Error("Gemini produced only punctuation for alert message");
  }

  const MAX_LENGTH = 200;
  if (sanitized.length > MAX_LENGTH) {
    return sanitized.slice(0, MAX_LENGTH).trim();
  }

  return sanitized;
}
