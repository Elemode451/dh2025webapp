import { prisma } from "@/lib/prisma";
import { applyPodTelemetry } from "@/lib/pod-state";
import { handlePlantTelemetry } from "@/lib/telemetry";
import { WateringAlertStatus } from "@prisma/client";

// TEST FIXTURE: remove this file once real telemetry/dev seeding is in place.
const TEST_FIXTURE_USER_PHONE = "+15555550123"; // TEST VALUE: seeded dev user phone
const TEST_FIXTURE_USER_NAME = "Test Gardener"; // TEST VALUE: seeded dev user display name
const TEST_FIXTURE_PASSWORD_HASH = "$2b$10$UXb0dqCzbWAatRF2Mfcf9OCwTMCQM/w0dLtHs3cnkbIOPUqpyjwvG"; // TEST VALUE: bcrypt for PlantBuddy!1

const TEST_FIXTURE_SPECIES_ID = "fixture.species.remove.me"; // TEST VALUE: dev species identifier
const TEST_FIXTURE_SPECIES_NAME = "Demo Daisy (REMOVE)"; // TEST VALUE: dev species name
const TEST_FIXTURE_SPECIES_IDEAL_MOISTURE = "45-60%"; // TEST VALUE: dev species ideal moisture band

const TEST_FIXTURE_POD_ID = "pod-demo-fixture"; // TEST VALUE: dev pod id
const TEST_FIXTURE_PLANT_ID = "11111111-2222-3333-4444-555555555555"; // TEST VALUE: dev plant id
const TEST_FIXTURE_PLANT_NAME = "Fixture Fern (REMOVE)"; // TEST VALUE: dev plant name

let pendingProvision: Promise<void> | null = null;
let telemetryInterval: NodeJS.Timeout | null = null;

export type TestFixtureDetails = {
  userPhone: string;
  password: string;
  podId: string;
  plantId: string;
};

export const TEST_FIXTURE_DETAILS: TestFixtureDetails = {
  userPhone: TEST_FIXTURE_USER_PHONE,
  password: "PlantBuddy!1",
  podId: TEST_FIXTURE_POD_ID,
  plantId: TEST_FIXTURE_PLANT_ID,
};

export async function ensureDevTestingPlantFixture() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (!pendingProvision) {
    pendingProvision = provisionFixture().catch((error) => {
      pendingProvision = null;
      console.error("Failed to provision test fixture", error);
    });
  }

  await pendingProvision;
}

async function provisionFixture() {
  await prisma.user.upsert({
    where: { phoneNumber: TEST_FIXTURE_USER_PHONE },
    update: {},
    create: {
      phoneNumber: TEST_FIXTURE_USER_PHONE,
      passwordHash: TEST_FIXTURE_PASSWORD_HASH,
      name: TEST_FIXTURE_USER_NAME,
    },
  });

  await prisma.plantSpecies.upsert({
    where: { scientificName: TEST_FIXTURE_SPECIES_ID },
    update: {
      name: TEST_FIXTURE_SPECIES_NAME,
      idealMoisture: TEST_FIXTURE_SPECIES_IDEAL_MOISTURE,
    },
    create: {
      scientificName: TEST_FIXTURE_SPECIES_ID,
      name: TEST_FIXTURE_SPECIES_NAME,
      idealMoisture: TEST_FIXTURE_SPECIES_IDEAL_MOISTURE,
    },
  });

  await prisma.plants.upsert({
    where: { id: TEST_FIXTURE_PLANT_ID },
    update: {
      ownerId: TEST_FIXTURE_USER_PHONE,
      plantName: TEST_FIXTURE_PLANT_NAME,
      speciesName: TEST_FIXTURE_SPECIES_ID,
      podId: TEST_FIXTURE_POD_ID,
    },
    create: {
      id: TEST_FIXTURE_PLANT_ID,
      ownerId: TEST_FIXTURE_USER_PHONE,
      plantName: TEST_FIXTURE_PLANT_NAME,
      speciesName: TEST_FIXTURE_SPECIES_ID,
      podId: TEST_FIXTURE_POD_ID,
    },
  });

  await seedTestTelemetry();
  startTelemetryLoop();
}

function startTelemetryLoop() {
  if (telemetryInterval) {
    return;
  }

  telemetryInterval = setInterval(() => {
    void seedTestTelemetry();
  }, 15_000); // TEST VALUE: refresh interval for random telemetry
}

async function seedTestTelemetry() {
  const now = Date.now();
  const seconds = Math.floor(now / 1000);

  const humidityPercent = randomInRange(40, 75); // TEST VALUE: dev humidity window
  const tempC = randomInRange(20, 27); // TEST VALUE: dev temperature window
  const moistureRatio = randomInRange(0.05, 0.12); // TEST VALUE: force critical moisture

  const minutesSinceWater = randomInRange(240, 720); // TEST VALUE: simulate long drought
  const lastWateredSeconds = seconds - Math.floor(minutesSinceWater * 60);

  const roundedMoisture = Number(moistureRatio.toFixed(2));
  const roundedHumidity = Number((humidityPercent / 100).toFixed(2));
  const roundedTemp = Number(tempC.toFixed(1));

  applyPodTelemetry({
    podId: TEST_FIXTURE_POD_ID,
    at: seconds,
    global_info: {
      avgTempC: roundedTemp,
      avgHumidity: roundedHumidity,
    },
    plant_info: {
      [TEST_FIXTURE_PLANT_ID]: {
        moisture: roundedMoisture,
        lastWateredAt: lastWateredSeconds,
      },
    },
  });

  await triggerCriticalAlert({
    moisture: roundedMoisture,
    measurementTimestampMs: now,
  });
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

async function triggerCriticalAlert({
  moisture,
  measurementTimestampMs,
}: {
  moisture: number;
  measurementTimestampMs: number;
}) {
  try {
    await prisma.wateringAlert.updateMany({
      where: {
        plantId: TEST_FIXTURE_PLANT_ID,
        status: WateringAlertStatus.PENDING,
      },
      data: {
        status: WateringAlertStatus.MISSED,
      },
    });

    await handlePlantTelemetry({
      plantId: TEST_FIXTURE_PLANT_ID,
      moisture,
      sensorTimestamp: new Date(measurementTimestampMs),
      lastWateredAt: null,
    });
  } catch (error) {
    console.error("Failed to trigger test watering alert", error);
  }
}
