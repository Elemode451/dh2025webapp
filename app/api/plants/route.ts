import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchPlantInfo } from "@/lib/gemini";

const createPlantSchema = z.object({
  nickname: z.string().min(1),
  scientificName: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scientificName = searchParams.get("scientificName");

  if (!scientificName) {
    return NextResponse.json({ error: "scientificName is required" }, { status: 400 });
  }

  // 1. Check Prisma first
  const existing = await prisma.plantSpecies.findUnique({
    where: { scientificName },
  });

  if (existing) {
    console.log("Found in DB:", scientificName);
    return NextResponse.json(existing);
  }

  // 2️. Query Gemini if not in DB
  console.log("Fetching from Gemini:", scientificName);
  const info = await fetchPlantInfo(scientificName);

  // 3️. Save to DB
  const newPlant = await prisma.plantSpecies.create({
    data: {
      scientificName,
      name: info.common_name || scientificName,
      idealLight: info.ideal_light,
      idealTemp: info.ideal_temp,
      idealMoisture: info.ideal_moisture,
      description: info.description,
    },
  });

  return NextResponse.json(newPlant);
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPlantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nickname = parsed.data.nickname.trim();
  const scientificName = parsed.data.scientificName.trim();

  try {
    const species = await prisma.plantSpecies.upsert({
      where: { scientificName },
      update: {},
      create: {
        scientificName,
        name: scientificName,
      },
    });

    const plant = await prisma.plants.create({
      data: {
        plantName: nickname,
        ownerId: session.user.phoneNumber,
        speciesName: species.scientificName,
      },
      include: {
        species: true,
      },
    });

    return NextResponse.json({ plant });
  } catch (error) {
    console.error("Failed to save plant", error);
    return NextResponse.json({ error: "Unable to save plant right now." }, { status: 500 });
  }
}
