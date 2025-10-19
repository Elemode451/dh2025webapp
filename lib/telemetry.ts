import { prisma } from "@/lib/prisma";
import { isMoistureDanger, parseIdealMoisture } from "@/lib/moisture";
import { sendWaterAlert } from "@/lib/notifications";
import { TelemetryType, WateringAlertStatus } from "@prisma/client";

const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

type PlantReading = {
  plantId: string;
  moisture: number | null;
  sensorTimestamp: Date;
  wateringTimestamp: Date | null;
};

export async function handlePlantTelemetry(reading: PlantReading) {
  const plant = await prisma.plants.findUnique({
    where: { id: reading.plantId },
    include: {
      species: true,
    },
  });

  if (!plant) {
    return;
  }

  const ownerPhone = plant.ownerId;
  const idealRange = parseIdealMoisture(plant.species);

  if (typeof reading.moisture === "number" && !Number.isNaN(reading.moisture)) {
    await prisma.plantTelemetry.create({
      data: {
        plantId: plant.id,
        type: TelemetryType.MOISTURE,
        moisture: reading.moisture,
        sensorTimestamp: reading.sensorTimestamp,
      },
    });

    const inDanger = isMoistureDanger(reading.moisture, idealRange);

    if (inDanger) {
      await maybeTriggerAlert({
        plantId: plant.id,
        plantName: plant.plantName,
        ownerPhone,
        sensorTimestamp: reading.sensorTimestamp,
        moisture: reading.moisture,
      });
    }
  }

  if (reading.wateringTimestamp) {
    await prisma.plantTelemetry.create({
      data: {
        plantId: plant.id,
        type: TelemetryType.WATERING,
        sensorTimestamp: reading.wateringTimestamp,
      },
    });

    await fulfillMostRecentAlert({
      plantId: plant.id,
      wateredAt: reading.wateringTimestamp,
    });
  }
}

type TriggerAlertParams = {
  plantId: string;
  plantName: string;
  ownerPhone: string;
  sensorTimestamp: Date;
  moisture: number;
};

async function maybeTriggerAlert({
  plantId,
  plantName,
  ownerPhone,
  sensorTimestamp,
  moisture,
}: TriggerAlertParams) {
  const existingPending = await prisma.wateringAlert.findFirst({
    where: { plantId, status: WateringAlertStatus.PENDING },
    orderBy: { triggeredAt: "desc" },
  });

  if (existingPending) {
    const age = sensorTimestamp.getTime() - existingPending.triggeredAt.getTime();

    if (age < ALERT_COOLDOWN_MS) {
      return;
    }

    await prisma.wateringAlert.update({
      where: { id: existingPending.id },
      data: { status: WateringAlertStatus.MISSED },
    });
  }

  const alert = await prisma.wateringAlert.create({
    data: {
      plantId,
      status: WateringAlertStatus.PENDING,
      triggeredAt: sensorTimestamp,
    },
  });

  const moisturePercent = Math.max(0, Math.min(1, moisture)) * 100;

  await sendWaterAlert({
    to: ownerPhone,
    plantName,
    moisturePercent,
  });

  return alert;
}

type FulfillAlertParams = {
  plantId: string;
  wateredAt: Date;
};

async function fulfillMostRecentAlert({ plantId, wateredAt }: FulfillAlertParams) {
  const pending = await prisma.wateringAlert.findFirst({
    where: { plantId, status: WateringAlertStatus.PENDING },
    orderBy: { triggeredAt: "desc" },
  });

  if (!pending) {
    return;
  }

  await prisma.wateringAlert.update({
    where: { id: pending.id },
    data: {
      status: WateringAlertStatus.FULFILLED,
      fulfilledAt: new Date(),
      fulfilledSensorTimestamp: wateredAt,
    },
  });
}
