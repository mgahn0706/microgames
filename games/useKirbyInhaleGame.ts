"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type KirbyInhaleFrame = "inhaleA" | "inhaleB" | "ready" | "start";
export type KirbyEnemyFrame = "enemyA" | "enemyB";

const HOLD_DURATION_MS = 1450;
const FRAME_DURATION_MS = 140;
const INHALE_SOUND_SRC = "/games/kirby/sounds/kirby-inhale.mp3";

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

export function useKirbyInhaleGame(): Readonly<{
  enemyFrame: KirbyEnemyFrame;
  handlePointerCancel: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: () => void;
  inhaleFrame: KirbyInhaleFrame;
  isHolding: boolean;
  progress: number;
}> {
  const animationFrameRef = useRef(0);
  const hasClearedRef = useRef(false);
  const holdStartedAtRef = useRef<number | null>(null);
  const inhaleAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const stopHolding = useCallback(() => {
    if (hasClearedRef.current) {
      return;
    }

    holdStartedAtRef.current = null;
    setIsHolding(false);
    setProgress(0);
    stopAudio(inhaleAudioRef.current);
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (hasClearedRef.current) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      holdStartedAtRef.current = performance.now();
      setIsHolding(true);
      setProgress(0);

      const audio = inhaleAudioRef.current;

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((error: unknown) => {
          console.error(error);
        });
      }
    },
    [],
  );

  useEffect(() => {
    const audio = new Audio(INHALE_SOUND_SRC);

    audio.loop = true;
    audio.volume = 0.88;
    inhaleAudioRef.current = audio;

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      stopAudio(audio);
    };
  }, []);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (holdStartedAtRef.current !== null && !hasClearedRef.current) {
        const nextProgress = Math.min(
          (timestamp - holdStartedAtRef.current) / HOLD_DURATION_MS,
          1,
        );

        setProgress(nextProgress);

        if (nextProgress >= 1) {
          hasClearedRef.current = true;
          holdStartedAtRef.current = null;
          setIsHolding(false);
          stopAudio(inhaleAudioRef.current);
          dispatchClear();
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const frameIndex = Math.floor(
    (progress * HOLD_DURATION_MS) / FRAME_DURATION_MS,
  );
  const inhaleFrame =
    progress <= 0
      ? "ready"
      : progress < 0.18
        ? "start"
        : frameIndex % 2 === 0
          ? "inhaleA"
          : "inhaleB";
  const enemyFrame = frameIndex % 2 === 0 ? "enemyA" : "enemyB";

  return {
    enemyFrame,
    handlePointerCancel: stopHolding,
    handlePointerDown,
    handlePointerUp: stopHolding,
    inhaleFrame,
    isHolding,
    progress,
  };
}
