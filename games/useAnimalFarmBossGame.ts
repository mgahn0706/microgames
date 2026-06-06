"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const STAGE_ADVANCE_DELAY_MS = 420;
const EASY_WORDS = ["바나나", "네이버", "토마토", "기러기", "우유", "나무"];
const MEDIUM_WORDS = [
  "프론트엔드",
  "아르마딜로",
  "서울대학교",
  "캥거루농장",
  "엘리베이터",
];
const HARD_WORDS = [
  "서울대학교전기정보공학부",
  "쥬니어네이버동물농장",
  "샤르릉뿌뿡뿍짝뿍짝",
  "와플스튜디오개발자",
];

type BossStage = Readonly<{
  levelLabel: string;
  target: string;
}>;

type AnimalFarmInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function pickRandomWord(words: readonly string[]) {
  return words[Math.floor(Math.random() * words.length)];
}

function createBossStages() {
  return [
    {
      levelLabel: "LEVEL 1",
      target: pickRandomWord(EASY_WORDS),
    },
    {
      levelLabel: "LEVEL 2",
      target: pickRandomWord(MEDIUM_WORDS),
    },
    {
      levelLabel: "LEVEL 3",
      target: pickRandomWord(HARD_WORDS),
    },
  ] satisfies BossStage[];
}

function reverseText(value: string) {
  return Array.from(value).reverse().join("");
}

function sanitizeReverseTypingInput(value: string) {
  return value.replaceAll(/[^\uAC00-\uD7A3\s]/g, "");
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

export function useAnimalFarmBossGame(): Readonly<{
  answer: string;
  currentStage: BossStage;
  currentStageIndex: number;
  inputHandlers: AnimalFarmInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
  isAdvancingStage: boolean;
  stageCount: number;
  typedValue: string;
}> {
  const advanceTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const [stages] = useState(createBossStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const currentStage = stages[currentStageIndex];
  const answer = useMemo(
    () => reverseText(currentStage.target),
    [currentStage],
  );

  const updateTypedValue = (value: string) => {
    if (isAdvancingStage) {
      return;
    }

    const nextTypedValue = sanitizeReverseTypingInput(value);
    const input = inputRef.current;

    setTypedValue(nextTypedValue);

    if (nextTypedValue !== answer || hasClearedRef.current) {
      return;
    }

    if (currentStageIndex === stages.length - 1) {
      hasClearedRef.current = true;
      inputRef.current?.blur();
      dispatchClear();
      return;
    }

    setTypedValue("");
    setIsAdvancingStage(true);

    if (input) {
      input.value = "";
      input.blur();
    }

    advanceTimerRef.current = window.setTimeout(() => {
      setCurrentStageIndex((nextStageIndex) => nextStageIndex + 1);
      setIsAdvancingStage(false);
    }, STAGE_ADVANCE_DELAY_MS);
  };
  const syncTypedValueFromInput = () => {
    const input = inputRef.current;

    if (input) {
      updateTypedValue(input.value);
    }
  };

  const inputHandlers = {
    onChange: (event) => {
      if (isComposingRef.current || isAdvancingStage) {
        return;
      }

      updateTypedValue(event.currentTarget.value);
    },
    onCompositionEnd: () => {
      isComposingRef.current = false;
      window.requestAnimationFrame(syncTypedValueFromInput);
    },
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
  } satisfies AnimalFarmInputHandlers;

  useEffect(() => {
    if (!isAdvancingStage) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [currentStageIndex, isAdvancingStage]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  return {
    answer,
    currentStage,
    currentStageIndex,
    inputHandlers,
    inputRef,
    isAdvancingStage,
    stageCount: stages.length,
    typedValue,
  };
}
