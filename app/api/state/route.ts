import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncPodSnapshot } from "@/lib/pod-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const podId = searchParams.get("podId");

  if (!podId) {
    return NextResponse.json({ error: "podId is required" }, { status: 400 });
  }

  try {
    const plants = await prisma.plants.findMany({
      where: { ownerId: session.user.phoneNumber, podId },
      select: { id: true },
    });

    if (plants.length === 0) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    const snapshot = syncPodSnapshot(
      podId,
      plants.map((plant) => plant.id),
    );

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to build pod snapshot", error);
    return NextResponse.json({ error: "Unable to fetch pod state" }, { status: 500 });
  }
}
