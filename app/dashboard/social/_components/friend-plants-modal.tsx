"use client";

import type { Plant } from '../../_components/plant-gallery';
import type { FriendSummary } from '../page';

type FriendPlantsModalProps = {
  friend: FriendSummary;
  plants: Plant[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onPlantClick: (plant: Plant) => void;
};

export function FriendPlantsModal({
  friend,
  plants,
  isLoading,
  error,
  onClose,
  onPlantClick,
}: FriendPlantsModalProps) {
  const displayName = friend.name ?? 'Unnamed friend';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6">
      <div aria-hidden className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-3xl flex-col gap-6 rounded-[28px] border border-white/10 bg-[var(--panel)]/95 p-6 text-[var(--ink)] shadow-2xl backdrop-blur">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{displayName}&rsquo;s plants</h2>
            <p className="text-sm text-[var(--muted)]">Tap a plant to start a chat.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/60 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:bg-white"
          >
            ✕
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-white/60 p-10 text-sm text-[var(--muted)]">
            Loading plants...
          </div>
        ) : error ? (
          <div className="rounded-[var(--card-radius)] border border-red-200 bg-red-50/80 p-6 text-sm text-red-600">{error}</div>
        ) : plants.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {plants.map((plant) => (
              <button
                key={plant.id}
                type="button"
                onClick={() => onPlantClick(plant)}
                className="flex h-full flex-col items-start gap-3 rounded-[var(--card-radius)] border border-[var(--border)] bg-white/85 p-5 text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-2xl">
                  {plant.emoji ?? '🪴'}
                </span>
                <div>
                  <p className="text-base font-semibold text-[var(--ink)]">{plant.plantName}</p>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{plant.species.name}</p>
                  <p className="text-xs text-[var(--muted)]">{plant.species.scientificName}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-[var(--accent)]">Chat →</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-white/60 p-10 text-center text-sm text-[var(--muted)]">
            This friend hasn&rsquo;t added any plants yet.
          </div>
        )}
      </div>
    </div>
  );
}
