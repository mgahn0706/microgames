"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { convertEnglishKeyboardInputToKorean } from "@/lib/hangulInput";

const HANCOM_WORD_POOL = [
  "나무",
  "인형",
  "사랑",
  "하늘",
  "바다",
  "구름",
  "학교",
  "친구",
  "우산",
  "기차",
  "마음",
  "별빛",
] as const;

type FallingWord = Readonly<{
  id: string;
  isCompleted: boolean;
  leftPercent: number;
  text: string;
  topPercent: number;
}>;

type HancomInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createTargetWords() {
  const firstIndex = Math.floor(Math.random() * HANCOM_WORD_POOL.length);
  const secondIndex =
    (firstIndex +
      1 +
      Math.floor(Math.random() * (HANCOM_WORD_POOL.length - 1))) %
    HANCOM_WORD_POOL.length;

  return [HANCOM_WORD_POOL[firstIndex], HANCOM_WORD_POOL[secondIndex]] as const;
}

function normalizeHancomInput(value: string) {
  const sanitizedValue = value
    .normalize("NFC")
    .replaceAll(/[^A-Za-z\uAC00-\uD7A3]/g, "");

  return convertEnglishKeyboardInputToKorean(sanitizedValue)
    .normalize("NFC")
    .replaceAll(/[^\uAC00-\uD7A3]/g, "");
}

function resolveTypedProgress(
  value: string,
  targetWords: readonly string[],
  completedWords: readonly string[],
): Readonly<{ completedWords: readonly string[]; remainingValue: string }> {
  const targetWord = targetWords
    .filter((word) => !completedWords.includes(word))
    .find((word) => value.startsWith(word));

  if (!targetWord) {
    return { completedWords, remainingValue: value };
  }

  return resolveTypedProgress(
    value.slice(targetWord.length),
    targetWords,
    [...completedWords, targetWord],
  );
}

function clearInput(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  input.value = "";
  input.setSelectionRange(0, 0);
}

export function useHancomTypingGame(): Readonly<{
  completedCount: number;
  fallingWords: readonly FallingWord[];
  inputHandlers: HancomInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
}> {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const [targetWords] = useState(createTargetWords);
  const [completedWords, setCompletedWords] = useState<readonly string[]>([]);
  const [fallStep, setFallStep] = useState(0);

  const updateTypedValue = (value: string) => {
    if (hasClearedRef.current) {
      return;
    }

    const normalizedValue = normalizeHancomInput(value);
    const nextProgress = resolveTypedProgress(
      normalizedValue,
      targetWords,
      completedWords,
    );
    const hasCompletedWord =
      nextProgress.completedWords.length > completedWords.length;
    const nextInputValue = hasCompletedWord ? "" : nextProgress.remainingValue;

    if (inputRef.current && inputRef.current.value !== nextInputValue) {
      inputRef.current.value = nextInputValue;
    }

    if (nextProgress.completedWords.length === completedWords.length) {
      return;
    }

    const completedInput = inputRef.current;

    setCompletedWords(nextProgress.completedWords);
    clearInput(completedInput);
    window.requestAnimationFrame(() => {
      clearInput(completedInput);
    });

    if (nextProgress.completedWords.length < targetWords.length) {
      return;
    }

    hasClearedRef.current = true;
    inputRef.current?.blur();
    dispatchClear();
  };

  const syncTypedValueFromInput = () => {
    const input = inputRef.current;

    if (input) {
      updateTypedValue(input.value);
    }
  };

  const inputHandlers = {
    onChange: (event) => {
      if (isComposingRef.current) {
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
  } satisfies HancomInputHandlers;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFallStep((currentStep) => Math.min(currentStep + 1, 10));
    }, RHYTHM_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const focusInput = () => {
      if (!hasClearedRef.current) {
        inputRef.current?.focus({ preventScroll: true });
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Backspace" || event.key.length === 1) {
        focusInput();
      }
    };

    focusInput();
    window.addEventListener("pointerdown", focusInput);
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", focusInput);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!hasClearedRef.current) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [completedWords.length]);

  const fallingWords = targetWords.map((word, index) => ({
    id: `${word}-${index}`,
    isCompleted: completedWords.includes(word),
    leftPercent: index === 0 ? 26 : 50,
    text: word,
    topPercent: 20 + Math.min(fallStep + index * 2, 10) * 5.4,
  }));

  return {
    completedCount: completedWords.length,
    fallingWords,
    inputHandlers,
    inputRef,
  };
}
