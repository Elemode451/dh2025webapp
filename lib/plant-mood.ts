import { prisma } from "@/lib/prisma";
import { TelemetryType, WateringAlertStatus } from "@prisma/client";

export type PlantMoodDetails = {
  label: string;
  description: string;
  severity: number;
  hoursSinceWatered: number | null;
  hoursSinceWateredLabel: string;
  pendingAlerts: number;
  missedAlerts: number;
};

const MOOD_DESCRIPTORS: { label: string; description: string }[] = [
  { label: "calm", description: "polite and patient about getting a drink" },
  { label: "antsy", description: "impatient and lightly guilt-tripping" },
  { label: "irritated", description: "annoyed and demanding attention" },
  { label: "angry", description: "mad, dramatic, and not shy about it" },
  { label: "furious", description: "full-on rage, comedic but intense" },
];

function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "under an hour";
  }

  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  if (hours < 24) {
    const whole = Math.round(hours);
    return `${whole} hour${whole === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);

  if (days >= 14) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    const parts = [`${weeks} week${weeks === 1 ? "" : "s"}`];

    if (remainingDays > 0) {
      parts.push(`${remainingDays} day${remainingDays === 1 ? "" : "s"}`);
    }

    return parts.join(" and ");
  }

  const remainingHours = Math.floor(hours % 24);
  const parts = [`${days} day${days === 1 ? "" : "s"}`];

  if (remainingHours > 0) {
    parts.push(`${remainingHours} hour${remainingHours === 1 ? "" : "s"}`);
  }

  return parts.join(" and ");
}

export async function resolvePlantMood(plantId: string): Promise<PlantMoodDetails> {
  const [lastWatering, alerts] = await Promise.all([
    prisma.plantTelemetry.findFirst({
      where: { plantId, type: TelemetryType.WATERING },
      orderBy: { sensorTimestamp: "desc" },
    }),
    prisma.wateringAlert.findMany({
      where: {
        plantId,
        status: { in: [WateringAlertStatus.PENDING, WateringAlertStatus.MISSED] },
      },
      orderBy: { triggeredAt: "desc" },
      take: 5,
    }),
  ]);

  const lastWateredAt = lastWatering?.sensorTimestamp ?? null;
  const hoursSinceWatered =
    lastWateredAt !== null ? (Date.now() - lastWateredAt.getTime()) / (1000 * 60 * 60) : null;

  const pendingAlerts = alerts.filter((alert) => alert.status === WateringAlertStatus.PENDING).length;
  const missedAlerts = alerts.filter((alert) => alert.status === WateringAlertStatus.MISSED).length;

  let severity = 0;

  if (hoursSinceWatered === null) {
    severity = 3;
  } else if (hoursSinceWatered >= 120) {
    severity = 4;
  } else if (hoursSinceWatered >= 72) {
    severity = 3;
  } else if (hoursSinceWatered >= 48) {
    severity = 2;
  } else if (hoursSinceWatered >= 24) {
    severity = 1;
  }

  if (missedAlerts > 0) {
    severity = Math.min(4, severity + 1);
  } else if (pendingAlerts > 1) {
    severity = Math.min(4, severity + 1);
  }

  const descriptor = MOOD_DESCRIPTORS[Math.min(MOOD_DESCRIPTORS.length - 1, severity)];
  const durationLabel =
    hoursSinceWatered === null ? "an unknown amount of time" : formatDuration(Math.max(hoursSinceWatered, 0));

  return {
    ...descriptor,
    severity,
    hoursSinceWatered,
    hoursSinceWateredLabel: durationLabel,
    pendingAlerts,
    missedAlerts,
  };
}

export function describeMood(mood: PlantMoodDetails) {
  return `${mood.label} — ${mood.description}`;
}

export function summarizeMoodContext(mood: PlantMoodDetails): string {
  const duration = mood.hoursSinceWateredLabel;
  const alerts = `Pending alerts: ${mood.pendingAlerts}. Missed alerts: ${mood.missedAlerts}.`;
  const wateredLine = mood.hoursSinceWatered === null
    ? "There's no recorded watering yet."
    : `Last watered about ${duration} ago.`;

  return `${wateredLine} ${alerts}`;
}

export const ALERT_SEVERITY_GUIDANCE: Record<number, string> = {
  0: "gentle and polite — grateful but still friendly",
  1: "slightly annoyed — firmer wording and a bit of guilt",
  2: "frustrated — clearly upset and demanding attention",
  3: "angry — sharp, dramatic, and guilt-tripping",
  4: "furious — comedic rage, shouting in all caps is acceptable in bursts",
};
