import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { Sidebar } from './_components/sidebar';
import { TopBar } from './_components/top-bar';
import { PlantGallery } from './_components/plant-gallery';

const samplePlants = [
  {
    id: '1',
    plantName: 'Mossy',
    species: {
      scientificName: 'Monstera deliciosa',
      name: 'Swiss Cheese Plant',
    },
    emoji: '🪴',
  },
  {
    id: '2',
    plantName: 'Sunny',
    species: {
      scientificName: 'Epipremnum aureum',
      name: "Devil's Ivy",
    },
    emoji: '🌿',
  },
  {
    id: '3',
    plantName: 'Fernanda',
    species: {
      scientificName: 'Nephrolepis exaltata',
      name: 'Boston Fern',
    },
    emoji: '🌱',
  },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const username = session.user.name ?? 'friend';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <TopBar username={username} />

      <div className="grid min-h-[calc(100vh-56px)] grid-cols-[240px_1fr]">
        <Sidebar activeId="dashboard" />

        <main className="bg-[var(--bg)] px-6 py-8">
          <section className="mx-auto max-w-5xl">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Your plants</h1>
                <p className="text-sm text-[var(--muted)]">
                  A quick peek at every leaf in your care. Tap a tile to dive in when the modal arrives.
                </p>
              </div>
            </header>

            <PlantGallery plants={samplePlants} />
          </section>
        </main>
      </div>
    </div>
  );
}
