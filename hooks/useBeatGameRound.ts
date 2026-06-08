"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NO_CONTROL_INSTRUCTION_BEATS } from "@/data/challengeModes";
import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

const DEFAULT_GAME_BEATS = 8;
const INSTRUCTION_BEATS = 8;
const RESULT_BEATS = 4;
const SPEED_UP_BEATS = 8;
const BOSS_STAGE_BEATS = 8;
const ONE_UP_BEATS = 8;
const SPEED_UP_INTERVAL_ROUNDS = 4;
const BOSS_STAGE_INTERVAL_ROUNDS = 12;
const SPEED_UP_BEAT_DURATION_MULTIPLIER = 0.94;
const MIN_SPEED_RATE = 0.65;
const BEAT_PROGRESS_INTERVAL_MS = 50;

export type GameRoundPhase =
  | "bossStage"
  | "instruction"
  | "game"
  | "oneUp"
  | "result"
  | "speedUp";
export type InstructionStep =
  | "floor"
  | "formPhoto"
  | "idle"
  | "promptTransition";

const PHASE_LABELS = {
  game: "본게임",
  bossStage: "보스 스테이지",
  instruction: "조작법 안내",
  oneUp: "목숨 회복",
  result: "성공/실패 안내",
  speedUp: "속도 증가",
} satisfies Record<GameRoundPhase, string>;

type UseBeatGameRoundParams = Readonly<{
  beatDurationMultiplier?: number;
  gameBeatCount?: number;
  getGameBeatCount?: (roundNumber: number) => number;
  getShouldPassGameOnTimeout?: (roundNumber: number) => boolean;
  initialSpeedLevel?: number;
  isNoControlMode?: boolean;
  shouldPlayOneUp: boolean;
  onFailure: () => void;
  onFinish: () => void;
  onResetResult: () => void;
  onSuccess: (roundNumber: number) => void;
  shouldFinishAfterResult: boolean;
}>;

function getPhaseBeatCount(
  phase: GameRoundPhase,
  gameBeatCount: number,
  isNoControlMode: boolean,
) {
  if (phase === "instruction") {
    return isNoControlMode ? NO_CONTROL_INSTRUCTION_BEATS : INSTRUCTION_BEATS;
  }

  if (phase === "result") {
    return RESULT_BEATS;
  }

  if (phase === "speedUp") {
    return SPEED_UP_BEATS;
  }

  if (phase === "bossStage") {
    return BOSS_STAGE_BEATS;
  }

  if (phase === "oneUp") {
    return ONE_UP_BEATS;
  }

  return gameBeatCount;
}

function getSpeedRate(speedLevel: number) {
  return Math.max(
    Math.pow(SPEED_UP_BEAT_DURATION_MULTIPLIER, speedLevel),
    MIN_SPEED_RATE,
  );
}

function getBeatDurationMs(
  speedLevel: number,
  beatDurationMultiplier: number,
) {
  const speedRate = getSpeedRate(speedLevel);

  return RHYTHM_DURATION_MS * speedRate * beatDurationMultiplier;
}

function getBossStageSpeedLevel(roundNumber: number) {
  return Math.max(roundNumber / BOSS_STAGE_INTERVAL_ROUNDS - 1, 0);
}

function isBossGameRound(roundNumber: number) {
  return (
    roundNumber > 1 && (roundNumber - 1) % BOSS_STAGE_INTERVAL_ROUNDS === 0
  );
}

function getPhaseBeatDurationMs(
  phase: GameRoundPhase,
  speedLevel: number,
  beatDurationMultiplier: number,
) {
  if (phase === "oneUp") {
    return RHYTHM_DURATION_MS;
  }

  return getBeatDurationMs(speedLevel, beatDurationMultiplier);
}

export function useBeatGameRound({
  beatDurationMultiplier = 1,
  gameBeatCount = DEFAULT_GAME_BEATS,
  getGameBeatCount,
  getShouldPassGameOnTimeout,
  initialSpeedLevel = 0,
  isNoControlMode = false,
  onFailure,
  onFinish,
  onResetResult,
  onSuccess,
  shouldPlayOneUp,
  shouldFinishAfterResult,
}: UseBeatGameRoundParams) {
  const [phase, setPhase] = useState<GameRoundPhase>("instruction");
  const [instructionStep, setInstructionStep] = useState<InstructionStep>(
    isNoControlMode ? "floor" : "idle",
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [gameBeatProgress, setGameBeatProgress] = useState({
    beatsLeft: DEFAULT_GAME_BEATS,
    key: "instruction-1",
  });
  const [speedLevel, setSpeedLevel] = useState(initialSpeedLevel);
  const hasClearedCurrentGameRef = useRef(false);
  const [shouldOneUpAfterResult, setShouldOneUpAfterResult] = useState(false);
  const currentGameBeatCount = getGameBeatCount?.(roundNumber) ?? gameBeatCount;
  const shouldPassCurrentGameOnTimeout =
    getShouldPassGameOnTimeout?.(roundNumber) ?? false;
  const phaseBeatCount = getPhaseBeatCount(
    phase,
    currentGameBeatCount,
    isNoControlMode,
  );
  const beatDurationMs = getPhaseBeatDurationMs(
    phase,
    speedLevel,
    beatDurationMultiplier,
  );
  const phaseDurationMs = phaseBeatCount * beatDurationMs;
  const beatProgressKey = `${phase}-${roundNumber}-${phaseBeatCount}`;

  const beginInstruction = useCallback(() => {
    setInstructionStep(isNoControlMode ? "floor" : "idle");
    setPhase("instruction");
    setRoundResult("idle");
    hasClearedCurrentGameRef.current = false;
    onResetResult();
  }, [isNoControlMode, onResetResult]);

  const showResult = useCallback(
    (result: Exclude<GameRoundResult, "idle">) => {
      if (phase !== "game") {
        return;
      }

      setRoundResult(result);
      setPhase("result");

      if (result === "success") {
        onSuccess(roundNumber);
      } else {
        onFailure();
      }

      if (isBossGameRound(roundNumber)) {
        setShouldOneUpAfterResult(result === "success");
      }
    },
    [onFailure, onSuccess, phase, roundNumber],
  );

  useEffect(() => {
    const phaseTimer = window.setTimeout(() => {
      if (phase === "instruction") {
        setGameBeatProgress({
          beatsLeft: currentGameBeatCount,
          key: `game-${roundNumber}-${currentGameBeatCount}`,
        });
        setPhase("game");
        return;
      }

      if (phase === "game") {
        showResult(
          hasClearedCurrentGameRef.current || shouldPassCurrentGameOnTimeout
            ? "success"
            : "failure",
        );
        return;
      }

      if (shouldFinishAfterResult) {
        onFinish();
        return;
      }

      if (phase === "result" && shouldOneUpAfterResult && shouldPlayOneUp) {
        setShouldOneUpAfterResult(false);
        setPhase("oneUp");
        return;
      }

      if (phase === "result" && shouldOneUpAfterResult) {
        setShouldOneUpAfterResult(false);
        setSpeedLevel((currentSpeedLevel) => currentSpeedLevel + 1);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (phase === "result" && isBossGameRound(roundNumber)) {
        setSpeedLevel((currentSpeedLevel) => currentSpeedLevel + 1);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (
        phase === "result" &&
        roundNumber % BOSS_STAGE_INTERVAL_ROUNDS === 0
      ) {
        setSpeedLevel(getBossStageSpeedLevel(roundNumber));
        setPhase("bossStage");
        return;
      }

      if (phase === "result" && roundNumber % SPEED_UP_INTERVAL_ROUNDS === 0) {
        setPhase("speedUp");
        return;
      }

      if (phase === "speedUp") {
        setSpeedLevel((currentSpeedLevel) => currentSpeedLevel + 1);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (phase === "bossStage") {
        setShouldOneUpAfterResult(false);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (phase === "oneUp") {
        setSpeedLevel((currentSpeedLevel) => currentSpeedLevel + 1);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
      beginInstruction();
    }, phaseDurationMs);

    return () => {
      window.clearTimeout(phaseTimer);
    };
  }, [
    beginInstruction,
    currentGameBeatCount,
    onFinish,
    phase,
    phaseDurationMs,
    roundNumber,
    shouldOneUpAfterResult,
    shouldFinishAfterResult,
    shouldPassCurrentGameOnTimeout,
    shouldPlayOneUp,
    showResult,
  ]);

  useEffect(() => {
    if (phase !== "instruction") {
      return;
    }

    if (isNoControlMode) {
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

    return () => {
      window.clearTimeout(formPhotoTimer);
      window.clearTimeout(floorTimer);
      window.clearTimeout(promptTransitionTimer);
    };
  }, [beatDurationMs, isNoControlMode, phase, roundNumber]);

  useEffect(() => {
    if (phase !== "game") {
      return;
    }

    const startedAt = window.performance.now();
    const phaseEndsAt = startedAt + phaseBeatCount * beatDurationMs;

    const initialBeatTimer = window.setTimeout(() => {
      setGameBeatProgress({
        beatsLeft: phaseBeatCount,
        key: beatProgressKey,
      });
    }, 0);

    const beatTimer = window.setInterval(() => {
      const remainingMs = Math.max(phaseEndsAt - window.performance.now(), 0);
      const beatsLeft = Math.ceil(remainingMs / beatDurationMs);

      setGameBeatProgress({
        beatsLeft: Math.min(beatsLeft, phaseBeatCount),
        key: beatProgressKey,
      });
    }, BEAT_PROGRESS_INTERVAL_MS);

    const finalBeatTimer = window.setTimeout(
      () => {
        setGameBeatProgress({
          beatsLeft: 0,
          key: beatProgressKey,
        });
      },
      Math.max(phaseBeatCount * beatDurationMs - BEAT_PROGRESS_INTERVAL_MS, 0),
    );

    return () => {
      window.clearTimeout(initialBeatTimer);
      window.clearInterval(beatTimer);
      window.clearTimeout(finalBeatTimer);
    };
  }, [beatDurationMs, beatProgressKey, phase, phaseBeatCount]);

  const phaseLabel = PHASE_LABELS[phase];
  const beatsLeft =
    gameBeatProgress.key === beatProgressKey
      ? gameBeatProgress.beatsLeft
      : phaseBeatCount;

  return useMemo(
    () => ({
      beatDurationMs,
      beatsLeft,
      gameBeatCount: currentGameBeatCount,
      instructionStep,
      phase,
      phaseBeatCount,
      phaseLabel,
      recordFailure: () => {
        showResult("failure");
      },
      recordSuccess: () => {
        hasClearedCurrentGameRef.current = true;
      },
      roundNumber,
      roundResult,
      speedLevel,
    }),
    [
      beatDurationMs,
      beatsLeft,
      currentGameBeatCount,
      instructionStep,
      phase,
      phaseBeatCount,
      phaseLabel,
      roundNumber,
      roundResult,
      showResult,
      speedLevel,
    ],
  );
}
