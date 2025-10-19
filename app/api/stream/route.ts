import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subscribeToPod, syncPodSnapshot, type PodSnapshot } from "@/lib/pod-state";
import { ensureDevTestingPlantFixture } from "@/lib/test-fixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDevTestingPlantFixture(session.user.phoneNumber);

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

    let cleanup: (() => void) | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (data: PodSnapshot) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (error) {
            console.error("Failed to enqueue SSE payload", error);
          }
        };

        send(snapshot);
        const unsubscribe = subscribeToPod(podId, send);
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`:keep-alive\n\n`));
          } catch (error) {
            console.error("Failed to send heartbeat", error);
          }
        }, 25_000);

        let cleaned = false;

        const handleCleanup = () => {
          if (cleaned) {
            return;
          }

          cleaned = true;
          cleanup = null;
          clearInterval(heartbeat);
          unsubscribe();
          req.signal.removeEventListener("abort", handleAbort);

          try {
            controller.close();
          } catch (error) {
            console.error("Failed to close SSE stream", error);
          }
        };

        const handleAbort = () => {
          handleCleanup();
        };

        req.signal.addEventListener("abort", handleAbort);
        cleanup = handleCleanup;
      },
      cancel() {
        cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to open pod stream", error);
    return NextResponse.json({ error: "Unable to stream pod state" }, { status: 500 });
  }
}
