"use client";

import { useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type TeacherPose = "back" | "front" | "turning";
export type DancingBehindTeacherFailureReason = "caught" | "timeout";

const DANCE_BGM_SRC =
  "/games/dancing-behind-the-teacher/sounds/while-dancing-bgm.mp3";
const DANCE_CLEAR_BEATS = 2.5;
const FAILURE_IMAGE_DELAY_MS = 620;
const MAX_PROGRESS = 1;
const TIMEOUT_WARNING_BEAT_OFFSET = 1.35;
const TEACHER_FRONT_BEAT_RANGES = [
  [3.92, 4.42],
  [7.66, 8.22],
  [11.44, 12.4],
] as const;
const TEACHER_TURNING_BEAT_RANGES = [
  [3.02, 3.92],
  [6.76, 7.66],
  [10.54, 11.44],
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function isBeatInRanges(
  beat: number,
  ranges: readonly (readonly [number, number])[],
) {
  return ranges.some(
    ([startBeat, endBeat]) => beat >= startBeat && beat < endBeat,
  );
}

function getTeacherPose(elapsedBeats: number): TeacherPose {
  if (isBeatInRanges(elapsedBeats, TEACHER_FRONT_BEAT_RANGES)) {
    return "front";
  }

  if (isBeatInRanges(elapsedBeats, TEACHER_TURNING_BEAT_RANGES)) {
    return "turning";
  }

  return "back";
}

export function useDancingBehindTeacherGame({
  beatCount,
  beatDurationMs,
  isActive,
}: Readonly<{
  beatCount: number;
  beatDurationMs: number;
  isActive: boolean;
}>): Readonly<{
  danceProgress: number;
  failureReason: DancingBehindTeacherFailureReason | null;
  hasFailed: boolean;
  isDancing: boolean;
  teacherPose: TeacherPose;
}> {
  const animationFrameRef = useRef<number | null>(null);
  const danceBgmRef = useRef<HTMLAudioElement | null>(null);
  const clearedRef = useRef(false);
  const failedRef = useRef(false);
  const failureDispatchTimerRef = useRef<number | null>(null);
  const isSpaceDownRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const startTimestampRef = useRef<number | null>(null);
  const [danceProgress, setDanceProgress] = useState(0);
  const [failureReason, setFailureReason] =
    useState<DancingBehindTeacherFailureReason | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isDancing, setIsDancing] = useState(false);
  const [teacherPose, setTeacherPose] = useState<TeacherPose>("back");

  useEffect(() => {
    const danceBgm = new Audio(DANCE_BGM_SRC);

    danceBgm.loop = true;
    danceBgm.volume = 0.82;
    danceBgm.preload = "auto";
    danceBgmRef.current = danceBgm;

    return () => {
      danceBgm.pause();
      danceBgmRef.current = null;
    };
  }, []);

  const playDanceBgm = () => {
    const danceBgm = danceBgmRef.current;

    if (!danceBgm || !danceBgm.paused) {
      return;
    }

    danceBgm.play().catch(() => {
      // Space input unlocks audio in browsers that block autoplay.
    });
  };

  const pauseDanceBgm = () => {
    const danceBgm = danceBgmRef.current;

    if (!danceBgm) {
      return;
    }

    danceBgm.pause();
  };

  const showFailureThenDispatch = (
    reason: DancingBehindTeacherFailureReason,
  ) => {
    if (failedRef.current || clearedRef.current) {
      return;
    }

    failedRef.current = true;
    isSpaceDownRef.current = false;
    pauseDanceBgm();
    setFailureReason(reason);
    setHasFailed(true);
    setIsDancing(false);

    failureDispatchTimerRef.current = window.setTimeout(() => {
      failureDispatchTimerRef.current = null;
      dispatchFailure();
    }, FAILURE_IMAGE_DELAY_MS);
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (failureDispatchTimerRef.current !== null) {
      window.clearTimeout(failureDispatchTimerRef.current);
      failureDispatchTimerRef.current = null;
    }

    clearedRef.current = false;
    failedRef.current = false;
    isSpaceDownRef.current = false;
    lastTimestampRef.current = null;
    progressRef.current = 0;
    startTimestampRef.current = null;
    pauseDanceBgm();
    setDanceProgress(0);
    setFailureReason(null);
    setHasFailed(false);
    setIsDancing(false);
    setTeacherPose("back");
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || failedRef.current || clearedRef.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      isSpaceDownRef.current = true;
      playDanceBgm();
      setIsDancing(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      isSpaceDownRef.current = false;
      pauseDanceBgm();
      setIsDancing(false);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      isSpaceDownRef.current = false;
      pauseDanceBgm();
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const tick = (timestamp: number) => {
      if (startTimestampRef.current === null) {
        startTimestampRef.current = timestamp;
      }

      const previousTimestamp = lastTimestampRef.current ?? timestamp;
      const deltaBeats = Math.max(
        0,
        Math.min((timestamp - previousTimestamp) / beatDurationMs, 0.16),
      );
      const elapsedBeats =
        (timestamp - startTimestampRef.current) / beatDurationMs;
      const nextTeacherPose = getTeacherPose(elapsedBeats);

      lastTimestampRef.current = timestamp;
      setTeacherPose(nextTeacherPose);

      if (
        isSpaceDownRef.current &&
        nextTeacherPose === "front" &&
        !failedRef.current &&
        !clearedRef.current
      ) {
        showFailureThenDispatch("caught");
      }

      if (
        isSpaceDownRef.current &&
        nextTeacherPose === "back" &&
        !failedRef.current &&
        !clearedRef.current
      ) {
        const nextProgress = Math.min(
          MAX_PROGRESS,
          progressRef.current + deltaBeats / DANCE_CLEAR_BEATS,
        );

        progressRef.current = nextProgress;
        setDanceProgress(nextProgress);

        if (nextProgress >= MAX_PROGRESS) {
          clearedRef.current = true;
          isSpaceDownRef.current = false;
          pauseDanceBgm();
          setIsDancing(false);
          dispatchClear();
        }
      }

      if (
        elapsedBeats >= beatCount - TIMEOUT_WARNING_BEAT_OFFSET &&
        !failedRef.current &&
        !clearedRef.current
      ) {
        showFailureThenDispatch("timeout");
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
    };
  }, [beatCount, beatDurationMs, isActive]);

  useEffect(
    () => () => {
      if (failureDispatchTimerRef.current !== null) {
        window.clearTimeout(failureDispatchTimerRef.current);
      }
    },
    [],
  );

  return {
    danceProgress,
    failureReason,
    hasFailed,
    isDancing,
    teacherPose,
  };
}
