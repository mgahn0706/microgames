"use client";

import { useEffect } from "react";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";
import { bgmLibrary } from "@/lib/bgmLibrary";

const SETUP_BEATS = 4;
export const SETUP_DURATION_MS = RHYTHM_DURATION_MS * SETUP_BEATS;

type UseGameSetupTransitionParams = Readonly<{
  isActive: boolean;
  onComplete: () => void;
}>;

export function useGameSetupTransition({
  isActive,
  onComplete,
}: UseGameSetupTransitionParams) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    bgmLibrary.play("setup", "once", "now").catch((error: unknown) => {
      console.error(error);
    });

    const transitionTimer = window.setTimeout(() => {
      onComplete();
    }, SETUP_DURATION_MS);

    return () => {
      window.clearTimeout(transitionTimer);
    };
  }, [isActive, onComplete]);
}
