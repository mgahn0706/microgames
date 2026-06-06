"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

type RuneDirection = "down" | "left" | "right" | "up";

type RunePattern = readonly RuneDirection[];

const RUNE_PATTERN_LENGTH = 4;
const RUNE_DIRECTIONS = ["down", "left", "right", "up"] as const;
const KEY_TO_DIRECTION = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
} satisfies Record<string, RuneDirection>;

function isRuneArrowKey(value: string): value is keyof typeof KEY_TO_DIRECTION {
  return value in KEY_TO_DIRECTION;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playRuneEffect() {
  bgmLibrary.playSoundEffect("runeEffect").catch((error: unknown) => {
    console.error(error);
  });
}

function createRunePattern(excludedPattern?: RunePattern) {
  const nextPattern = Array.from(
    { length: RUNE_PATTERN_LENGTH },
    () => RUNE_DIRECTIONS[Math.floor(Math.random() * RUNE_DIRECTIONS.length)],
  );

  if (
    excludedPattern &&
    nextPattern.every(
      (direction, index) => direction === excludedPattern[index],
    )
  ) {
    return createRunePattern(excludedPattern);
  }

  return nextPattern;
}

export function useMaplestoryRuneGame(): Readonly<{
  effectKey: number;
  pattern: RunePattern;
  progress: number;
}> {
  const hasClearedRef = useRef(false);
  const [effectKey, setEffectKey] = useState(0);
  const [pattern, setPattern] = useState<RunePattern>(createRunePattern);
  const [progress, setProgress] = useState(0);

  const resetPattern = useCallback((currentPattern: RunePattern) => {
    setPattern(createRunePattern(currentPattern));
    setProgress(0);
  }, []);

  const handleDirection = useCallback(
    (direction: RuneDirection) => {
      if (hasClearedRef.current) {
        return;
      }

      if (direction !== pattern[progress]) {
        resetPattern(pattern);
        return;
      }

      playRuneEffect();
      setEffectKey((currentKey) => currentKey + 1);

      const nextProgress = progress + 1;

      if (nextProgress >= pattern.length) {
        hasClearedRef.current = true;
        setProgress(nextProgress);
        dispatchClear();
        return;
      }

      setProgress(nextProgress);
    },
    [pattern, progress, resetPattern],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isRuneArrowKey(event.key)) {
        return;
      }

      const direction = KEY_TO_DIRECTION[event.key];

      event.preventDefault();
      event.stopImmediatePropagation();
      handleDirection(direction);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [handleDirection]);

  return {
    effectKey,
    pattern,
    progress,
  };
}

export type { RuneDirection };
