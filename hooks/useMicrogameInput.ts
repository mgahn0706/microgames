"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Microgame } from "@/data/microgames";
import { isMicrogameClearKey } from "@/data/microgames";

type UseMicrogameInputParams = Readonly<{
  isActive: boolean;
  microgame: Microgame;
  onClear: () => void;
  roundNumber: number;
}>;

export function useMicrogameInput({
  isActive,
  microgame,
  onClear,
  roundNumber,
}: UseMicrogameInputParams) {
  const clearedRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    clearedRoundRef.current = null;
  }, [isActive, roundNumber]);

  const recordClearOnce = useCallback(() => {
    if (clearedRoundRef.current === roundNumber) {
      return;
    }

    clearedRoundRef.current = roundNumber;
    onClear();
  }, [onClear, roundNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const recordKeyboardClear = (event: KeyboardEvent) => {
      if (!isMicrogameClearKey(microgame.control, event)) {
        return;
      }

      event.preventDefault();
      recordClearOnce();
    };
    const recordPointerClear = () => {
      if (microgame.control === "mouseClick") {
        recordClearOnce();
      }
    };
    const recordWheelClear = (event: WheelEvent) => {
      if (microgame.control !== "scroll") {
        return;
      }

      event.preventDefault();
      recordClearOnce();
    };

    window.addEventListener("keydown", recordKeyboardClear);
    window.addEventListener("pointerdown", recordPointerClear);
    window.addEventListener("wheel", recordWheelClear, { passive: false });

    return () => {
      window.removeEventListener("keydown", recordKeyboardClear);
      window.removeEventListener("pointerdown", recordPointerClear);
      window.removeEventListener("wheel", recordWheelClear);
    };
  }, [isActive, microgame.control, recordClearOnce]);
}
