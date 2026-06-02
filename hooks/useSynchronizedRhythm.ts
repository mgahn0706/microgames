"use client";

import type { CSSProperties } from "react";

const FAIL_DURATION_MS = 1985.275;
const SUCCESS_DURATION_MS = 2089.775;
const RESULT_BEATS = 4;

export const RHYTHM_DURATION_MS =
  (FAIL_DURATION_MS + SUCCESS_DURATION_MS) / 2 / RESULT_BEATS;
const RHYTHM_STAGGER_MS = 120;

export type SynchronizedRhythmStyle = CSSProperties & {
  "--game-rhythm-delay"?: string;
  "--game-rhythm-duration": string;
};

export function useSynchronizedRhythm() {
  const rhythmStyle = {
    "--game-rhythm-duration": `${RHYTHM_DURATION_MS}ms`,
  } satisfies SynchronizedRhythmStyle;

  const getStaggeredRhythmStyle = (index: number) =>
    ({
      ...rhythmStyle,
      "--game-rhythm-delay": `${index * RHYTHM_STAGGER_MS}ms`,
    }) satisfies SynchronizedRhythmStyle;

  return {
    getStaggeredRhythmStyle,
    rhythmStyle,
  };
}
