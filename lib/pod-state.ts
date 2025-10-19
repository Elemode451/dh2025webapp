import { EventEmitter } from "node:events";

export type PlantSensorSnapshot = {
  moisture?: number | null;
  lastWateredAt?: number | null;
};

export type PodSnapshot = {
  podId: string;
  at: number | null;
  plant_info: Record<string, PlantSensorSnapshot>;
  global_info: {
    avgTempC?: number | null;
    avgHumidity?: number | null;
  };
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const pods = new Map<string, PodSnapshot>();

function createEmptySnapshot(podId: string): PodSnapshot {
  const snapshot: PodSnapshot = {
    podId,
    at: null,
    plant_info: {},
    global_info: {},
  };

  pods.set(podId, snapshot);
  emitter.emit(podId, snapshot);

  return snapshot;
}

export function syncPodSnapshot(podId: string, plantIds: string[]): PodSnapshot {
  const snapshot = pods.get(podId) ?? createEmptySnapshot(podId);
  const allowedIds = new Set(plantIds);
  let removed = false;

  for (const plantId of Object.keys(snapshot.plant_info)) {
    if (!allowedIds.has(plantId)) {
      delete snapshot.plant_info[plantId];
      removed = true;
    }
  }

  if (removed) {
    pods.set(podId, snapshot);
    emitter.emit(podId, snapshot);
  }

  return snapshot;
}

export function applyPodTelemetry(update: PodSnapshot) {
  const next: PodSnapshot = {
    podId: update.podId,
    at: update.at ?? null,
    plant_info: {},
    global_info: {},
  };

  for (const [plantId, reading] of Object.entries(update.plant_info ?? {})) {
    if (reading && ("moisture" in reading || "lastWateredAt" in reading)) {
      next.plant_info[plantId] = {
        moisture: typeof reading.moisture === "number" ? reading.moisture : null,
        lastWateredAt: typeof reading.lastWateredAt === "number" ? reading.lastWateredAt : null,
      };
    }
  }

  if (update.global_info) {
    if (typeof update.global_info.avgTempC === "number") {
      next.global_info.avgTempC = update.global_info.avgTempC;
    }
    if (typeof update.global_info.avgHumidity === "number") {
      next.global_info.avgHumidity = update.global_info.avgHumidity;
    }
  }

  pods.set(update.podId, next);
  emitter.emit(update.podId, next);
}

export function subscribeToPod(podId: string, callback: (snapshot: PodSnapshot) => void) {
  emitter.on(podId, callback);

  return () => {
    emitter.off(podId, callback);
  };
}

export function getPodSnapshot(podId: string) {
  return pods.get(podId);
}
