"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PRACTICE_SPEED_MULTIPLIER,
  formatPracticeSpeedMultiplier,
  parsePracticeSpeedMultiplier,
  PRACTICE_SPEED_STORAGE_KEY,
} from "@/lib/practiceSpeed";

function readBrowserPracticeSpeedMultiplier() {
  const params = new URLSearchParams(window.location.search);
  const speedFromQuery = params.get("speed");
  const speedFromStorage = window.localStorage.getItem(
    PRACTICE_SPEED_STORAGE_KEY,
  );

  return parsePracticeSpeedMultiplier(speedFromQuery ?? speedFromStorage);
}

export function usePracticeSpeedMultiplierState(): readonly [
  number,
  Dispatch<SetStateAction<number>>,
] {
  const [practiceSpeedMultiplier, setPracticeSpeedMultiplier] = useState(
    DEFAULT_PRACTICE_SPEED_MULTIPLIER,
  );
  const hasLoadedInitialSpeedRef = useRef(false);

  useEffect(() => {
    const initialSpeedTimer = window.setTimeout(() => {
      hasLoadedInitialSpeedRef.current = true;
      setPracticeSpeedMultiplier(readBrowserPracticeSpeedMultiplier());
    }, 0);

    return () => {
      window.clearTimeout(initialSpeedTimer);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialSpeedRef.current) {
      return;
    }

    const formattedSpeed = formatPracticeSpeedMultiplier(
      practiceSpeedMultiplier,
    );

    window.localStorage.setItem(PRACTICE_SPEED_STORAGE_KEY, formattedSpeed);

    if (window.location.pathname === "/microscope") {
      window.history.replaceState(
        null,
        "",
        `/microscope?speed=${formattedSpeed}`,
      );
    }
  }, [practiceSpeedMultiplier]);

  return [practiceSpeedMultiplier, setPracticeSpeedMultiplier] as const;
}
