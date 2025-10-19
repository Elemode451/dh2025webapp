import { GoogleGenerativeAI } from "@google/generative-ai";

let cachedModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!cachedModel) {
    const genAI = new GoogleGenerativeAI(apiKey);
    cachedModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
};

export async function generatePlantReply({
  plantName,
  emoji,
  messages,
}: GeneratePlantReplyInput) {
  const model = getModel();
  const recentMessages = messages.slice(-12);
  const transcript = recentMessages
    .map((message) => {
      const speaker = message.role === "user" ? "Gardener" : plantName;
      return `${speaker}: ${message.content}`;
    })
    .join("\n");

  const prompt = `You are ${plantName} ${emoji}, a cheerful and encouraging houseplant chatting with your caretaker.
Keep your responses warm, optimistic, and no longer than 80 words.
If you offer care tips, keep them light and positive.

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
