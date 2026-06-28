"use client";

import type { PointerEvent, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

type Point = Readonly<{
  x: number;
  y: number;
}>;

const CLEAR_GAUGE = 100;
const GAUGE_PER_TURN = 30;
const INERTIA_DECAY_PER_SECOND = 3.4;
const MAX_ANGULAR_VELOCITY = 24;
const MIN_INERTIA_VELOCITY = 0.22;
const SPIN_SOUND_SRC = "/games/rhythm-hero/sounds/spinning-sound.mp3";
const SPINNER_RADIUS_PERCENT = 25.5;
const SPINNER_CENTER = { x: 49.94, y: 53.35 } satisfies Point;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function normalizeAngleDelta(delta: number) {
  if (delta > Math.PI) {
    return delta - Math.PI * 2;
  }

  if (delta < -Math.PI) {
    return delta + Math.PI * 2;
  }

  return delta;
}

function getPointerPercentPoint(
  stage: HTMLDivElement,
  event: PointerEvent<HTMLDivElement>,
) {
  const bounds = stage.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 100,
    y: ((event.clientY - bounds.top) / bounds.height) * 100,
  } satisfies Point;
}

function getAngle(point: Point) {
  return Math.atan2(point.y - SPINNER_CENTER.y, point.x - SPINNER_CENTER.x);
}

function isInsideSpinner(point: Point) {
  const distance = Math.hypot(
    point.x - SPINNER_CENTER.x,
    point.y - SPINNER_CENTER.y,
  );

  return distance <= SPINNER_RADIUS_PERCENT;
}

function clampAngularVelocity(velocity: number) {
  return Math.max(
    -MAX_ANGULAR_VELOCITY,
    Math.min(MAX_ANGULAR_VELOCITY, velocity),
  );
}

export function useRhythmHeroGame({
  beatDurationMs,
}: Readonly<{ beatDurationMs: number }>): Readonly<{
  gauge: number;
  handlePointerCancel: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: () => void;
  isDragging: boolean;
  spinnerRotation: number;
  spinnerStageRef: RefObject<HTMLDivElement | null>;
}> {
  const animationFrameRef = useRef<number | null>(null);
  const angularVelocityRef = useRef(0);
  const hasClearedRef = useRef(false);
  const inertiaStepRef = useRef<(timestamp: number) => void>(() => {});
  const lastAngleRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number | null>(null);
  const previousFrameTimeRef = useRef<number | null>(null);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const spinnerStageRef = useRef<HTMLDivElement | null>(null);
  const [gauge, setGauge] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [spinnerRotation, setSpinnerRotation] = useState(0);

  const stopSpinSound = useCallback(() => {
    const spinSound = spinSoundRef.current;

    if (!spinSound) {
      return;
    }

    spinSound.pause();
    spinSound.currentTime = 0;
  }, []);

  const playSpinSound = useCallback(() => {
    if (!spinSoundRef.current) {
      const nextSpinSound = new Audio(SPIN_SOUND_SRC);

      nextSpinSound.loop = true;
      nextSpinSound.volume = 0.84;
      spinSoundRef.current = nextSpinSound;
    }

    const spinSound = spinSoundRef.current;

    if (!spinSound.paused) {
      return;
    }

    spinSound.currentTime = 0;
    spinSound.play().catch(() => {
      // Pointer input unlocks audio in browsers that block autoplay.
    });
  }, []);

  const clearInertiaFrame = useCallback(() => {
    if (animationFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    previousFrameTimeRef.current = null;
  }, []);

  const increaseGauge = useCallback(
    (angleTravel: number) => {
      if (hasClearedRef.current) {
        return;
      }

      const speedScale = RHYTHM_DURATION_MS / beatDurationMs;
      const turns = Math.abs(angleTravel) / (Math.PI * 2);
      const increase = turns * GAUGE_PER_TURN * speedScale;

      setGauge((currentGauge) => {
        const nextGauge = Math.min(CLEAR_GAUGE, currentGauge + increase);

        if (nextGauge >= CLEAR_GAUGE && !hasClearedRef.current) {
          hasClearedRef.current = true;
          stopSpinSound();
          setIsDragging(false);
          dispatchClear();
        }

        return nextGauge;
      });
    },
    [beatDurationMs, stopSpinSound],
  );

  const stepInertia = useCallback(
    (timestamp: number) => {
      if (hasClearedRef.current) {
        clearInertiaFrame();
        stopSpinSound();
        setIsDragging(false);
        return;
      }

      const previousFrameTime = previousFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min(
        Math.max((timestamp - previousFrameTime) / 1000, 0),
        0.05,
      );

      previousFrameTimeRef.current = timestamp;

      const angularVelocity = angularVelocityRef.current;

      if (Math.abs(angularVelocity) < MIN_INERTIA_VELOCITY) {
        angularVelocityRef.current = 0;
        clearInertiaFrame();
        stopSpinSound();
        setIsDragging(false);
        return;
      }

      const angleTravel = angularVelocity * deltaSeconds;
      const rotationDelta = (angleTravel * 180) / Math.PI;
      const nextVelocity =
        angularVelocity * Math.exp(-INERTIA_DECAY_PER_SECOND * deltaSeconds);

      angularVelocityRef.current = nextVelocity;
      setSpinnerRotation((rotation) => rotation + rotationDelta);
      increaseGauge(angleTravel);

      animationFrameRef.current = window.requestAnimationFrame(
        inertiaStepRef.current,
      );
    },
    [clearInertiaFrame, increaseGauge, stopSpinSound],
  );

  useEffect(() => {
    inertiaStepRef.current = stepInertia;
  }, [stepInertia]);

  const startInertia = useCallback(() => {
    clearInertiaFrame();

    if (Math.abs(angularVelocityRef.current) < MIN_INERTIA_VELOCITY) {
      angularVelocityRef.current = 0;
      stopSpinSound();
      setIsDragging(false);
      return;
    }

    setIsDragging(true);
    playSpinSound();
    animationFrameRef.current = window.requestAnimationFrame(
      inertiaStepRef.current,
    );
  }, [clearInertiaFrame, playSpinSound, stopSpinSound]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const stage = spinnerStageRef.current;

      if (!stage || hasClearedRef.current) {
        return;
      }

      const point = getPointerPercentPoint(stage, event);

      if (!isInsideSpinner(point)) {
        return;
      }

      event.preventDefault();
      clearInertiaFrame();
      angularVelocityRef.current = 0;
      stage.setPointerCapture(event.pointerId);
      lastAngleRef.current = getAngle(point);
      lastMoveTimeRef.current = window.performance.now();
      setIsDragging(true);
      playSpinSound();
    },
    [clearInertiaFrame, playSpinSound],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const stage = spinnerStageRef.current;
      const lastAngle = lastAngleRef.current;

      if (!stage || lastAngle === null || hasClearedRef.current) {
        return;
      }

      event.preventDefault();

      const nextAngle = getAngle(getPointerPercentPoint(stage, event));
      const angleDelta = normalizeAngleDelta(nextAngle - lastAngle);
      const rotationDelta = (angleDelta * 180) / Math.PI;
      const moveTime = window.performance.now();
      const previousMoveTime = lastMoveTimeRef.current ?? moveTime;
      const deltaSeconds = Math.max((moveTime - previousMoveTime) / 1000, 0.001);

      lastAngleRef.current = nextAngle;
      lastMoveTimeRef.current = moveTime;
      angularVelocityRef.current = clampAngularVelocity(
        angleDelta / deltaSeconds,
      );
      setSpinnerRotation((rotation) => rotation + rotationDelta);
      increaseGauge(angleDelta);
    },
    [increaseGauge],
  );

  const releaseDragging = useCallback(() => {
    lastAngleRef.current = null;
    lastMoveTimeRef.current = null;
    startInertia();
  }, [startInertia]);

  const cancelDragging = useCallback(() => {
    lastAngleRef.current = null;
    lastMoveTimeRef.current = null;
    angularVelocityRef.current = 0;
    clearInertiaFrame();
    setIsDragging(false);
    stopSpinSound();
  }, [clearInertiaFrame, stopSpinSound]);

  useEffect(
    () => () => {
      clearInertiaFrame();
      stopSpinSound();
    },
    [clearInertiaFrame, stopSpinSound],
  );

  return {
    gauge,
    handlePointerCancel: cancelDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: releaseDragging,
    isDragging,
    spinnerRotation,
    spinnerStageRef,
  };
}
