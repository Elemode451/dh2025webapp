"use client";

import { useState } from "react";

import { PlantModal } from "./plant-modal";

type Plant = {
  id: string;
  plantName: string;
  emoji: string;
  species: {
    scientificName: string;
    name: string;
  };
};

type PlantGalleryProps = {
  plants: Plant[];
};

export function PlantGallery({ plants }: PlantGalleryProps) {
  const [activePlant, setActivePlant] = useState<Plant | null>(null);

  return (
    <>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {plants.map((plant) => (
          <button
            key={plant.id}
            type="button"
            onClick={() => setActivePlant(plant)}
            className="group flex h-full flex-col items-center gap-4 rounded-[var(--card-radius)] bg-[var(--panel)] p-5 text-center shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
          >
            <div className="relative flex h-[120px] w-[120px] items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-[var(--moisture)] opacity-80 transition-transform duration-200 group-hover:scale-[1.03]"></span>
              <span className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[var(--bg)] text-5xl">
                {plant.emoji}
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[var(--ink)]">{plant.plantName}</h2>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{plant.species.name}</p>
              <p className="text-xs text-[var(--muted)]">{plant.species.scientificName}</p>
            </div>
            <span className="text-xs font-medium text-[var(--accent)]/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Tap to chat 🌟
            </span>
          </button>
        ))}

        <button
          type="button"
          className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-[var(--panel)] p-5 text-center text-[var(--muted)] shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
        >
          <span className="text-3xl">➕</span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Add plant</p>
            <p className="text-xs text-[var(--muted)]">(name &amp; species)</p>
          </div>
        </button>
      </div>

      {activePlant ? <PlantModal plant={activePlant} onClose={() => setActivePlant(null)} /> : null}
    </>
  );
}
