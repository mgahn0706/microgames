"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

const DEFAULT_GAME_BEATS = 8;
const INSTRUCTION_BEATS = 8;
const PROGRESS_TICK_MS = 50;
const RESULT_BEATS = 4;
const SPEED_UP_BEATS = 8;
const SPEED_UP_INTERVAL_ROUNDS = 4;
const SPEED_UP_BEAT_DURATION_MULTIPLIER = 0.96;
const MIN_SPEED_RATE = 0.65;

export type GameRoundPhase = "instruction" | "game" | "result" | "speedUp";
export type InstructionStep = "formPhoto" | "formDescription" | "floor";

const PHASE_LABELS = {
  game: "본게임",
  instruction: "조작법 안내",
  result: "성공/실패 안내",
  speedUp: "속도 증가",
} satisfies Record<GameRoundPhase, string>;

type UseBeatGameRoundParams = Readonly<{
  gameBeatCount?: number;
  onFailure: () => void;
  onFinish: () => void;
  onResetResult: () => void;
  onSuccess: () => void;
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

  return gameBeatCount;
}

function getBeatDurationMs(speedLevel: number) {
  const speedRate = Math.max(
    Math.pow(SPEED_UP_BEAT_DURATION_MULTIPLIER, speedLevel),
    MIN_SPEED_RATE,
  );

  return RHYTHM_DURATION_MS * speedRate;
}

export function useBeatGameRound({
  gameBeatCount = DEFAULT_GAME_BEATS,
  onFailure,
  onFinish,
  onResetResult,
  onSuccess,
  shouldFinishAfterResult,
}: UseBeatGameRoundParams) {
  const [phase, setPhase] = useState<GameRoundPhase>("instruction");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [speedLevel, setSpeedLevel] = useState(0);
  const phaseBeatCount = getPhaseBeatCount(phase, gameBeatCount);
  const beatDurationMs = getBeatDurationMs(speedLevel);
  const phaseDurationMs = phaseBeatCount * beatDurationMs;

  const beginInstruction = useCallback(() => {
    setElapsedMs(0);
    setPhase("instruction");
    setRoundResult("idle");
    onResetResult();
  }, [onResetResult]);

  const showResult = useCallback(
    (result: Exclude<GameRoundResult, "idle">) => {
      if (phase !== "game") {
        return;
      }

      setElapsedMs(0);
      setRoundResult(result);
      setPhase("result");

      if (result === "success") {
        onSuccess();
      } else {
        onFailure();
      }
    },
    [onFailure, onSuccess, phase],
  );

  useEffect(() => {
    const startedAt = window.performance.now();

    const progressTimer = window.setInterval(() => {
      setElapsedMs(
        Math.min(window.performance.now() - startedAt, phaseDurationMs),
      );
    }, PROGRESS_TICK_MS);
    const phaseTimer = window.setTimeout(() => {
      if (phase === "instruction") {
        setElapsedMs(0);
        setPhase("game");
        return;
      }

      if (phase === "game") {
        showResult("failure");
        return;
      }

      if (shouldFinishAfterResult) {
        onFinish();
        return;
      }

      if (phase === "result" && roundNumber % SPEED_UP_INTERVAL_ROUNDS === 0) {
        setElapsedMs(0);
        setPhase("speedUp");
        return;
      }

      if (phase === "speedUp") {
        setSpeedLevel((currentSpeedLevel) => currentSpeedLevel + 1);
        setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
        beginInstruction();
        return;
      }

      setRoundNumber((currentRoundNumber) => currentRoundNumber + 1);
      beginInstruction();
    }, phaseDurationMs);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(phaseTimer);
    };
  }, [
    beginInstruction,
    onFinish,
    phase,
    phaseDurationMs,
    roundNumber,
    shouldFinishAfterResult,
    showResult,
  ]);

  const progressBeats = Math.min(
    Math.ceil(elapsedMs / beatDurationMs),
    phaseBeatCount,
  );
  const phaseLabel = PHASE_LABELS[phase];
  const instructionStep: InstructionStep =
    elapsedMs < 2 * beatDurationMs
      ? "formPhoto"
      : elapsedMs < (INSTRUCTION_BEATS / 2) * beatDurationMs
        ? "formDescription"
        : "floor";

  return useMemo(
    () => ({
      beatDurationMs,
      gameBeatCount,
      instructionStep,
      phase,
      phaseBeatCount,
      phaseLabel,
      progressBeats,
      recordFailure: () => showResult("failure"),
      recordSuccess: () => showResult("success"),
      roundNumber,
      roundResult,
      speedLevel,
    }),
    [
      beatDurationMs,
      gameBeatCount,
      instructionStep,
      phase,
      phaseBeatCount,
      phaseLabel,
      progressBeats,
      roundNumber,
      roundResult,
      showResult,
      speedLevel,
    ],
  );
}
