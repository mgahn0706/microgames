"use client";

import { useCallback, useEffect, useRef } from "react";

export const MICROGAME_CLEAR_EVENT = "microgame-clear";
export const MICROGAME_FAILURE_EVENT = "microgame-failure";

type UseMicrogameInputParams = Readonly<{
  isActive: boolean;
  onClear: () => void;
  onFailure: () => void;
  roundNumber: number;
}>;

export function useMicrogameInput({
  isActive,
  onClear,
  onFailure,
  roundNumber,
}: UseMicrogameInputParams) {
  const resolvedRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    resolvedRoundRef.current = null;
  }, [isActive, roundNumber]);

  const recordClearOnce = useCallback(() => {
    if (resolvedRoundRef.current === roundNumber) {
      return;
    }

    resolvedRoundRef.current = roundNumber;
    onClear();
  }, [onClear, roundNumber]);

  const recordFailureOnce = useCallback(() => {
    if (resolvedRoundRef.current === roundNumber) {
      return;
    }

    resolvedRoundRef.current = roundNumber;
    onFailure();
  }, [onFailure, roundNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const recordCustomClear = () => {
      recordClearOnce();
    };
    const recordCustomFailure = () => {
      recordFailureOnce();
    };

    window.addEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);
    window.addEventListener(MICROGAME_FAILURE_EVENT, recordCustomFailure);

    return () => {
      window.removeEventListener(MICROGAME_CLEAR_EVENT, recordCustomClear);
      window.removeEventListener(MICROGAME_FAILURE_EVENT, recordCustomFailure);
    };
  }, [isActive, recordClearOnce, recordFailureOnce]);
}
