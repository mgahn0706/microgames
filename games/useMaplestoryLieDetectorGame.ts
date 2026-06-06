"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const MAPLESTORY_LIE_DETECTOR_OPTIONS = [
  {
    answer: "루팡주황버섯",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%85%E1%85%AE%E1%84%91%E1%85%A1%E1%86%BC%E1%84%8C%E1%85%AE%E1%84%92%E1%85%AA%E1%86%BC%E1%84%87%E1%85%A5%E1%84%89%E1%85%A5%E1%86%BA.png",
  },
  {
    answer: "리본돼지옥토퍼스",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%85%E1%85%B5%E1%84%87%E1%85%A9%E1%86%AB%E1%84%83%E1%85%AB%E1%84%8C%E1%85%B5%E1%84%8B%E1%85%A9%E1%86%A8%E1%84%90%E1%85%A9%E1%84%91%E1%85%A5%E1%84%89%E1%85%B3.png",
  },
  {
    answer: "빨간달팽이슬라임",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%88%E1%85%A1%E1%86%AF%E1%84%80%E1%85%A1%E1%86%AB%E1%84%83%E1%85%A1%E1%86%AF%E1%84%91%E1%85%A2%E1%86%BC%E1%84%8B%E1%85%B5%E1%84%89%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%B7.png",
  },
  {
    answer: "뿔버섯페어리루팡",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%88%E1%85%AE%E1%86%AF%E1%84%87%E1%85%A5%E1%84%89%E1%85%A5%E1%86%BA%E1%84%91%E1%85%A6%E1%84%8B%E1%85%A5%E1%84%85%E1%85%B5%E1%84%85%E1%85%AE%E1%84%91%E1%85%A1%E1%86%BC.png",
  },
  {
    answer: "슬라임스텀프",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%89%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%B7%E1%84%89%E1%85%B3%E1%84%90%E1%85%A5%E1%86%B7%E1%84%91%E1%85%B3.png",
  },
  {
    answer: "초록버섯이블아이",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%8E%E1%85%A9%E1%84%85%E1%85%A9%E1%86%A8%E1%84%87%E1%85%A5%E1%84%89%E1%85%A5%E1%86%BA%E1%84%8B%E1%85%B5%E1%84%87%E1%85%B3%E1%86%AF%E1%84%8B%E1%85%A1%E1%84%8B%E1%85%B5.png",
  },
  {
    answer: "파란달팽이슬라임",
    imageSrc:
      "/games/maplestory-lie-detector/images/%E1%84%91%E1%85%A1%E1%84%85%E1%85%A1%E1%86%AB%E1%84%83%E1%85%A1%E1%86%AF%E1%84%91%E1%85%A2%E1%86%BC%E1%84%8B%E1%85%B5%E1%84%89%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%B7.png",
  },
] as const;

type LieDetectorOption = (typeof MAPLESTORY_LIE_DETECTOR_OPTIONS)[number];

type LieDetectorInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createTargetOption() {
  return MAPLESTORY_LIE_DETECTOR_OPTIONS[
    Math.floor(Math.random() * MAPLESTORY_LIE_DETECTOR_OPTIONS.length)
  ];
}

function normalizeLieDetectorInput(value: string) {
  return value.normalize("NFC").replaceAll(/[^\uAC00-\uD7A3]/g, "");
}

export function useMaplestoryLieDetectorGame(): Readonly<{
  inputHandlers: LieDetectorInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
  targetOption: LieDetectorOption;
  typedValue: string;
}> {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const [targetOption] = useState(createTargetOption);
  const [typedValue, setTypedValue] = useState("");

  const updateTypedValue = (value: string) => {
    const nextTypedValue = normalizeLieDetectorInput(value);

    setTypedValue(nextTypedValue);

    if (
      hasClearedRef.current ||
      nextTypedValue !== targetOption.answer.normalize("NFC")
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
  } satisfies LieDetectorInputHandlers;

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

  return {
    inputHandlers,
    inputRef,
    targetOption,
    typedValue,
  };
}
