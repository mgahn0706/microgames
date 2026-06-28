"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Microgame, MicrogameCanvas } from "@/data/microgames";
import type { InstructionStep } from "@/hooks/useBeatGameRound";
import { useMicrogameInput } from "@/hooks/useMicrogameInput";
import {
  bgmLibrary,
  type BgmTrack,
  type SoundEffectTrack,
} from "@/lib/bgmLibrary";
import { formatPracticeSpeedMultiplier } from "@/lib/practiceSpeed";

const RESULT_BEATS = 4;
const INSTRUCTION_BEATS = 8;
const EARLY_SUCCESS_RESULT_BEAT_INTERVAL = 4;
const EARLY_SUCCESS_RESULT_DELAY_MS = 500;
const BEAT_PROGRESS_INTERVAL_MS = 50;
const CLEAR_SOUND_EFFECTS = [
  "clear1",
  "clear2",
  "clear3",
  "clear4",
  "clear5",
] satisfies SoundEffectTrack[];

const PRACTICE_BGM_BY_CANVAS: Partial<Record<MicrogameCanvas, BgmTrack>> = {
  animalCrossingStamps: "animalCrossing",
  animalFarmReverseTyping: "animalFarm",
  appleNumberSum: "appleGame",
  babaIsYou: "babaIsYou",
  brainAcademyBlocks: "brainAcademy",
  cookieRun: "cookieRun",
  cookieRunKingdom: "cookieRunKingdom",
  crosswordPuzzle: "crossword",
  crazyArcade: "crazyArcade",
  dobble: "dobble",
  fireAndIceDance: "fireAndIce",
  fruitNinja: "fruitNinja",
  geometryDashSpikes: "geometryDash",
  halliGalliBoss: "halliGalli",
  hancomTyping: "hancom",
  kartriderCourse: "kartrider",
  kirbyInhale: "kirby",
  laytonShapeMatch: "layton",
  leagueChampionBan: "leagueOfLegend",
  maplestoryLieDetector: "maplestory",
  maplestoryRune: "mapleRune",
  minigameExBearMeat: "minigameEx",
  minecraftMining: "minecraft",
  modooMarble: "modooMarble",
  pokerougeShop: "pokerouge",
  pokemonTcgPocket: "pokemonTcgPocket",
  pokemonTyping: "pokemon",
  rhythmHeroSpinner: "rhythmHero",
  sudokuMissingNumber: "sudoku",
  starcraftMove: "starcraft",
  superMarioCoins: "superMario",
  superMarioGalaxyStarBits: "superMarioGalaxy",
  suikaGame: "suikaGame",
  tetrisLineClear: "tetris",
  undertaleMouse: "undertale",
  wiiSportsDualPress: "wiiSports",
  wordleBoss: "wordle",
  zeldaCircleDraw: "zelda",
};

export type PracticeResult = "failure" | "success";
export type PracticePhase = "instruction" | "playing" | "result";

function getRandomClearSoundEffect() {
  return CLEAR_SOUND_EFFECTS[
    Math.floor(Math.random() * CLEAR_SOUND_EFFECTS.length)
  ];
}

export function usePracticeMicrogame(
  microgame: Microgame,
  beatDurationMs: number,
  practiceSpeedMultiplier: number,
) {
  const router = useRouter();
  const [beatsLeft, setBeatsLeft] = useState(microgame.beatCount);
  const [instructionStep, setInstructionStep] =
    useState<InstructionStep>("idle");
  const [phase, setPhase] = useState<PracticePhase>("instruction");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const earlySuccessResultTimerRef = useRef<number | null>(null);
  const hasClearedRef = useRef(false);
  const hasResolvedRef = useRef(false);
  const latestPhaseRef = useRef(phase);

  const clearEarlySuccessResultTimer = useCallback(() => {
    if (earlySuccessResultTimerRef.current === null) {
      return;
    }

    window.clearTimeout(earlySuccessResultTimerRef.current);
    earlySuccessResultTimerRef.current = null;
  }, []);

  const showResult = useCallback(
    (nextResult: PracticeResult) => {
      if (hasResolvedRef.current) {
        return;
      }

      clearEarlySuccessResultTimer();
      hasResolvedRef.current = true;
      setResult(nextResult);
      setPhase("result");
    },
    [clearEarlySuccessResultTimer],
  );

  const recordSuccess = useCallback(() => {
    if (hasClearedRef.current || hasResolvedRef.current) {
      return;
    }

    hasClearedRef.current = true;

    if (
      microgame.canvas === "babaIsYou" ||
      microgame.canvas === "sudokuMissingNumber"
    ) {
      return;
    }

    bgmLibrary
      .playSoundEffect(getRandomClearSoundEffect())
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [microgame.canvas]);

  const recordFailure = useCallback(() => {
    showResult("failure");
  }, [showResult]);

  useMicrogameInput({
    isActive: phase === "playing",
    onClear: recordSuccess,
    onFailure: recordFailure,
    roundNumber: 1,
  });

  useEffect(() => {
    latestPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "instruction") {
      return;
    }

    const formPhotoTimer = window.setTimeout(() => {
      setInstructionStep("formPhoto");
    }, 2 * beatDurationMs);
    const floorTimer = window.setTimeout(() => {
      setInstructionStep("floor");
    }, 4 * beatDurationMs);
    const promptTransitionTimer = window.setTimeout(
      () => {
        setInstructionStep("promptTransition");
      },
      (INSTRUCTION_BEATS - 1) * beatDurationMs,
    );
    const startTimer = window.setTimeout(() => {
      setPhase("playing");
    }, INSTRUCTION_BEATS * beatDurationMs);

    return () => {
      window.clearTimeout(formPhotoTimer);
      window.clearTimeout(floorTimer);
      window.clearTimeout(promptTransitionTimer);
      window.clearTimeout(startTimer);
    };
  }, [beatDurationMs, phase]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    const startedAt = window.performance.now();
    const durationMs = microgame.beatCount * beatDurationMs;
    const endsAt = startedAt + durationMs;
    const beatTimer = window.setInterval(() => {
      const remainingMs = Math.max(endsAt - window.performance.now(), 0);

      setBeatsLeft(
        Math.min(Math.ceil(remainingMs / beatDurationMs), microgame.beatCount),
      );
    }, BEAT_PROGRESS_INTERVAL_MS);
    const finishTimer = window.setTimeout(() => {
      setBeatsLeft(0);
      showResult(hasClearedRef.current ? "success" : "failure");
    }, durationMs);

    return () => {
      window.clearInterval(beatTimer);
      window.clearTimeout(finishTimer);
    };
  }, [beatDurationMs, microgame.beatCount, phase, showResult]);

  useEffect(() => {
    const canShowSuccessfulResultEarly =
      phase === "playing" &&
      hasClearedRef.current &&
      !hasResolvedRef.current &&
      beatsLeft > 0 &&
      beatsLeft % EARLY_SUCCESS_RESULT_BEAT_INTERVAL === 0;

    if (
      !canShowSuccessfulResultEarly ||
      earlySuccessResultTimerRef.current !== null
    ) {
      return;
    }

    earlySuccessResultTimerRef.current = window.setTimeout(() => {
      earlySuccessResultTimerRef.current = null;

      if (
        latestPhaseRef.current !== "playing" ||
        !hasClearedRef.current ||
        hasResolvedRef.current
      ) {
        return;
      }

      showResult("success");
    }, EARLY_SUCCESS_RESULT_DELAY_MS);
  }, [beatsLeft, phase, showResult]);

  useEffect(() => {
    if (phase !== "playing") {
      clearEarlySuccessResultTimer();
    }
  }, [clearEarlySuccessResultTimer, phase]);

  useEffect(() => {
    bgmLibrary.setBeatDurationMs(beatDurationMs);

    if (phase === "instruction") {
      bgmLibrary.play("intermission", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (phase === "playing") {
      const track = PRACTICE_BGM_BY_CANVAS[microgame.canvas];

      if (!track) {
        bgmLibrary.stop();
        return;
      }

      bgmLibrary.play(track, "once", "now").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (!result) {
      return;
    }

    const resultTrack = result === "failure" ? "fail" : "success";

    bgmLibrary.play(resultTrack, "once", "now").catch((error: unknown) => {
      console.error(error);
    });
  }, [beatDurationMs, microgame.canvas, phase, result]);

  useEffect(() => {
    if (phase !== "result") {
      return;
    }

    const returnTimer = window.setTimeout(() => {
      router.replace(
        `/microscope?speed=${formatPracticeSpeedMultiplier(
          practiceSpeedMultiplier,
        )}`,
      );
    }, RESULT_BEATS * beatDurationMs);

    return () => {
      window.clearTimeout(returnTimer);
    };
  }, [beatDurationMs, phase, practiceSpeedMultiplier, router]);

  useEffect(
    () => () => {
      clearEarlySuccessResultTimer();
      bgmLibrary.stop();
    },
    [clearEarlySuccessResultTimer],
  );

  const returnToMicroscope = useCallback(() => {
    router.replace(
      `/microscope?speed=${formatPracticeSpeedMultiplier(
        practiceSpeedMultiplier,
      )}`,
    );
  }, [practiceSpeedMultiplier, router]);

  return {
    beatsLeft,
    instructionStep,
    phase,
    result,
    returnToMicroscope,
  };
}
