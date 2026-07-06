"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const TARGET_SHRIMP_COUNT = 2;
const EAT_ANIMATION_MS = 520;
const EAT_SETTLE_MS = 140;
export const SUDDEN_DEATH_ANIMATION_MS = 1100;

export type MolaMolaDirection = "left" | "right";

export type MolaMolaPosition = Readonly<{
  x: number;
  y: number;
}>;

export type MolaMolaMotion = MolaMolaPosition &
  Readonly<{
    direction: MolaMolaDirection;
    motionKey: number;
  }>;

const INITIAL_MOLA_MOLA_MOTION = {
  direction: "left",
  motionKey: 0,
  x: 50,
  y: 55,
} as const satisfies MolaMolaMotion;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

export function useSurviveMolaMolaGame({
  beatCount,
  beatDurationMs,
  isActive,
}: Readonly<{
  beatCount: number;
  beatDurationMs: number;
  isActive: boolean;
}>) {
  const [activeShrimpId, setActiveShrimpId] = useState<number | null>(null);
  const [eatenShrimpIds, setEatenShrimpIds] = useState<readonly number[]>([]);
  const [hasFailed, setHasFailed] = useState(false);
  const [isEating, setIsEating] = useState(false);
  const clearTimeoutsRef = useRef<Set<number>>(new Set());
  const molaMotionRef = useRef<MolaMolaMotion>(INITIAL_MOLA_MOLA_MOTION);
  const hasResolvedRef = useRef(false);
  const [molaMotion, setMolaMotion] = useState<MolaMolaMotion>(
    INITIAL_MOLA_MOLA_MOTION,
  );

  const clearRegisteredTimeouts = useCallback(() => {
    clearTimeoutsRef.current.forEach((timeout) => {
      window.clearTimeout(timeout);
    });
    clearTimeoutsRef.current.clear();
  }, []);

  const registerTimeout = useCallback(
    (callback: () => void, delayMs: number) => {
      const timeout = window.setTimeout(() => {
        clearTimeoutsRef.current.delete(timeout);
        callback();
      }, delayMs);

      clearTimeoutsRef.current.add(timeout);
    },
    [],
  );

  const moveMolaMola = useCallback((position: MolaMolaPosition) => {
    const currentMotion = molaMotionRef.current;
    const nextDirection = position.x >= currentMotion.x ? "right" : "left";
    const nextMotion = {
      direction: nextDirection,
      motionKey: currentMotion.motionKey + 1,
      x: position.x,
      y: position.y,
    } satisfies MolaMolaMotion;

    molaMotionRef.current = nextMotion;
    setMolaMotion(nextMotion);
  }, []);

  const handleShrimpPointerDown = useCallback(
    (shrimpId: number, position: MolaMolaPosition) => {
      if (
        hasResolvedRef.current ||
        activeShrimpId !== null ||
        eatenShrimpIds.includes(shrimpId)
      ) {
        return;
      }

      bgmLibrary.playSoundEffect("molaMolaEat").catch((error: unknown) => {
        console.error(error);
      });
      setActiveShrimpId(shrimpId);
      setIsEating(true);
      moveMolaMola(position);
      registerTimeout(() => {
        setEatenShrimpIds((currentEatenShrimpIds) => {
          if (
            hasResolvedRef.current ||
            currentEatenShrimpIds.includes(shrimpId)
          ) {
            return currentEatenShrimpIds;
          }

          const nextEatenShrimpIds = [...currentEatenShrimpIds, shrimpId];

          if (nextEatenShrimpIds.length >= TARGET_SHRIMP_COUNT) {
            hasResolvedRef.current = true;
            registerTimeout(dispatchClear, EAT_SETTLE_MS);
          }

          return nextEatenShrimpIds;
        });
        setActiveShrimpId(null);
      }, EAT_ANIMATION_MS);
      registerTimeout(() => {
        setIsEating(false);
      }, EAT_ANIMATION_MS + EAT_SETTLE_MS);
    },
    [activeShrimpId, eatenShrimpIds, moveMolaMola, registerTimeout],
  );

  const startSuddenDeath = useCallback(
    (shouldDispatchFailure: boolean) => {
      if (hasResolvedRef.current) {
        return;
      }

      hasResolvedRef.current = true;
      setActiveShrimpId(null);
      setHasFailed(true);
      setIsEating(false);
      bgmLibrary
        .play("molaMolaSuddenDeath", "once", "now")
        .catch((error: unknown) => {
          console.error(error);
        });
      bgmLibrary.playSoundEffect("molaMolaDeath").catch((error: unknown) => {
        console.error(error);
      });

      if (shouldDispatchFailure) {
        registerTimeout(dispatchFailure, SUDDEN_DEATH_ANIMATION_MS);
      }
    },
    [registerTimeout],
  );

  const handleMolaMolaPointerDown = useCallback(() => {
    if (hasResolvedRef.current) {
      return;
    }

    startSuddenDeath(true);
  }, [startSuddenDeath]);

  useEffect(() => {
    if (!isActive) {
      clearRegisteredTimeouts();
      return;
    }

    clearRegisteredTimeouts();
    hasResolvedRef.current = false;
    molaMotionRef.current = INITIAL_MOLA_MOLA_MOTION;
    setActiveShrimpId(null);
    setEatenShrimpIds([]);
    setHasFailed(false);
    setIsEating(false);
    setMolaMotion(INITIAL_MOLA_MOLA_MOTION);

    const timeoutDelayMs = beatCount * beatDurationMs;

    registerTimeout(() => {
      startSuddenDeath(false);
    }, timeoutDelayMs);
  }, [
    beatCount,
    beatDurationMs,
    clearRegisteredTimeouts,
    isActive,
    registerTimeout,
    startSuddenDeath,
  ]);

  useEffect(() => {
    return clearRegisteredTimeouts;
  }, [clearRegisteredTimeouts]);

  return {
    activeShrimpId,
    eatenShrimpIds,
    handleMolaMolaPointerDown,
    handleShrimpPointerDown,
    hasFailed,
    isEating,
    molaMotion,
    targetShrimpCount: TARGET_SHRIMP_COUNT,
  };
}
