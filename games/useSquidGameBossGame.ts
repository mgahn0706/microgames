"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type SquidGamePhase =
  | "failure"
  | "green"
  | "red"
  | "success"
  | "waiting";

const BASE_BEAT_DURATION_MS = 500;
const AUDIO_NATURAL_DURATION_MS = 8228;
const GREEN_LIGHT_BEATS = 9;
const RED_LIGHT_BEATS = 7;
const CYCLE_BEATS = GREEN_LIGHT_BEATS + RED_LIGHT_BEATS;
const MOVE_DURATION_BEATS = 20;
const REQUIRED_RED_LIGHTS = 3;
const PRE_FINISH_PROGRESS = 0.97;
const MIN_GAP_BEATS = 0;
const MAX_GAP_BEATS = 0.25;
const JINGLE_PATH = "/games/squid-game/sounds/squid-game-doll-jingle.mp3";

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getRandomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createCycleSpeeds() {
  return [
    getRandomBetween(0.9, 0.98),
    getRandomBetween(1.18, 1.28),
    getRandomBetween(1.42, 1.52),
  ]
    .map((speed) => ({ order: Math.random(), speed }))
    .sort((first, second) => first.order - second.order)
    .map(({ speed }) => speed);
}

export function useSquidGameBossGame({
  beatDurationMs,
  isActive,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
}>): Readonly<{
  isHolding: boolean;
  phase: SquidGamePhase;
  progress: number;
}> {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRedLightsRef = useRef(0);
  const cycleIndexRef = useRef(0);
  const cycleTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const phaseRef = useRef<SquidGamePhase>("waiting");
  const progressRef = useRef(0);
  const resolvedRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [phase, setPhase] = useState<SquidGamePhase>("waiting");
  const [progress, setProgress] = useState(0);
  const [cycleSpeeds] = useState(createCycleSpeeds);

  const setCurrentPhase = useCallback((nextPhase: SquidGamePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const fail = useCallback(() => {
    if (resolvedRef.current) {
      return;
    }

    resolvedRef.current = true;
    isHoldingRef.current = false;
    setIsHolding(false);
    setCurrentPhase("failure");
    audioRef.current?.pause();
    dispatchFailure();
  }, [setCurrentPhase]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const audio = new Audio(JINGLE_PATH);

    audio.preload = "auto";
    audioRef.current = audio;

    const clearCycleTimer = () => {
      if (cycleTimerRef.current !== null) {
        window.clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };

    const startCycle = () => {
      if (resolvedRef.current) {
        return;
      }

      const randomSpeed =
        cycleSpeeds[cycleIndexRef.current] ?? getRandomBetween(1.05, 1.5);

      cycleIndexRef.current += 1;

      const rhythmScale = BASE_BEAT_DURATION_MS / beatDurationMs;
      const playbackRate = randomSpeed * rhythmScale;
      const cycleDurationMs = AUDIO_NATURAL_DURATION_MS / playbackRate;
      const greenDurationMs =
        cycleDurationMs * (GREEN_LIGHT_BEATS / CYCLE_BEATS);
      const redDurationMs = cycleDurationMs * (RED_LIGHT_BEATS / CYCLE_BEATS);

      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      void audio.play().catch(() => {});
      setCurrentPhase("green");

      cycleTimerRef.current = window.setTimeout(() => {
        setCurrentPhase("red");

        if (isHoldingRef.current) {
          fail();
          return;
        }

        completedRedLightsRef.current += 1;
        cycleTimerRef.current = window.setTimeout(() => {
          if (resolvedRef.current) {
            return;
          }

          setCurrentPhase("waiting");
          const gapMs =
            getRandomBetween(MIN_GAP_BEATS, MAX_GAP_BEATS) * beatDurationMs;
          cycleTimerRef.current = window.setTimeout(startCycle, gapMs);
        }, redDurationMs);
      }, greenDurationMs);
    };

    const initialDelayMs =
      getRandomBetween(MIN_GAP_BEATS, MAX_GAP_BEATS) * beatDurationMs;
    cycleTimerRef.current = window.setTimeout(startCycle, initialDelayMs);

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();

      if (resolvedRef.current || isHoldingRef.current) {
        return;
      }

      if (phaseRef.current === "red") {
        fail();
        return;
      }

      isHoldingRef.current = true;
      setIsHolding(true);
    };
    const handlePointerUp = () => {
      isHoldingRef.current = false;
      setIsHolding(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      clearCycleTimer();
      audio.pause();
      audioRef.current = null;
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, [beatDurationMs, cycleSpeeds, fail, isActive, setCurrentPhase]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const moveDurationMs = MOVE_DURATION_BEATS * beatDurationMs;
    let previousTimestamp = window.performance.now();

    const update = (timestamp: number) => {
      const deltaMs = Math.min(timestamp - previousTimestamp, 50);

      previousTimestamp = timestamp;

      if (
        !resolvedRef.current &&
        isHoldingRef.current &&
        phaseRef.current === "green"
      ) {
        const progressLimit =
          completedRedLightsRef.current >= REQUIRED_RED_LIGHTS
            ? 1
            : PRE_FINISH_PROGRESS;
        const nextProgress = Math.min(
          progressRef.current + deltaMs / moveDurationMs,
          progressLimit,
        );

        progressRef.current = nextProgress;
        setProgress(nextProgress);

        if (nextProgress >= 1) {
          resolvedRef.current = true;
          isHoldingRef.current = false;
          setIsHolding(false);
          setCurrentPhase("success");
          audioRef.current?.pause();
          dispatchClear();
          return;
        }
      }

      frameRef.current = window.requestAnimationFrame(update);
    };

    frameRef.current = window.requestAnimationFrame(update);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [beatDurationMs, isActive, setCurrentPhase]);

  return { isHolding, phase, progress };
}
