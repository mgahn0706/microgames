"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Microgame } from "@/data/microgames";
import { isMicrogameClearKey } from "@/data/microgames";

export const MICROGAME_CLEAR_EVENT = "microgame-clear";

type UseMicrogameInputParams = Readonly<{
  isActive: boolean;
  microgame: Microgame;
  onClear: () => void;
  roundNumber: number;
}>;

export function useMicrogameInput({
  isActive,
  microgame,
  onClear,
  roundNumber,
}: UseMicrogameInputParams) {
  const clearedRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    clearedRoundRef.current = null;
  }, [isActive, roundNumber]);

  const recordClearOnce = useCallback(() => {
    if (clearedRoundRef.current === roundNumber) {
      return;
    }

    clearedRoundRef.current = roundNumber;
    onClear();
  }, [onClear, roundNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const recordKeyboardClear = (event: KeyboardEvent) => {
      if (
        microgame.canvas === "animalFarmReverseTyping" ||
        microgame.canvas === "brainAcademyBlocks" ||
        microgame.canvas === "geometryDashSpikes" ||
        microgame.canvas === "kartriderCourse" ||
        microgame.canvas === "laytonShapeMatch" ||
        microgame.canvas === "maplestoryLieDetector" ||
        microgame.canvas === "maplestoryRune" ||
        microgame.canvas === "pianoMelody" ||
        microgame.canvas === "pokemonTyping" ||
        microgame.canvas === "superMarioCoins" ||
        microgame.canvas === "tetrisLineClear" ||
        microgame.canvas === "undertaleMouse"
      ) {
        return;
      }

      if (!isMicrogameClearKey(microgame.control, event)) {
        return;
      }

      event.preventDefault();
      recordClearOnce();
    };
    const recordPointerClear = () => {
      if (
        microgame.control === "mouseClick" &&
        microgame.canvas !== "animalCrossingStamps" &&
        microgame.canvas !== "amongUsWires" &&
        microgame.canvas !== "minecraftMining" &&
        microgame.canvas !== "undertaleMouse"
      ) {
        recordClearOnce();
      }
    };
    const recordWheelClear = (event: WheelEvent) => {
      if (microgame.control !== "scroll") {
        return;
      }

      event.preventDefault();
      recordClearOnce();
    };
    const recordCustomClear = () => {
      recordClearOnce();
    };

    window.addEventListener("keydown", recordKeyboardClear);
    window.addEventListener("pointerdown", recordPointerClear);
    window.addEventListener("wheel", recordWheelClear, { passive: false });
    window.addEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);

    return () => {
      window.removeEventListener("keydown", recordKeyboardClear);
      window.removeEventListener("pointerdown", recordPointerClear);
      window.removeEventListener("wheel", recordWheelClear);
      window.removeEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);
    };
  }, [isActive, microgame.canvas, microgame.control, recordClearOnce]);
}
