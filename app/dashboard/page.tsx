import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { Sidebar } from './_components/sidebar';
import { TopBar } from './_components/top-bar';

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

      <div className="grid min-h-[calc(100vh-56px)] grid-cols-[64px_1fr]">
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

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
              {samplePlants.map((plant) => (
                <article
                  key={plant.id}
                  tabIndex={0}
                  className="group flex cursor-pointer flex-col items-center gap-4 rounded-[var(--card-radius)] bg-[var(--panel)] p-5 text-center shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
                >
                  <div className="relative flex h-[110px] w-[110px] items-center justify-center">
                    <span className="absolute inset-0 rounded-full border-2 border-[var(--moisture)] opacity-80"></span>
                    <span className="relative flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[var(--bg)] text-4xl">
                      {plant.emoji}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">{plant.plantName}</h2>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{plant.species.name}</p>
                    <p className="text-xs text-[var(--muted)]">{plant.species.scientificName}</p>
                  </div>
                </article>
              ))}

              <button
                type="button"
                className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-[var(--panel)] p-5 text-center text-[var(--muted)] shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
              >
                <span className="text-3xl">➕</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Add plant</p>
                  <p className="text-xs text-[var(--muted)]">(name &amp; species)</p>
                </div>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
