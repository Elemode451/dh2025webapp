import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

import { TopBar } from './_components/top-bar';
import { PlantGallery, type Plant } from './_components/plant-gallery';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user!;
  const username = user.name ?? 'friend';

  const plantsFromDb = await prisma.plants.findMany({
    where: { ownerId: session.user.phoneNumber },
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <TopBar username={username} />

      <main className="bg-[var(--bg)] px-6 py-8">
        <section className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Your plants</h1>
              <p className="text-sm text-[var(--muted)]">
                A quick peek at every leaf in your care...
              </p>
            </div>
          </header>

          <PlantGallery plants={plants} userId={user.phoneNumber} />
        </section>
      </main>
    </div>
  );
}
