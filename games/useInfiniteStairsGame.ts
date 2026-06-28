"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type InfiniteStairsDirection = "left" | "right";

const STEP_COUNT = 6;
const FAILURE_FEEDBACK_DELAY_MS = 420;
const DIRECTIONS = ["left", "right"] as const;
const KEY_TO_DIRECTION = {
  ArrowLeft: "left",
  ArrowRight: "right",
} satisfies Record<string, InfiniteStairsDirection>;

function createStairSequence() {
  return Array.from(
    { length: STEP_COUNT },
    () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
  );
}

function isStairKey(key: string): key is keyof typeof KEY_TO_DIRECTION {
  return key in KEY_TO_DIRECTION;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function playStepSound() {
  bgmLibrary.playSoundEffect("infiniteStairsStep").catch((error: unknown) => {
    console.error(error);
  });
}

export function useInfiniteStairsGame(): Readonly<{
  failed: boolean;
  progress: number;
  sequence: readonly InfiniteStairsDirection[];
  stepKey: number;
}> {
  const hasResolvedRef = useRef(false);
  const failureTimerRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sequence] = useState<readonly InfiniteStairsDirection[]>(
    createStairSequence,
  );
  const [stepKey, setStepKey] = useState(0);

  const handleDirection = useCallback(
    (direction: InfiniteStairsDirection) => {
      if (hasResolvedRef.current) {
        return;
      }

      const expectedDirection = sequence[progress];

      if (direction !== expectedDirection) {
        hasResolvedRef.current = true;
        setFailed(true);
        failureTimerRef.current = window.setTimeout(() => {
          failureTimerRef.current = null;
          dispatchFailure();
        }, FAILURE_FEEDBACK_DELAY_MS);
        return;
      }

      playStepSound();
      setStepKey((currentStepKey) => currentStepKey + 1);

      const nextProgress = progress + 1;

      setProgress(nextProgress);

      if (nextProgress >= sequence.length) {
        hasResolvedRef.current = true;
        dispatchClear();
      }
    },
    [progress, sequence],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isStairKey(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.repeat) {
        return;
      }

      handleDirection(KEY_TO_DIRECTION[event.key]);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [handleDirection]);

  useEffect(
    () => () => {
      if (failureTimerRef.current === null) {
        return;
      }

      window.clearTimeout(failureTimerRef.current);
    },
    [],
  );

  return {
    failed,
    progress,
    sequence,
    stepKey,
  };
}
