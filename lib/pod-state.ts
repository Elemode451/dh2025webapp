import { EventEmitter } from "node:events";

export type PodSnapshot = {
  podId: string;
  at: number;
  plant_info: Record<string, { moisture: number; lastWateredAt: number }>;
  global_info: {
    avgTempC: number;
    avgHumidity: number;
  };
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const pods = new Map<string, PodSnapshot>();
const intervals = new Map<string, ReturnType<typeof setInterval>>();
const listenerCounts = new Map<string, number>();

const TICK_INTERVAL_MS = 20_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createPlantState(): { moisture: number; lastWateredAt: number } {
  const now = Math.floor(Date.now() / 1000);
  return {
    moisture: clamp(randomBetween(0.35, 0.75), 0, 1),
    lastWateredAt: now - Math.floor(randomBetween(3_600, 86_400)),
  };
}

function averageMoisture(plantInfo: PodSnapshot["plant_info"]) {
  const entries = Object.values(plantInfo);
  if (entries.length === 0) {
    return 0.5;
  }

  const total = entries.reduce((sum, item) => sum + item.moisture, 0);
  return total / entries.length;
}

function startPodTicker(podId: string) {
  if (intervals.has(podId)) {
    return;
  }

  const interval = setInterval(() => {
    const snapshot = pods.get(podId);
    if (!snapshot) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const plantEntries = Object.values(snapshot.plant_info);

    if (plantEntries.length === 0) {
      snapshot.at = now;
      emitter.emit(podId, snapshot);
      return;
    }

    for (const plant of plantEntries) {
      let nextMoisture = plant.moisture + randomBetween(-0.035, 0.045);
      if (nextMoisture < 0.12) {
        nextMoisture = clamp(nextMoisture + randomBetween(0.55, 0.7), 0, 1);
        plant.lastWateredAt = now;
      }
      plant.moisture = clamp(nextMoisture, 0, 1);
    }

    const avgMoisture = averageMoisture(snapshot.plant_info);
    const nextHumidity = clamp(0.35 + avgMoisture * 0.5 + randomBetween(-0.05, 0.05), 0.3, 0.95);
    const nextTemp = clamp(snapshot.global_info.avgTempC + randomBetween(-0.3, 0.3), 18, 28);

    snapshot.global_info.avgHumidity = Math.round(nextHumidity * 100) / 100;
    snapshot.global_info.avgTempC = Math.round(nextTemp * 10) / 10;
    snapshot.at = now;

    emitter.emit(podId, snapshot);
  }, TICK_INTERVAL_MS);

  intervals.set(podId, interval);
}

function stopPodTicker(podId: string) {
  const interval = intervals.get(podId);
  if (interval) {
    clearInterval(interval);
    intervals.delete(podId);
  }
}

export function syncPodSnapshot(podId: string, plantIds: string[]): PodSnapshot {
  const now = Math.floor(Date.now() / 1000);
  const existing = pods.get(podId);
  const plantIdSet = new Set(plantIds);

  if (!existing) {
    const plantInfo: PodSnapshot["plant_info"] = {};
    for (const plantId of plantIds) {
      plantInfo[plantId] = createPlantState();
    }

    const snapshot: PodSnapshot = {
      podId,
      at: now,
      plant_info: plantInfo,
      global_info: {
        avgTempC: Math.round(randomBetween(21, 24) * 10) / 10,
        avgHumidity: Math.round(clamp(randomBetween(0.4, 0.65), 0.3, 0.95) * 100) / 100,
      },
    };

    pods.set(podId, snapshot);
    return snapshot;
  }

  for (const key of Object.keys(existing.plant_info)) {
    if (!plantIdSet.has(key)) {
      delete existing.plant_info[key];
    }
  }

  for (const plantId of plantIds) {
    if (!existing.plant_info[plantId]) {
      existing.plant_info[plantId] = createPlantState();
    }
  }

  const avgMoisture = averageMoisture(existing.plant_info);
  existing.global_info.avgHumidity = Math.round(clamp(0.35 + avgMoisture * 0.5, 0.3, 0.95) * 100) / 100;
  existing.at = now;

  pods.set(podId, existing);
  return existing;
}

export function subscribeToPod(podId: string, callback: (snapshot: PodSnapshot) => void) {
  emitter.on(podId, callback);

  const currentCount = listenerCounts.get(podId) ?? 0;
  listenerCounts.set(podId, currentCount + 1);
  startPodTicker(podId);

  return () => {
    emitter.off(podId, callback);
    const nextCount = (listenerCounts.get(podId) ?? 1) - 1;
    if (nextCount <= 0) {
      listenerCounts.delete(podId);
      stopPodTicker(podId);
    } else {
      listenerCounts.set(podId, nextCount);
    }
  };
}

export function getPodSnapshot(podId: string) {
  return pods.get(podId);
}
