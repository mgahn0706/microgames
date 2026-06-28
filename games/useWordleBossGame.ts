"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export const WORD_LENGTH = 5;
export const WORDLE_MAX_GUESSES = 6;
export const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
] as const;

export type LetterEvaluation = "absent" | "correct" | "present";

type SubmittedGuess = Readonly<{
  evaluations: readonly LetterEvaluation[];
  letters: readonly string[];
  word: string;
}>;

const WORD_POOL = [
  "APPLE",
  "BRAIN",
  "BRAVE",
  "CHAIR",
  "CHESS",
  "CLOUD",
  "DANCE",
  "DREAM",
  "EARTH",
  "FAITH",
  "FIELD",
  "FLAME",
  "FLOOR",
  "FRUIT",
  "GHOST",
  "GRAPE",
  "HEART",
  "HOUSE",
  "LIGHT",
  "MAGIC",
  "MONEY",
  "MOUSE",
  "MUSIC",
  "NIGHT",
  "OCEAN",
  "PARTY",
  "PIANO",
  "PLANT",
  "POWER",
  "QUEEN",
  "RIVER",
  "ROBOT",
  "SHAPE",
  "SLEEP",
  "SMILE",
  "SNAKE",
  "SOUND",
  "SPACE",
  "SPEED",
  "STAGE",
  "STORM",
  "SUGAR",
  "TABLE",
  "TIMER",
  "TRAIN",
  "WATER",
  "WORLD",
  "ZEBRA",
] as const;

const KEY_CODE_TO_LETTER = Object.fromEntries(
  Array.from({ length: 26 }, (_, index) => {
    const letter = String.fromCharCode("A".charCodeAt(0) + index);

    return [`Key${letter}`, letter];
  }),
) as Record<string, string>;
const EVALUATION_RANK = {
  absent: 0,
  present: 1,
  correct: 2,
} satisfies Record<LetterEvaluation, number>;
const MESSAGE_DURATION_MS = 620;
const RESET_DELAY_MS = 820;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function pickTargetWord(previousWord?: string) {
  const candidates = WORD_POOL.filter((word) => word !== previousWord);

  return candidates[Math.floor(Math.random() * candidates.length)] ?? WORD_POOL[0];
}

function evaluateGuess(guess: string, target: string) {
  const guessLetters = guess.split("");
  const targetLetters = target.split("");
  const evaluations: LetterEvaluation[] = Array.from(
    { length: WORD_LENGTH },
    () => "absent",
  );
  const remainingTargetCounts = new Map<string, number>();

  guessLetters.forEach((letter, index) => {
    if (letter === targetLetters[index]) {
      evaluations[index] = "correct";
      return;
    }

    const targetLetter = targetLetters[index];

    remainingTargetCounts.set(
      targetLetter,
      (remainingTargetCounts.get(targetLetter) ?? 0) + 1,
    );
  });

  guessLetters.forEach((letter, index) => {
    if (evaluations[index] === "correct") {
      return;
    }

    const remainingCount = remainingTargetCounts.get(letter) ?? 0;

    if (remainingCount <= 0) {
      return;
    }

    evaluations[index] = "present";
    remainingTargetCounts.set(letter, remainingCount - 1);
  });

  return evaluations;
}

function getKeyboardEvaluations(guesses: readonly SubmittedGuess[]) {
  return guesses.reduce<Record<string, LetterEvaluation>>(
    (evaluationsByKey, guess) => {
      guess.letters.forEach((letter, index) => {
        const nextEvaluation = guess.evaluations[index];
        const currentEvaluation = evaluationsByKey[letter];

        if (
          !currentEvaluation ||
          EVALUATION_RANK[nextEvaluation] > EVALUATION_RANK[currentEvaluation]
        ) {
          evaluationsByKey[letter] = nextEvaluation;
        }
      });

      return evaluationsByKey;
    },
    {},
  );
}

function getKeyboardLetter(event: KeyboardEvent) {
  const physicalLetter = KEY_CODE_TO_LETTER[event.code];

  if (physicalLetter) {
    return physicalLetter;
  }

  if (/^[a-z]$/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  return null;
}

export function useWordleBossGame(): Readonly<{
  currentGuess: string;
  guesses: readonly SubmittedGuess[];
  keyEvaluations: Readonly<Record<string, LetterEvaluation>>;
  message: string;
  submitGuess: () => void;
  typeBackspace: () => void;
  typeLetter: (letter: string) => void;
}> {
  const hasClearedRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<readonly SubmittedGuess[]>([]);
  const [message, setMessage] = useState("");
  const [targetWord, setTargetWord] = useState(pickTargetWord);
  const keyEvaluations = useMemo(() => getKeyboardEvaluations(guesses), [guesses]);

  const clearMessageTimer = useCallback(() => {
    if (messageTimerRef.current === null) {
      return;
    }

    window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = null;
  }, []);

  const showMessage = useCallback(
    (nextMessage: string) => {
      clearMessageTimer();
      setMessage(nextMessage);
      messageTimerRef.current = window.setTimeout(() => {
        setMessage("");
        messageTimerRef.current = null;
      }, MESSAGE_DURATION_MS);
    },
    [clearMessageTimer],
  );

  const resetBoard = useCallback((previousTargetWord: string) => {
    setCurrentGuess("");
    setGuesses([]);
    setTargetWord(pickTargetWord(previousTargetWord));
    setMessage("New word");
  }, []);

  const submitGuess = useCallback(() => {
    if (hasClearedRef.current || resetTimerRef.current !== null) {
      return;
    }

    if (currentGuess.length < WORD_LENGTH) {
      showMessage("Not enough letters");
      return;
    }

    const nextSubmittedGuess = {
      evaluations: evaluateGuess(currentGuess, targetWord),
      letters: currentGuess.split(""),
      word: currentGuess,
    } satisfies SubmittedGuess;
    const nextGuesses = [...guesses, nextSubmittedGuess];

    setGuesses(nextGuesses);
    setCurrentGuess("");

    if (currentGuess === targetWord) {
      hasClearedRef.current = true;
      dispatchClear();
      return;
    }

    if (nextGuesses.length < WORDLE_MAX_GUESSES) {
      return;
    }

    showMessage("New word");
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      resetBoard(targetWord);
    }, RESET_DELAY_MS);
  }, [currentGuess, guesses, resetBoard, showMessage, targetWord]);

  const typeLetter = useCallback((letter: string) => {
    if (hasClearedRef.current || resetTimerRef.current !== null) {
      return;
    }

    if (!/^[A-Z]$/.test(letter)) {
      return;
    }

    setCurrentGuess((guess) =>
      guess.length >= WORD_LENGTH ? guess : `${guess}${letter}`,
    );
  }, []);

  const typeBackspace = useCallback(() => {
    if (hasClearedRef.current || resetTimerRef.current !== null) {
      return;
    }

    setCurrentGuess((guess) => guess.slice(0, -1));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        typeBackspace();
        return;
      }

      const letter = getKeyboardLetter(event);

      if (!letter) {
        return;
      }

      event.preventDefault();
      typeLetter(letter);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [submitGuess, typeBackspace, typeLetter]);

  useEffect(
    () => () => {
      clearMessageTimer();

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [clearMessageTimer],
  );

  return {
    currentGuess,
    guesses,
    keyEvaluations,
    message,
    submitGuess,
    typeBackspace,
    typeLetter,
  };
}
