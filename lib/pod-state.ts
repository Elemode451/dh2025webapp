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

export type PodTelemetryUpdate = {
  podId: string;
  at?: number | null;
  plant_info?: Record<string, PlantSensorSnapshot | undefined>;
  global_info?: {
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

export function applyPodTelemetry(update: PodTelemetryUpdate) {
  const previous = pods.get(update.podId) ?? createEmptySnapshot(update.podId);

  const next: PodSnapshot = {
    podId: update.podId,
    at: typeof update.at === "number" ? update.at : previous.at,
    plant_info: { ...previous.plant_info },
    global_info: { ...previous.global_info },
  };

  if (update.plant_info) {
    for (const [plantId, reading] of Object.entries(update.plant_info)) {
      if (!reading) {
        continue;
      }

      const current = next.plant_info[plantId] ?? {};

      if ("moisture" in reading) {
        current.moisture =
          typeof reading.moisture === "number" && !Number.isNaN(reading.moisture)
            ? reading.moisture
            : null;
      }

      if ("lastWateredAt" in reading) {
        current.lastWateredAt =
          typeof reading.lastWateredAt === "number" && !Number.isNaN(reading.lastWateredAt)
            ? reading.lastWateredAt
            : null;
      }

      next.plant_info[plantId] = current;
    }
  }

  if (update.global_info) {
    if ("avgTempC" in update.global_info) {
      const temp = update.global_info.avgTempC;
      next.global_info.avgTempC =
        typeof temp === "number" && !Number.isNaN(temp) ? temp : null;
    }

    if ("avgHumidity" in update.global_info) {
      const humidity = update.global_info.avgHumidity;
      next.global_info.avgHumidity =
        typeof humidity === "number" && !Number.isNaN(humidity) ? humidity : null;
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
