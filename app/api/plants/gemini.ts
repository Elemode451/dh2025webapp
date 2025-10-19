import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("Gemini returned non-JSON:", text);
    throw new Error("Invalid JSON returned from Gemini: " + text);
  }
}
