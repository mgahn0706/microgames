"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

const DEFAULT_GAME_BEATS = 8;
const INSTRUCTION_BEATS = 8;
const NO_CONTROL_INSTRUCTION_BEATS = 4;
const RESULT_BEATS = 4;
const SPEED_UP_BEATS = 8;
const BOSS_STAGE_BEATS = 8;
const ONE_UP_BEATS = 8;
const SPEED_UP_INTERVAL_ROUNDS = 4;
const BOSS_STAGE_INTERVAL_ROUNDS = 12;
const EARLY_SUCCESS_RESULT_BEAT_INTERVAL = 4;
const EARLY_SUCCESS_RESULT_DELAY_MS = 500;
const SPEED_UP_BEAT_DURATION_MULTIPLIER = 0.94;
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
  gameBeatCount?: number;
  getGameBeatCount?: (roundNumber: number) => number;
  initialSpeedMultiplier?: number;
  noControlHints?: boolean;
  shouldPlayOneUp: boolean;
  onFailure: () => void;
  onFinish: (reachedRound: number) => void;
  onResetResult: () => void;
  onSuccess: (roundNumber: number) => void;
  shouldFinishAfterResult: boolean;
}>;

function getPhaseBeatCount(
  phase: GameRoundPhase,
  gameBeatCount: number,
  noControlHints: boolean,
) {
  if (phase === "instruction") {
    return noControlHints ? NO_CONTROL_INSTRUCTION_BEATS : INSTRUCTION_BEATS;
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
  return Math.pow(SPEED_UP_BEAT_DURATION_MULTIPLIER, speedLevel);
}

function getBeatDurationMs(speedLevel: number, initialSpeedMultiplier: number) {
  const speedRate = getSpeedRate(speedLevel);

  return (RHYTHM_DURATION_MS * speedRate) / initialSpeedMultiplier;
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
  initialSpeedMultiplier: number,
) {
  if (phase === "oneUp") {
    return RHYTHM_DURATION_MS;
  }

  return getBeatDurationMs(speedLevel, initialSpeedMultiplier);
}

export function useBeatGameRound({
  gameBeatCount = DEFAULT_GAME_BEATS,
  getGameBeatCount,
  initialSpeedMultiplier = 1,
  noControlHints = false,
  onFailure,
  onFinish,
  onResetResult,
  onSuccess,
  shouldPlayOneUp,
  shouldFinishAfterResult,
}: UseBeatGameRoundParams) {
  const [phase, setPhase] = useState<GameRoundPhase>("instruction");
  const [instructionStep, setInstructionStep] = useState<InstructionStep>(
    noControlHints ? "floor" : "idle",
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [gameBeatProgress, setGameBeatProgress] = useState({
    beatsLeft: DEFAULT_GAME_BEATS,
    key: "instruction-1",
  });
  const [speedLevel, setSpeedLevel] = useState(0);
  const earlySuccessResultTimerRef = useRef<number | null>(null);
  const hasClearedCurrentGameRef = useRef(false);
  const latestRoundStateRef = useRef({ phase, roundNumber });
  const [successFeedbackRound, setSuccessFeedbackRound] = useState<
    number | null
  >(null);
  const [shouldOneUpAfterResult, setShouldOneUpAfterResult] = useState(false);
  const currentGameBeatCount = getGameBeatCount?.(roundNumber) ?? gameBeatCount;
  const phaseBeatCount = getPhaseBeatCount(
    phase,
    currentGameBeatCount,
    noControlHints,
  );
  const beatDurationMs = getPhaseBeatDurationMs(
    phase,
    speedLevel,
    initialSpeedMultiplier,
  );
  const phaseDurationMs = phaseBeatCount * beatDurationMs;
  const beatProgressKey = `${phase}-${roundNumber}-${phaseBeatCount}`;

  const clearEarlySuccessResultTimer = useCallback(() => {
    if (earlySuccessResultTimerRef.current === null) {
      return;
    }

    window.clearTimeout(earlySuccessResultTimerRef.current);
    earlySuccessResultTimerRef.current = null;
  }, []);

  const beginInstruction = useCallback(() => {
    clearEarlySuccessResultTimer();
    setInstructionStep(noControlHints ? "floor" : "idle");
    setPhase("instruction");
    setRoundResult("idle");
    hasClearedCurrentGameRef.current = false;
    setSuccessFeedbackRound(null);
    onResetResult();
  }, [clearEarlySuccessResultTimer, noControlHints, onResetResult]);

  const showResult = useCallback(
    (result: Exclude<GameRoundResult, "idle">) => {
      if (phase !== "game") {
        return;
      }

      clearEarlySuccessResultTimer();
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
    [clearEarlySuccessResultTimer, onFailure, onSuccess, phase, roundNumber],
  );

  useEffect(() => {
    latestRoundStateRef.current = { phase, roundNumber };
  }, [phase, roundNumber]);

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
        showResult(hasClearedCurrentGameRef.current ? "success" : "failure");
        return;
      }

      if (shouldFinishAfterResult) {
        onFinish(roundNumber);
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
    shouldPlayOneUp,
    showResult,
  ]);

  useEffect(() => {
    if (phase !== "instruction") {
      return;
    }

    if (noControlHints) {
      const promptTransitionTimer = window.setTimeout(
        () => {
          setInstructionStep("promptTransition");
        },
        (NO_CONTROL_INSTRUCTION_BEATS - 1) * beatDurationMs,
      );

      return () => {
        window.clearTimeout(promptTransitionTimer);
      };
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
  }, [beatDurationMs, noControlHints, phase, roundNumber]);

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

  useEffect(() => {
    const canShowSuccessfulResultEarly =
      phase === "game" &&
      hasClearedCurrentGameRef.current &&
      successFeedbackRound === roundNumber &&
      beatsLeft > 0 &&
      beatsLeft % EARLY_SUCCESS_RESULT_BEAT_INTERVAL === 0;

    if (
      !canShowSuccessfulResultEarly ||
      earlySuccessResultTimerRef.current !== null
    ) {
      return;
    }

    const scheduledRoundNumber = roundNumber;

    earlySuccessResultTimerRef.current = window.setTimeout(() => {
      earlySuccessResultTimerRef.current = null;

      if (
        latestRoundStateRef.current.phase !== "game" ||
        latestRoundStateRef.current.roundNumber !== scheduledRoundNumber ||
        !hasClearedCurrentGameRef.current ||
        successFeedbackRound !== scheduledRoundNumber
      ) {
        return;
      }

      showResult("success");
    }, EARLY_SUCCESS_RESULT_DELAY_MS);
  }, [beatsLeft, phase, roundNumber, showResult, successFeedbackRound]);

  useEffect(() => {
    if (phase !== "game") {
      clearEarlySuccessResultTimer();
    }
  }, [clearEarlySuccessResultTimer, phase]);

  useEffect(() => {
    return () => {
      clearEarlySuccessResultTimer();
    };
  }, [clearEarlySuccessResultTimer]);

  return useMemo(
    () => ({
      beatDurationMs,
      beatsLeft,
      confirmSuccessFeedback: () => {
        setSuccessFeedbackRound(roundNumber);
      },
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
