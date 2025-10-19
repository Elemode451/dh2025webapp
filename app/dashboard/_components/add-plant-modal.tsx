"use client";

import { FormEvent, useState } from "react";

import type { Plant } from "./plant-gallery";

type AddPlantModalProps = {
  onClose: () => void;
  onPlantCreated: (plant: Plant) => void;
};

type ApiResponse = {
  plant?: Plant & { ownerId?: string; speciesName?: string };
  error?: string;
  details?: unknown;
};

export function AddPlantModal({ onClose, onPlantCreated }: AddPlantModalProps) {
  const [nickname, setNickname] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();
    const trimmedScientificName = scientificName.trim();

    if (!trimmedNickname || !trimmedScientificName) {
      setError("Please add both a nickname and a scientific name.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/plants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          scientificName: trimmedScientificName,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "We couldn't save that plant. Try again shortly.");
        return;
      }

      if (!data.plant || !data.plant.species) {
        setError("We couldn't save that plant. Try again shortly.");
        return;
      }

      onPlantCreated({
        id: data.plant.id,
        plantName: data.plant.plantName,
        emoji: data.plant.emoji ?? "🪴",
        species: {
          scientificName: data.plant.species.scientificName,
          name: data.plant.species.name,
        },
        podId: data.plant.podId ?? null,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving your plant.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div aria-hidden={true} className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[var(--panel)]/95 text-[var(--ink)] shadow-2xl backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/10 bg-black/5 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Add a plant</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">Tell us about your leafy friend</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/40 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:bg-white"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-[var(--ink)]">
              Plant nickname
            </label>
            <input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="e.g. Sunny"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="scientificName" className="text-sm font-medium text-[var(--ink)]">
              Scientific name
            </label>
            <input
              id="scientificName"
              name="scientificName"
              value={scientificName}
              onChange={(event) => setScientificName(event.target.value)}
              placeholder="e.g. Monstera deliciosa"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isSaving}
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-black/10 bg-white/50 px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors duration-200 hover:bg-white"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save plant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
