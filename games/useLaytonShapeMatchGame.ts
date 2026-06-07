"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

type LaytonAnswer = 1 | 2 | 3 | 4;

type LaytonPuzzle = Readonly<{
  answer: LaytonAnswer;
  src: string;
}>;

const ANSWER_WORD_VALUES = {
  four: 4,
  one: 1,
  three: 3,
  two: 2,
} satisfies Record<string, LaytonAnswer>;

const LAYTON_PUZZLE_PATHS = [
  "/games/layton/images/four-A.png",
  "/games/layton/images/four-B.png",
  "/games/layton/images/one-A.png",
  "/games/layton/images/one-B.png",
  "/games/layton/images/three-A.png",
  "/games/layton/images/three-B.png",
  "/games/layton/images/two-A.png",
  "/games/layton/images/two-B.png",
] as const;

function isAnswerWord(value: string): value is keyof typeof ANSWER_WORD_VALUES {
  return value in ANSWER_WORD_VALUES;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getAnswerFromPath(src: string) {
  const fileName = src.split("/").at(-1) ?? "";
  const answerWord = fileName.split("-")[0];

  if (!isAnswerWord(answerWord)) {
    return undefined;
  }

  return ANSWER_WORD_VALUES[answerWord];
}

function getRandomPuzzle() {
  const src =
    LAYTON_PUZZLE_PATHS[Math.floor(Math.random() * LAYTON_PUZZLE_PATHS.length)];
  const answer = getAnswerFromPath(src);

  if (!answer) {
    throw new Error(`Invalid Layton puzzle filename: ${src}`);
  }

  return { answer, src } satisfies LaytonPuzzle;
}

export function useLaytonShapeMatchGame(): Readonly<{
  chooseAnswer: (answer: LaytonAnswer) => void;
  hasFailed: boolean;
  lastWrongAnswer: LaytonAnswer | null;
  puzzle: LaytonPuzzle;
}> {
  const hasClearedRef = useRef(false);
  const hasFailedRef = useRef(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [lastWrongAnswer, setLastWrongAnswer] = useState<LaytonAnswer | null>(
    null,
  );
  const [puzzle] = useState(getRandomPuzzle);

  const chooseAnswer = useCallback(
    (answer: LaytonAnswer) => {
      if (hasClearedRef.current || hasFailedRef.current) {
        return;
      }

      if (answer === puzzle.answer) {
        hasClearedRef.current = true;
        dispatchClear();
        return;
      }

      hasFailedRef.current = true;
      setLastWrongAnswer(answer);
      setHasFailed(true);
    },
    [puzzle.answer],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!/^[1-4]$/.test(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      chooseAnswer(Number(event.key) as LaytonAnswer);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [chooseAnswer]);

  return {
    chooseAnswer,
    hasFailed,
    lastWrongAnswer,
    puzzle,
  };
}
