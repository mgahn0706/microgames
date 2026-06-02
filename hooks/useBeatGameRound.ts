"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

const DEFAULT_GAME_BEATS = 8;
const INSTRUCTION_BEATS = 8;
const PROGRESS_TICK_MS = 50;
const RESULT_BEATS = 4;

export type GameRoundPhase = "instruction" | "game" | "result";
export type InstructionStep = "controls" | "floor";

const PHASE_LABELS = {
  game: "본게임",
  instruction: "조작법 안내",
  result: "성공/실패 안내",
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

  return gameBeatCount;
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
  const phaseBeatCount = getPhaseBeatCount(phase, gameBeatCount);
  const phaseDurationMs = phaseBeatCount * RHYTHM_DURATION_MS;

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
    shouldFinishAfterResult,
    showResult,
  ]);

  const progressBeats = Math.min(
    Math.ceil(elapsedMs / RHYTHM_DURATION_MS),
    phaseBeatCount,
  );
  const phaseLabel = PHASE_LABELS[phase];
  const instructionStep: InstructionStep =
    elapsedMs < (INSTRUCTION_BEATS / 2) * RHYTHM_DURATION_MS
      ? "controls"
      : "floor";

  return useMemo(
    () => ({
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
    }),
    [
      gameBeatCount,
      instructionStep,
      phase,
      phaseBeatCount,
      phaseLabel,
      progressBeats,
      roundNumber,
      roundResult,
      showResult,
    ],
  );
}
