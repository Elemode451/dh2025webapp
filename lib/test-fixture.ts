import { prisma } from "@/lib/prisma";
import { applyPodTelemetry } from "@/lib/pod-state";

// TEST FIXTURE: remove this file once real telemetry/dev seeding is in place.
const TEST_FIXTURE_USER_PHONE = "+15555550123";
const TEST_FIXTURE_USER_NAME = "Test Gardener";
const TEST_FIXTURE_PASSWORD_HASH = "$2b$10$UXb0dqCzbWAatRF2Mfcf9OCwTMCQM/w0dLtHs3cnkbIOPUqpyjwvG"; // bcrypt for PlantBuddy!1

const TEST_FIXTURE_SPECIES_ID = "fixture.species.remove.me";
const TEST_FIXTURE_SPECIES_NAME = "Demo Daisy (REMOVE)";
const TEST_FIXTURE_SPECIES_IDEAL_MOISTURE = "45-60%";

const TEST_FIXTURE_POD_ID = "pod-demo-fixture";
const TEST_FIXTURE_PLANT_ID = "11111111-2222-3333-4444-555555555555";
const TEST_FIXTURE_PLANT_NAME = "Fixture Fern (REMOVE)";

let pendingProvision: Promise<void> | null = null;

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

  const now = Date.now();
  const lastWateredMs = now - 45 * 60 * 1000; // 45 minutes ago

  applyPodTelemetry({
    podId: TEST_FIXTURE_POD_ID,
    at: Math.floor(now / 1000),
    global_info: {
      avgTempC: 22.6,
      avgHumidity: 0.58,
    },
    plant_info: {
      [TEST_FIXTURE_PLANT_ID]: {
        moisture: 0.46,
        lastWateredAt: Math.floor(lastWateredMs / 1000),
      },
    },
  });
}
