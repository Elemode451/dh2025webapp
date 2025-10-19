import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: { friendId: string } },
) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.phoneNumber;
  const friendId = decodeURIComponent(context.params.friendId);

  if (!friendId) {
    return NextResponse.json({ error: "Friend ID required" }, { status: 400 });
  }

  const relationship = await prisma.user.findUnique({
    where: { phoneNumber: currentUserId },
    select: {
      friends: {
        where: { phoneNumber: friendId },
        select: { phoneNumber: true },
      },
      friendOf: {
        where: { phoneNumber: friendId },
        select: { phoneNumber: true },
      },
    },
  });

  const isFriend = Boolean(
    relationship && (relationship.friends.length > 0 || relationship.friendOf.length > 0),
  );

  if (!isFriend) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  const plants = await prisma.plants.findMany({
    where: { ownerId: friendId },
    include: { species: true },
    orderBy: { plantName: "asc" },
  });

  const payload = plants.map((plant) => ({
    id: plant.id,
    plantName: plant.plantName,
    emoji: null as string | null,
    species: {
      scientificName: plant.species.scientificName,
      name: plant.species.name,
    },
    podId: plant.podId,
  }));

  return NextResponse.json({ plants: payload });
}
