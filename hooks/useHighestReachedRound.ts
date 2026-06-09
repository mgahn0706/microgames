"use client";

import { useCallback, useState } from "react";

const HIGHEST_REACHED_ROUND_STORAGE_KEY = "catTower.highestReachedRound";
const LEGACY_HIGHEST_CLEARED_ROUND_STORAGE_KEY = "catTower.highestClearedRound";

function readStoredRound(storageKey: string) {
  const storedValue = window.localStorage.getItem(storageKey);
  const parsedValue = Number.parseInt(storedValue ?? "0", 10);

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0;
}

function readHighestReachedRound() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Math.max(
    readStoredRound(HIGHEST_REACHED_ROUND_STORAGE_KEY),
    readStoredRound(LEGACY_HIGHEST_CLEARED_ROUND_STORAGE_KEY),
  );
}

function writeHighestReachedRound(highestReachedRound: number) {
  window.localStorage.setItem(
    HIGHEST_REACHED_ROUND_STORAGE_KEY,
    highestReachedRound.toString(),
  );
}

export function useHighestReachedRound() {
  const [highestReachedRound, setHighestReachedRound] = useState(
    readHighestReachedRound,
  );

  const recordHighestReachedRound = useCallback((reachedRound: number) => {
    setHighestReachedRound((currentHighestReachedRound) => {
      const nextHighestReachedRound = Math.max(
        currentHighestReachedRound,
        reachedRound,
      );

      writeHighestReachedRound(nextHighestReachedRound);

      return nextHighestReachedRound;
    });
  }, []);

  return {
    highestReachedRound,
    recordHighestReachedRound,
  };
}
