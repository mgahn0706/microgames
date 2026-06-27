"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { convertEnglishKeyboardInputToKorean } from "@/lib/hangulInput";

const CROSSWORD_CASES = [
  {
    horizontal: "안하무인",
    horizontalIndex: 2,
    vertical: "유비무환",
    verticalIndex: 2,
  },
  {
    horizontal: "고진감래",
    horizontalIndex: 0,
    vertical: "동고동락",
    verticalIndex: 1,
  },
  {
    horizontal: "청출어람",
    horizontalIndex: 2,
    vertical: "어부지리",
    verticalIndex: 0,
  },
  {
    horizontal: "일석이조",
    horizontalIndex: 2,
    vertical: "이심전심",
    verticalIndex: 0,
  },
  {
    horizontal: "대기만성",
    horizontalIndex: 2,
    vertical: "만수무강",
    verticalIndex: 0,
  },
  {
    horizontal: "유유상종",
    horizontalIndex: 2,
    vertical: "상부상조",
    verticalIndex: 0,
  },
  {
    horizontal: "사면초가",
    horizontalIndex: 2,
    vertical: "초지일관",
    verticalIndex: 0,
  },
  {
    horizontal: "인과응보",
    horizontalIndex: 1,
    vertical: "과유불급",
    verticalIndex: 0,
  },
  {
    horizontal: "자업자득",
    horizontalIndex: 0,
    vertical: "자승자박",
    verticalIndex: 0,
  },
  {
    horizontal: "풍전등화",
    horizontalIndex: 1,
    vertical: "전전긍긍",
    verticalIndex: 0,
  },
] as const;

type CrosswordCase = (typeof CROSSWORD_CASES)[number];
type CrosswordCell = Readonly<{
  character: string;
  isAnswer: boolean;
  isFilled: boolean;
}>;
type CrosswordInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createTargetCase() {
  return CROSSWORD_CASES[
    Math.floor(Math.random() * CROSSWORD_CASES.length)
  ];
}

function normalizeCrosswordInput(value: string) {
  const normalizedValue = value.normalize("NFC");
  const convertedValue = convertEnglishKeyboardInputToKorean(normalizedValue);
  const hangulSyllables = convertedValue.match(/[\uAC00-\uD7A3]/g);

  return hangulSyllables?.at(-1) ?? "";
}

function getAnswer(targetCase: CrosswordCase) {
  return targetCase.horizontal[targetCase.horizontalIndex];
}

function createGrid(targetCase: CrosswordCase) {
  const grid = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ({
      character: "",
      isAnswer: false,
      isFilled: false,
    })),
  );
  const answerRow = targetCase.verticalIndex;
  const answerColumn = targetCase.horizontalIndex;

  Array.from(targetCase.horizontal).forEach((character, column) => {
    grid[answerRow][column] = {
      character,
      isAnswer: column === answerColumn,
      isFilled: true,
    };
  });
  Array.from(targetCase.vertical).forEach((character, row) => {
    grid[row][answerColumn] = {
      character,
      isAnswer: row === answerRow,
      isFilled: true,
    };
  });

  return grid satisfies CrosswordCell[][];
}

function maskWord(word: string, answerIndex: number) {
  return Array.from(word)
    .map((character, index) => (index === answerIndex ? "□" : character))
    .join("");
}

function clearInput(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  input.value = "";
}

export function useCrosswordGame(): Readonly<{
  answer: string;
  grid: readonly (readonly CrosswordCell[])[];
  horizontalClue: string;
  inputHandlers: CrosswordInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
  isMistake: boolean;
  verticalClue: string;
}> {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const mistakeTimerRef = useRef<number | null>(null);
  const [targetCase] = useState(createTargetCase);
  const [isMistake, setIsMistake] = useState(false);
  const answer = getAnswer(targetCase);
  const grid = useMemo(() => createGrid(targetCase), [targetCase]);

  const clearMistakeTimer = () => {
    if (mistakeTimerRef.current === null) {
      return;
    }

    window.clearTimeout(mistakeTimerRef.current);
    mistakeTimerRef.current = null;
  };

  const showMistake = () => {
    clearMistakeTimer();
    setIsMistake(true);
    mistakeTimerRef.current = window.setTimeout(() => {
      setIsMistake(false);
      mistakeTimerRef.current = null;
    }, 220);
  };

  const updateTypedValue = (value: string) => {
    if (hasClearedRef.current) {
      return;
    }

    const typedCharacter = normalizeCrosswordInput(value);

    if (!typedCharacter) {
      return;
    }

    if (typedCharacter !== answer) {
      showMistake();
      clearInput(inputRef.current);
      return;
    }

    hasClearedRef.current = true;
    clearMistakeTimer();
    setIsMistake(false);
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
  } satisfies CrosswordInputHandlers;

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
      clearMistakeTimer();
      window.removeEventListener("pointerdown", focusInput);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return {
    answer,
    grid,
    horizontalClue: maskWord(targetCase.horizontal, targetCase.horizontalIndex),
    inputHandlers,
    inputRef,
    isMistake,
    verticalClue: maskWord(targetCase.vertical, targetCase.verticalIndex),
  };
}
