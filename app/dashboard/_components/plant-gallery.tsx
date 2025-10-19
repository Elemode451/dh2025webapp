"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";

import type { PodSnapshot } from "@/lib/pod-state";

import { AddPlantModal } from "./add-plant-modal";
import { PlantModal } from "./plant-modal";

export type Plant = {
  id: string;
  plantName: string;
  emoji?: string | null;
  species: {
    scientificName: string;
    name: string;
  };
  podId: string | null;
};

type PlantGalleryProps = {
  plants: Plant[];
};

type PodGroup = {
  id: string;
  plants: Plant[];
};

type PodSnapshots = Record<string, PodSnapshot>;

function getMoistureRingStyle(level?: number): CSSProperties {
  if (typeof level !== "number" || Number.isNaN(level)) {
    return {
      background: "conic-gradient(rgba(69, 184, 255, 0.2) 0deg, rgba(69, 184, 255, 0.2) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 5px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 5px))",
    } satisfies CSSProperties;
  }

  const clamped = Math.min(Math.max(level, 0), 1);
  const filled = Math.round(clamped * 360);

  return {
    background: `conic-gradient(var(--moisture) ${filled}deg, rgba(69, 184, 255, 0.15) ${filled}deg 360deg)`,
    mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 5px))",
    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 5px))",
  } satisfies CSSProperties;
}

function formatLastWatered(timestamp?: number) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp * 1000);
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toLocaleTimeString();
  }
}

function usePodSnapshots(podIds: string[]): PodSnapshots {
  const [snapshots, setSnapshots] = useState<PodSnapshots>({});

  const podIdsKey = useMemo(() => {
    if (podIds.length === 0) {
      return "";
    }

    const unique = Array.from(new Set(podIds)).sort();
    return JSON.stringify(unique);
  }, [podIds]);

  const stablePodIds = useMemo(() => {
    if (!podIdsKey) {
      return [] as string[];
    }

    try {
      return JSON.parse(podIdsKey) as string[];
    } catch {
      return [] as string[];
    }
  }, [podIdsKey]);

  useEffect(() => {
    if (stablePodIds.length === 0) {
      setSnapshots({});
      return;
    }

    setSnapshots((current) => {
      const next: PodSnapshots = {};
      for (const id of stablePodIds) {
        if (current[id]) {
          next[id] = current[id];
        }
      }
      return next;
    });

    let isActive = true;
    const sources: EventSource[] = [];

    for (const podId of stablePodIds) {
      fetch(`/api/state?podId=${encodeURIComponent(podId)}`, {
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load state for pod ${podId}`);
          }
          return response.json();
        })
        .then((data: PodSnapshot) => {
          if (!isActive) {
            return;
          }
          setSnapshots((current) => ({ ...current, [podId]: data }));
        })
        .catch((error) => {
          console.error(error);
        });

      const source = new EventSource(`/api/stream?podId=${encodeURIComponent(podId)}`, {
        withCredentials: true,
      });

      source.onmessage = (event) => {
        if (!isActive) {
          return;
        }

        try {
          const payload = JSON.parse(event.data) as PodSnapshot;
          setSnapshots((current) => ({ ...current, [podId]: payload }));
        } catch (error) {
          console.error("Failed to parse pod snapshot", error);
        }
      };

      source.onerror = (event) => {
        console.error("Pod stream error", event);
      };

      sources.push(source);
    }

    return () => {
      isActive = false;
      for (const source of sources) {
        source.close();
      }
    };
  }, [stablePodIds]);

  return snapshots;
}

export function PlantGallery({ plants }: PlantGalleryProps) {
  const [activePlant, setActivePlant] = useState<Plant | null>(null);
  const [items, setItems] = useState<Plant[]>(plants);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    setItems(plants);
  }, [plants]);

  const { pods, ungrouped } = useMemo(() => {
    const grouped = new Map<string, Plant[]>();
    const singles: Plant[] = [];

    for (const plant of items) {
      if (plant.podId) {
        const existing = grouped.get(plant.podId) ?? [];
        grouped.set(plant.podId, [...existing, plant]);
      } else {
        singles.push(plant);
      }
    }

    const podGroups: PodGroup[] = Array.from(grouped.entries()).map(([id, podPlants]) => ({
      id,
      plants: [...podPlants].sort((a, b) => a.plantName.localeCompare(b.plantName)),
    }));

    podGroups.sort((a, b) => a.id.localeCompare(b.id));
    singles.sort((a, b) => a.plantName.localeCompare(b.plantName));

    return { pods: podGroups, ungrouped: singles };
  }, [items]);

  const podIds = useMemo(() => pods.map((pod) => pod.id), [pods]);
  const snapshots = usePodSnapshots(podIds);

  function handlePlantCreated(plant: Plant) {
    setItems((current) => [...current, plant]);
  }

  function renderPlantCard(plant: Plant, moisture?: number, lastWateredAt?: number) {
    const moisturePercent = typeof moisture === "number" ? Math.round(Math.min(Math.max(moisture, 0), 1) * 100) : null;
    const lastWateredLabel = formatLastWatered(lastWateredAt);

    return (
      <button
        key={plant.id}
        type="button"
        onClick={() => setActivePlant(plant)}
        className="group flex h-full flex-col items-center gap-4 rounded-[var(--card-radius)] bg-[var(--panel)] p-5 text-center shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
      >
        <div className="relative flex h-[120px] w-[120px] items-center justify-center">
          <span className="absolute inset-0 rounded-full opacity-90 transition-transform duration-200 group-hover:scale-[1.03]" style={getMoistureRingStyle(moisture)} />
          <span className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[var(--bg)] text-5xl">
            {plant.emoji ?? "🪴"}
          </span>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[var(--ink)]">{plant.plantName}</h3>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{plant.species.name}</p>
          <p className="text-xs text-[var(--muted)]">{plant.species.scientificName}</p>
        </div>
        <div className="space-y-0.5 text-xs text-[var(--muted)]">
          {moisturePercent !== null ? (
            <p className="font-medium text-[var(--ink)]">{moisturePercent}% moisture</p>
          ) : (
            <p>Moisture data unavailable</p>
          )}
          {lastWateredLabel ? <p>Last watered {lastWateredLabel}</p> : null}
        </div>
        <span className="text-xs font-medium text-[var(--accent)]/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Tap to chat 🌟
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {pods.map((pod, index) => {
          const snapshot = snapshots[pod.id];
          const humidity = snapshot ? Math.round(snapshot.global_info.avgHumidity * 100) : null;
          const temperature = snapshot ? snapshot.global_info.avgTempC.toFixed(1) : null;
          const updatedAt = snapshot
            ? (() => {
                const date = new Date(snapshot.at * 1000);
                try {
                  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                } catch {
                  return date.toLocaleTimeString();
                }
              })()
            : null;

          return (
            <section
              key={pod.id}
              className="rounded-[var(--card-radius)] border border-[var(--border)] bg-white/80 p-6 shadow-[var(--shadow-card)]"
            >
              <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">Pod {index + 1}</h2>
                  <p className="text-xs font-mono text-[var(--muted)]">{pod.id}</p>
                  <p className="text-xs text-[var(--muted)]">{updatedAt ? `Updated ${updatedAt}` : "Waiting for data..."}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--ink)]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[var(--ink)] shadow-sm ring-1 ring-[var(--border)]">
                    🌡️ {temperature ?? "--"}°C
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[var(--ink)] shadow-sm ring-1 ring-[var(--border)]">
                    💧 {humidity !== null ? `${humidity}% RH` : "--"}
                  </span>
                </div>
              </header>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pod.plants.map((plant) => {
                  const plantSnapshot = snapshot?.plant_info[plant.id];
                  return renderPlantCard(plant, plantSnapshot?.moisture, plantSnapshot?.lastWateredAt);
                })}
              </div>
            </section>
          );
        })}

        <div className="space-y-3">
          {ungrouped.length > 0 ? (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ungrouped plants</h2>
          ) : null}
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {ungrouped.map((plant) => renderPlantCard(plant))}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-[var(--panel)] p-5 text-center text-[var(--muted)] shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
            >
              <span className="text-3xl">➕</span>
              <div className="space-y-1">
                <p className="text-sm font-medium">Add plant</p>
                <p className="text-xs text-[var(--muted)]">(name &amp; species)</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activePlant ? <PlantModal plant={activePlant} onClose={() => setActivePlant(null)} /> : null}
      {isAddModalOpen ? (
        <AddPlantModal
          onClose={() => setIsAddModalOpen(false)}
          onPlantCreated={handlePlantCreated}
        />
      ) : null}
    </>
  );
}
