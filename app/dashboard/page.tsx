import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import {
  ensureDevTestingPlantFixture,
  isTestFixtureEnabled,
} from '@/lib/test-fixture';

import { TestFixtureToggle } from './_components/test-fixture-toggle';

import { PlantGallery, type Plant } from './_components/plant-gallery';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    redirect('/login');
  }

  const userId = session.user.phoneNumber;

  const fixtureEnabled = isTestFixtureEnabled();

  if (fixtureEnabled) {
    await ensureDevTestingPlantFixture(userId);
  }

  const plantsFromDb = await prisma.plants.findMany({
    where: { ownerId: userId },
    include: { species: true },
    orderBy: { plantName: 'asc' },
  });

  const plants: Plant[] = plantsFromDb.map((plant) => ({
    id: plant.id,
    plantName: plant.plantName,
    emoji: null,
    species: {
      scientificName: plant.species.scientificName,
      name: plant.species.name,
    },
    podId: plant.podId,
  }));

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Your plants</h1>
        <p className="text-sm text-[var(--muted)]">
          A quick peek at every leaf in your care...
        </p>
      </header>

      {process.env.NODE_ENV !== 'production' ? (
        <TestFixtureToggle initialEnabled={fixtureEnabled} />
      ) : null}

      <PlantGallery plants={plants} userId={userId} />
    </section>
  );
}
