import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncPodSnapshot } from "@/lib/pod-state";

const assignSchema = z.object({
  podId: z.string().min(1, "podId is required"),
  plantIds: z.array(z.string().min(1)).min(1, "Select at least one plant"),
});

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(payload);

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

  const ownerId = session.user.phoneNumber;
  const { podId, plantIds } = parsed.data;

  try {
    const ownedPlants = await prisma.plants.findMany({
      where: {
        id: { in: plantIds },
        ownerId,
      },
      select: { id: true, podId: true },
    });

    if (ownedPlants.length !== plantIds.length) {
      return NextResponse.json({ error: "One or more plants are not accessible" }, { status: 403 });
    }

    const previousPods = new Set<string>();

    for (const plant of ownedPlants) {
      if (plant.podId && plant.podId !== podId) {
        previousPods.add(plant.podId);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.plants.updateMany({
        where: {
          id: { in: plantIds },
          ownerId,
        },
        data: { podId },
      });

      const podMembers = await tx.plants.findMany({
        where: { ownerId, podId },
        select: { id: true },
      });

      const plants = await tx.plants.findMany({
        where: { ownerId },
        include: { species: true },
        orderBy: { plantName: "asc" },
      });

      const previousSnapshots = await Promise.all(
        Array.from(previousPods).map(async (previousPodId) => {
          const members = await tx.plants.findMany({
            where: { ownerId, podId: previousPodId },
            select: { id: true },
          });

          return { podId: previousPodId, members };
        }),
      );

      return { podMembers, plants, previousSnapshots };
    });

    syncPodSnapshot(
      podId,
      result.podMembers.map((plant) => plant.id),
    );

    for (const previous of result.previousSnapshots) {
      syncPodSnapshot(
        previous.podId,
        previous.members.map((plant) => plant.id),
      );
    }

    const normalizedPlants = result.plants.map((plant) => ({
      id: plant.id,
      plantName: plant.plantName,
      emoji: null as string | null,
      species: {
        scientificName: plant.species.scientificName,
        name: plant.species.name,
      },
      podId: plant.podId,
    }));

    return NextResponse.json({
      podId,
      plants: normalizedPlants,
    });
  } catch (error) {
    console.error("Failed to assign pod", error);
    return NextResponse.json({ error: "Unable to register pod" }, { status: 500 });
  }
}
