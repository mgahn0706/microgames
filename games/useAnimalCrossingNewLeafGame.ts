"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const TARGET_SENTENCES = [
  "다신 안 그럴게요",
  "다시 태어날게요",
  "잘못했어요",
] as const;

type AnimalCrossingInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createTargetSentence() {
  return TARGET_SENTENCES[
    Math.floor(Math.random() * TARGET_SENTENCES.length)
  ] ?? TARGET_SENTENCES[0];
}

function sanitizeAnimalCrossingInput(value: string) {
  return value.normalize("NFC").replaceAll(/[^\uAC00-\uD7A3\s]/g, "");
}

function playTypeSound() {
  bgmLibrary
    .playSoundEffect("animalCrossingNewLeafType")
    .catch((error: unknown) => {
      console.error(error);
    });
}

export function useAnimalCrossingNewLeafGame(): Readonly<{
  inputHandlers: AnimalCrossingInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
  targetSentence: string;
}> {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const lastInputValueRef = useRef("");
  const [targetSentence] = useState(createTargetSentence);

  const updateTypedValue = (value: string) => {
    const nextTypedValue = sanitizeAnimalCrossingInput(value).slice(
      0,
      targetSentence.length,
    );
    const input = inputRef.current;

    if (input && input.value !== nextTypedValue) {
      input.value = nextTypedValue;
    }

    if (lastInputValueRef.current !== nextTypedValue) {
      playTypeSound();
      lastInputValueRef.current = nextTypedValue;
    }

    if (
      hasClearedRef.current ||
      nextTypedValue !== targetSentence.normalize("NFC")
    ) {
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
  } satisfies AnimalCrossingInputHandlers;

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

      if (
        event.key === "Backspace" ||
        event.key === " " ||
        event.key.length === 1
      ) {
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

  return {
    inputHandlers,
    inputRef,
    targetSentence,
  };
}
