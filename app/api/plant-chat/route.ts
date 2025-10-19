import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePlantReply, PlantChatMessage } from "@/lib/gemini";
import { resolvePlantMood } from "@/lib/plant-mood";
import type { PlantMoodDetails } from "@/lib/plant-mood";
import { prisma } from "@/lib/prisma";
import { TelemetryType } from "@prisma/client";

const messageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.string().min(1),
});

const requestSchema = z.object({
  plantId: z.string().min(1),
  plantName: z.string().min(1),
  emoji: z.string().min(1),
  messages: z.array(messageSchema).min(1),
});

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    let mood: PlantMoodDetails | undefined;
    let moisturePercent: number | null = null;

    try {
      const [moodDetails, lastMoisture] = await Promise.all([
        resolvePlantMood(parsed.data.plantId),
        prisma.plantTelemetry.findFirst({
          where: { plantId: parsed.data.plantId, type: TelemetryType.MOISTURE },
          orderBy: { sensorTimestamp: "desc" },
        }),
      ]);

      const rawMoisture = typeof lastMoisture?.moisture === "number" ? lastMoisture.moisture : null;
      moisturePercent =
        rawMoisture === null || Number.isNaN(rawMoisture)
          ? null
          : Math.round(Math.max(0, Math.min(1, rawMoisture)) * 100);

      mood = moodDetails;
    } catch (error) {
      console.error("Unable to resolve plant mood for chat", error);
    }

    const reply = await generatePlantReply({
      plantName: parsed.data.plantName,
      emoji: parsed.data.emoji,
      messages: parsed.data.messages,
      mood,
      moisturePercent,
    });
    const message: PlantChatMessage = { role: "assistant", content: reply };

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Failed to chat with plant", error);
    return NextResponse.json({ error: "Unable to talk to the plant right now." }, { status: 500 });
  }
}
