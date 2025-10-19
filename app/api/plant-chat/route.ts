import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePlantReply, PlantChatMessage } from "@/lib/gemini";

const messageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.string().min(1),
});

const requestSchema = z.object({
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
    const reply = await generatePlantReply(parsed.data);
    const message: PlantChatMessage = { role: "assistant", content: reply };

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Failed to chat with plant", error);
    return NextResponse.json({ error: "Unable to talk to the plant right now." }, { status: 500 });
  }
}
