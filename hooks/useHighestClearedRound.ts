"use client";

import { useCallback, useSyncExternalStore } from "react";

const HIGHEST_CLEARED_ROUND_STORAGE_KEY = "catTower.highestClearedRound";
const HIGHEST_CLEARED_ROUND_CHANGE_EVENT =
  "catTower.highestClearedRoundChange";

function readHighestClearedRound() {
  if (typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(
    HIGHEST_CLEARED_ROUND_STORAGE_KEY,
  );
  const parsedValue = Number.parseInt(storedValue ?? "0", 10);

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0;
}

function writeHighestClearedRound(highestClearedRound: number) {
  window.localStorage.setItem(
    HIGHEST_CLEARED_ROUND_STORAGE_KEY,
    highestClearedRound.toString(),
  );
  window.dispatchEvent(new Event(HIGHEST_CLEARED_ROUND_CHANGE_EVENT));
}

function subscribeHighestClearedRound(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === HIGHEST_CLEARED_ROUND_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    HIGHEST_CLEARED_ROUND_CHANGE_EVENT,
    onStoreChange,
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      HIGHEST_CLEARED_ROUND_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

export function useHighestClearedRound() {
  const highestClearedRound = useSyncExternalStore(
    subscribeHighestClearedRound,
    readHighestClearedRound,
    () => 0,
  );

  const recordHighestClearedRound = useCallback((clearedRound: number) => {
    const nextHighestClearedRound = Math.max(
      readHighestClearedRound(),
      clearedRound,
    );

    writeHighestClearedRound(nextHighestClearedRound);
  }, []);

  return {
    highestClearedRound,
    recordHighestClearedRound,
  };
}
