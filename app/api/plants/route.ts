import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPlantInfo } from "@/lib/gemini";

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
    console.log("✅ Found in DB:", scientificName);
    return NextResponse.json(existing);
  }

  // 2️. Query Gemini if not in DB
  console.log("🔍 Fetching from Gemini:", scientificName);
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
