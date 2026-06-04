"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export type GameRoundPhase =
  | "bossStage"
  | "instruction"
  | "game"
  | "oneUp"
  | "result"
  | "speedUp";
export type InstructionStep = "idle" | "formPhoto" | "floor";

const PHASE_LABELS = {
  game: "본게임",
  bossStage: "보스 스테이지",
  instruction: "조작법 안내",
  oneUp: "목숨 회복",
  result: "성공/실패 안내",
  speedUp: "속도 증가",
} satisfies Record<GameRoundPhase, string>;

type UseBeatGameRoundParams = Readonly<{
  gameBeatCount?: number;
  getGameBeatCount?: (roundNumber: number) => number;
  shouldPlayOneUp: boolean;
  onFailure: () => void;
  onFinish: () => void;
  onResetResult: () => void;
  onSuccess: (roundNumber: number) => void;
  shouldFinishAfterResult: boolean;
}>;

function getPhaseBeatCount(phase: GameRoundPhase, gameBeatCount: number) {
  if (phase === "instruction") {
    return INSTRUCTION_BEATS;
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

function getBeatDurationMs(speedLevel: number) {
  const speedRate = getSpeedRate(speedLevel);

  return RHYTHM_DURATION_MS * speedRate;
}

function getPhaseBeatDurationMs(phase: GameRoundPhase, speedLevel: number) {
  if (phase === "oneUp") {
    return RHYTHM_DURATION_MS;
  }

  return getBeatDurationMs(speedLevel);
}

export function useBeatGameRound({
  gameBeatCount = DEFAULT_GAME_BEATS,
  getGameBeatCount,
  onFailure,
  onFinish,
  onResetResult,
  onSuccess,
  shouldPlayOneUp,
  shouldFinishAfterResult,
}: UseBeatGameRoundParams) {
  const [phase, setPhase] = useState<GameRoundPhase>("instruction");
  const [instructionStep, setInstructionStep] =
    useState<InstructionStep>("idle");
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [gameBeatProgress, setGameBeatProgress] = useState({
    beatsLeft: DEFAULT_GAME_BEATS,
    key: "instruction-1",
  });
  const [speedLevel, setSpeedLevel] = useState(0);
  const [hasClearedCurrentGame, setHasClearedCurrentGame] = useState(false);
  const [shouldOneUpAfterResult, setShouldOneUpAfterResult] = useState(false);
  const currentGameBeatCount = getGameBeatCount?.(roundNumber) ?? gameBeatCount;
  const phaseBeatCount = getPhaseBeatCount(phase, currentGameBeatCount);
  const beatDurationMs = getPhaseBeatDurationMs(phase, speedLevel);
  const phaseDurationMs = phaseBeatCount * beatDurationMs;
  const beatProgressKey = `${phase}-${roundNumber}-${phaseBeatCount}`;

  const beginInstruction = useCallback(() => {
    setInstructionStep("idle");
    setPhase("instruction");
    setRoundResult("idle");
    setHasClearedCurrentGame(false);
    onResetResult();
  }, [onResetResult]);

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
    },
    [onFailure, onSuccess, phase, roundNumber],
  );

  useEffect(() => {
    const phaseTimer = window.setTimeout(() => {
      if (phase === "instruction") {
        setPhase("game");
        return;
      }

      if (phase === "game") {
        showResult(hasClearedCurrentGame ? "success" : "failure");
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
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (phase === "result" && roundNumber % BOSS_STAGE_INTERVAL_ROUNDS === 0) {
        setSpeedLevel(0);
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
        setShouldOneUpAfterResult(true);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      if (phase === "oneUp") {
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
    onFinish,
    phase,
    phaseDurationMs,
    hasClearedCurrentGame,
    roundNumber,
    shouldOneUpAfterResult,
    shouldFinishAfterResult,
    shouldPlayOneUp,
    showResult,
  ]);

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

    return () => {
      window.clearTimeout(formPhotoTimer);
      window.clearTimeout(floorTimer);
    };
  }, [beatDurationMs, phase, roundNumber]);

  useEffect(() => {
    if (phase !== "game") {
      return;
    }

    const startedAt = window.performance.now();
    const beatTimer = window.setInterval(() => {
      const elapsedBeats = Math.floor(
        (window.performance.now() - startedAt) / beatDurationMs,
      );

      setGameBeatProgress({
        beatsLeft: Math.max(phaseBeatCount - elapsedBeats, 0),
        key: beatProgressKey,
      });
    }, beatDurationMs);

    return () => {
      window.clearInterval(beatTimer);
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
      recordFailure: () => setHasClearedCurrentGame(false),
      recordSuccess: () => setHasClearedCurrentGame(true),
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
      speedLevel,
    ],
  );
}
