"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Microgame } from "@/data/microgames";
import { isMicrogameClearKey } from "@/data/microgames";

export const MICROGAME_CLEAR_EVENT = "microgame-clear";
export const MICROGAME_FAILURE_EVENT = "microgame-failure";

type UseMicrogameInputParams = Readonly<{
  isActive: boolean;
  microgame: Microgame;
  onClear: () => void;
  onFailure: () => void;
  roundNumber: number;
}>;

export function useMicrogameInput({
  isActive,
  microgame,
  onClear,
  onFailure,
  roundNumber,
}: UseMicrogameInputParams) {
  const resolvedRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    resolvedRoundRef.current = null;
  }, [isActive, roundNumber]);

  const recordClearOnce = useCallback(() => {
    if (resolvedRoundRef.current === roundNumber) {
      return;
    }

    resolvedRoundRef.current = roundNumber;
    onClear();
  }, [onClear, roundNumber]);

  const recordFailureOnce = useCallback(() => {
    if (resolvedRoundRef.current === roundNumber) {
      return;
    }

    resolvedRoundRef.current = roundNumber;
    onFailure();
  }, [onFailure, roundNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const recordKeyboardClear = (event: KeyboardEvent) => {
      if (
        microgame.canvas === "animalFarmReverseTyping" ||
        microgame.canvas === "brainAcademyBlocks" ||
        microgame.canvas === "cookieRun" ||
        microgame.canvas === "crazyArcade" ||
        microgame.canvas === "flappyBird" ||
        microgame.canvas === "geometryDashSpikes" ||
        microgame.canvas === "hancomTyping" ||
        microgame.canvas === "kartriderCourse" ||
        microgame.canvas === "laytonShapeMatch" ||
        microgame.canvas === "leagueChampionBan" ||
        microgame.canvas === "maplestoryLieDetector" ||
        microgame.canvas === "maplestoryRune" ||
        microgame.canvas === "minigameExBearMeat" ||
        microgame.canvas === "pianoMelody" ||
        microgame.canvas === "pongSurvival" ||
        microgame.canvas === "pokemonTyping" ||
        microgame.canvas === "superMarioCoins" ||
        microgame.canvas === "tetrisLineClear" ||
        microgame.canvas === "twoThousandFortyEightBoss" ||
        microgame.canvas === "undertaleMouse" ||
        microgame.canvas === "modooMarble" ||
        microgame.canvas === "wiiSportsDualPress" ||
        microgame.canvas === "zeldaOcarinaOfTime"
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
        microgame.canvas !== "gomokuWhiteStone" &&
        microgame.canvas !== "halliGalliBoss" &&
        microgame.canvas !== "leagueChampionBan" &&
        microgame.canvas !== "minecraftMining" &&
        microgame.canvas !== "submitAssignment" &&
        microgame.canvas !== "undertaleMouse"
      ) {
        recordClearOnce();
      }
    };
    const recordCustomClear = () => {
      recordClearOnce();
    };
    const recordCustomFailure = () => {
      recordFailureOnce();
    };

    window.addEventListener("keydown", recordKeyboardClear);
    window.addEventListener("pointerdown", recordPointerClear);
    window.addEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);
    window.addEventListener(MICROGAME_FAILURE_EVENT, recordCustomFailure);

    return () => {
      window.removeEventListener("keydown", recordKeyboardClear);
      window.removeEventListener("pointerdown", recordPointerClear);
      window.removeEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);
      window.removeEventListener(MICROGAME_FAILURE_EVENT, recordCustomFailure);
    };
  }, [
    isActive,
    microgame.canvas,
    microgame.control,
    recordClearOnce,
    recordFailureOnce,
  ]);
}
