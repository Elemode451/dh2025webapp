import type { PlantSpecies } from "@prisma/client";

export type MoistureRange = {
  min: number | null;
  max: number | null;
};

function normalizeValue(value: number) {
  if (Number.isNaN(value)) {
    return null;
  }

  if (value > 1.01) {
    return value / 100;
  }

  return value;
}

export function parseIdealMoisture(species: PlantSpecies | null | undefined): MoistureRange {
  const source = species?.idealMoisture;

  if (!source) {
    return { min: null, max: null };
  }

  const matches = source.match(/[\d.]+/g);

  if (!matches) {
    return { min: null, max: null };
  }

  const values = matches
    .map((match) => normalizeValue(parseFloat(match)))
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (values.length === 0) {
    return { min: null, max: null };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (values.length === 1) {
    return { min, max: null };
  }

  return { min, max };
}

export function isMoistureDanger(current: number, range: MoistureRange): boolean {
  if (Number.isNaN(current)) {
    return false;
  }

  const reading = Math.max(0, Math.min(current, 1));

  if (range.min !== null) {
    return reading < range.min;
  }

  if (range.max !== null) {
    return reading < range.max * 0.65;
  }

  return reading < 0.35;
}
