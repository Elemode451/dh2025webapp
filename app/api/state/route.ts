import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyPodTelemetry, syncPodSnapshot } from "@/lib/pod-state";
import { ensureDevTestingPlantFixture } from "@/lib/test-fixture";
import { handlePlantTelemetry } from "@/lib/telemetry";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to build pod snapshot", error);
    return NextResponse.json({ error: "Unable to fetch pod state" }, { status: 500 });
  }
}

const telemetryReadingSchema = z.object({
  moisture: z.number().optional(),
  watered: z.boolean().optional(),
});

const globalInfoSchema = z
  .object({
    avgTempC: z.number().optional(),
    avgHumidity: z.number().optional(),
  })
  .partial();

const telemetryPayloadSchema = z.object({
  podId: z.string().min(1, "podId is required"),
  at: z.number().optional(),
  plant_info: z.record(telemetryReadingSchema).optional(),
  global_info: globalInfoSchema.optional(),
});

const DHT11_MIN_HUMIDITY_PERCENT = 20;
const DHT11_MAX_HUMIDITY_PERCENT = 90;
const KY013_MIN_TEMP_C = -40;
const KY013_MAX_TEMP_C = 125;

function normalizeToMilliseconds(value: number) {
  return value > 1e11 ? value : value * 1000;
}

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = telemetryPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await ensureDevTestingPlantFixture();

  const { podId, at, plant_info, global_info } = parsed.data;

  try {
    const measurementTimestampMs =
      typeof at === "number" && !Number.isNaN(at)
        ? normalizeToMilliseconds(at)
        : Date.now();
    const snapshotTimestampSeconds = Math.floor(measurementTimestampMs / 1000);

    const normalizedPlantInfo: Record<string, { moisture?: number | null; lastWateredAt?: number | null }> = {};

    await Promise.all(
      Object.entries(plant_info ?? {}).map(async ([plantId, reading]) => {
        const normalized: { moisture?: number | null; lastWateredAt?: number | null } = {};

        if ("moisture" in reading) {
          normalized.moisture = reading.moisture;
        }

        const watered = reading.watered === true;
        const wateringTimestampMs = watered ? Date.now() : null;

        if (wateringTimestampMs) {
          normalized.lastWateredAt = Math.floor(wateringTimestampMs / 1000);
        }

        if (normalized.moisture !== undefined || normalized.lastWateredAt !== undefined) {
          normalizedPlantInfo[plantId] = normalized;
        }

        const moisture =
          typeof reading.moisture === "number" && !Number.isNaN(reading.moisture)
            ? reading.moisture
            : null;

        await handlePlantTelemetry({
          plantId,
          moisture,
          sensorTimestamp: new Date(measurementTimestampMs),
          wateringTimestamp: wateringTimestampMs ? new Date(wateringTimestampMs) : null,
        });
      }),
    );

    const normalizedGlobalInfo = normalizeGlobalInfo(global_info);

    applyPodTelemetry({
      podId,
      at: snapshotTimestampSeconds,
      plant_info: normalizedPlantInfo,
      global_info: normalizedGlobalInfo,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to ingest telemetry", error);
    return NextResponse.json({ error: "Unable to ingest telemetry" }, { status: 500 });
  }
}

function normalizeGlobalInfo(
  globalInfo: z.infer<typeof globalInfoSchema> | undefined,
): { avgTempC?: number | null; avgHumidity?: number | null } | undefined {
  if (!globalInfo) {
    return undefined;
  }

  const normalized: { avgTempC?: number | null; avgHumidity?: number | null } = {};

  if ("avgTempC" in globalInfo) {
    const temp = globalInfo.avgTempC;

    if (typeof temp === "number" && !Number.isNaN(temp)) {
      const clamped = Math.min(KY013_MAX_TEMP_C, Math.max(KY013_MIN_TEMP_C, temp));
      normalized.avgTempC = clamped;
    } else {
      normalized.avgTempC = null;
    }
  }

  if ("avgHumidity" in globalInfo) {
    const humidity = globalInfo.avgHumidity;

    if (typeof humidity === "number" && !Number.isNaN(humidity)) {
      const asPercent = Math.abs(humidity) <= 1 ? humidity * 100 : humidity;
      const clamped = Math.min(
        DHT11_MAX_HUMIDITY_PERCENT,
        Math.max(DHT11_MIN_HUMIDITY_PERCENT, asPercent),
      );
      normalized.avgHumidity = clamped / 100;
    } else {
      normalized.avgHumidity = null;
    }
  }

  return normalized;
}
