export const DEFAULT_PRACTICE_SPEED_MULTIPLIER = 1;
export const MAX_PRACTICE_SPEED_MULTIPLIER = 2;
export const MIN_PRACTICE_SPEED_MULTIPLIER = 1;
export const PRACTICE_SPEED_STORAGE_KEY = "microgames.practiceSpeedMultiplier";
export const PRACTICE_SPEED_STEP = 0.1;

export function normalizePracticeSpeedMultiplier(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PRACTICE_SPEED_MULTIPLIER;
  }

  const clampedValue = Math.min(
    Math.max(value, MIN_PRACTICE_SPEED_MULTIPLIER),
    MAX_PRACTICE_SPEED_MULTIPLIER,
  );

  return Math.round(clampedValue * 10) / 10;
}

export function parsePracticeSpeedMultiplier(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_PRACTICE_SPEED_MULTIPLIER;
  }

  return normalizePracticeSpeedMultiplier(Number.parseFloat(value));
}

export function formatPracticeSpeedMultiplier(value: number) {
  return normalizePracticeSpeedMultiplier(value).toFixed(1);
}
