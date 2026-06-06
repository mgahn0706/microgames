"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type BearNumber = 1 | 2 | 3;

type GamePlan = Readonly<{
  answer: BearNumber;
  sequence: readonly (readonly BearNumber[])[];
}>;

const BEAR_EAT_SOUND_SRC = "/games/minigame-ex/sounds/bear-eat-meat.mp3";
const DEFAULT_BEAT_DURATION_MS = 500;
const EATING_EVENT_COUNT = 4;
const EATING_PHASE_BEATS = 8;
const EATING_START_OFFSET_BEATS = 0.75;
const EATING_STEP_BEATS = EATING_PHASE_BEATS / EATING_EVENT_COUNT;
const EATING_VISIBLE_BEATS = 1.05;
const BEAR_NUMBERS = [1, 2, 3] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getBeatDurationMs(element: HTMLElement | null) {
  if (!element) {
    return DEFAULT_BEAT_DURATION_MS;
  }

  const rawDuration = window
    .getComputedStyle(element)
    .getPropertyValue("--game-rhythm-duration")
    .trim();
  const parsedDuration = Number.parseFloat(rawDuration);

  return Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : DEFAULT_BEAT_DURATION_MS;
}

function playEatSound() {
  const audio = new Audio(BEAR_EAT_SOUND_SRC);

  audio.volume = 0.88;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

function shuffleItems<T>(items: readonly T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = nextItems[index];
    const swapItem = nextItems[swapIndex];

    nextItems[index] = swapItem;
    nextItems[swapIndex] = currentItem;
  }

  return nextItems;
}

function getRandomBearNumber() {
  const bearNumber =
    BEAR_NUMBERS[Math.floor(Math.random() * BEAR_NUMBERS.length)];

  if (!bearNumber) {
    throw new Error("Missing bear number.");
  }

  return bearNumber;
}

function createGamePlan() {
  const answer = getRandomBearNumber();
  const otherBears = BEAR_NUMBERS.filter((bearNumber) => bearNumber !== answer);
  const firstOtherBear = otherBears[0];
  const secondOtherBear = otherBears[1];

  if (!firstOtherBear || !secondOtherBear) {
    throw new Error("Missing non-answer bear.");
  }

  const plans = [
    [
      [answer, firstOtherBear],
      [answer],
      [secondOtherBear],
      [answer, firstOtherBear],
    ],
    [
      [answer, secondOtherBear],
      [firstOtherBear],
      [answer],
      [answer, secondOtherBear],
    ],
    [
      [answer],
      [firstOtherBear, secondOtherBear],
      [answer, firstOtherBear],
      [answer],
    ],
    [
      [answer, firstOtherBear, secondOtherBear],
      [answer],
      [firstOtherBear],
      [answer],
    ],
  ] satisfies readonly (readonly (readonly BearNumber[])[])[];
  const sequence = plans[Math.floor(Math.random() * plans.length)];

  if (!sequence) {
    throw new Error("Missing eating sequence.");
  }

  const counts = BEAR_NUMBERS.map((bearNumber) => ({
    bearNumber,
    count: sequence.filter((bearNumbers) => bearNumbers.includes(bearNumber))
      .length,
  }));
  const answerCount =
    counts.find(({ bearNumber }) => bearNumber === answer)?.count ?? 0;
  const hasUniqueTopCount = counts.every(
    ({ bearNumber, count }) => bearNumber === answer || count < answerCount,
  );

  if (!hasUniqueTopCount) {
    throw new Error("Minigame EX must have one most-fed bear.");
  }

  return {
    answer,
    sequence: shuffleItems(sequence),
  } satisfies GamePlan;
}

function parseBearNumberKey(event: KeyboardEvent) {
  if (/^[1-3]$/.test(event.key)) {
    return Number(event.key) as BearNumber;
  }

  if (/^Numpad[1-3]$/.test(event.code)) {
    return Number(event.code.replace("Numpad", "")) as BearNumber;
  }

  return null;
}

export function useMinigameExGame(): Readonly<{
  activeEatingBears: readonly BearNumber[];
  chooseBear: (bearNumber: BearNumber) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  hasFailed: boolean;
  isChoosing: boolean;
  wrongBear: BearNumber | null;
}> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasResolvedRef = useRef(false);
  const wrongFeedbackTimerRef = useRef<number | null>(null);
  const [activeEatingBears, setActiveEatingBears] = useState<
    readonly BearNumber[]
  >([]);
  const [gamePlan] = useState(createGamePlan);
  const [hasFailed, setHasFailed] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [wrongBear, setWrongBear] = useState<BearNumber | null>(null);

  const chooseBear = useCallback(
    (bearNumber: BearNumber) => {
      if (!isChoosing || hasResolvedRef.current) {
        return;
      }

      hasResolvedRef.current = true;

      if (bearNumber === gamePlan.answer) {
        dispatchClear();
        return;
      }

      if (wrongFeedbackTimerRef.current !== null) {
        window.clearTimeout(wrongFeedbackTimerRef.current);
      }

      setHasFailed(true);
      setWrongBear(bearNumber);
      wrongFeedbackTimerRef.current = window.setTimeout(() => {
        setWrongBear((currentBearNumber) =>
          currentBearNumber === bearNumber ? null : currentBearNumber,
        );
        wrongFeedbackTimerRef.current = null;
      }, 220);
    },
    [gamePlan.answer, isChoosing],
  );

  useEffect(() => {
    const beatDurationMs = getBeatDurationMs(containerRef.current);
    const timers = gamePlan.sequence.flatMap((bearNumbers, index) => {
      const startTimer = window.setTimeout(
        () => {
          setActiveEatingBears(bearNumbers);
          playEatSound();
        },
        (index * EATING_STEP_BEATS + EATING_START_OFFSET_BEATS) *
          beatDurationMs,
      );
      const stopTimer = window.setTimeout(
        () => {
          setActiveEatingBears([]);
        },
        (index * EATING_STEP_BEATS +
          EATING_START_OFFSET_BEATS +
          EATING_VISIBLE_BEATS) *
          beatDurationMs,
      );

      return [startTimer, stopTimer];
    });
    const chooseTimer = window.setTimeout(() => {
      setActiveEatingBears([]);
      setIsChoosing(true);
    }, EATING_PHASE_BEATS * beatDurationMs);

    return () => {
      [...timers, chooseTimer].forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [gamePlan.sequence]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const bearNumber = parseBearNumberKey(event);

      if (!bearNumber) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      chooseBear(bearNumber);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [chooseBear]);

  useEffect(
    () => () => {
      if (wrongFeedbackTimerRef.current !== null) {
        window.clearTimeout(wrongFeedbackTimerRef.current);
      }
    },
    [],
  );

  return {
    activeEatingBears,
    chooseBear,
    containerRef,
    hasFailed,
    isChoosing,
    wrongBear,
  };
}
