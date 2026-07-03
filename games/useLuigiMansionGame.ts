"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type LuigiMansionObjectId = "chandelure" | "fruits" | "pots";
export type LuigiMansionPhase = "hiding" | "selecting";

const HIDING_BEATS = 4;
const DEFAULT_BEAT_DURATION_MS = 500;
const WRONG_SELECTION_FEEDBACK_MS = 260;
const OBJECT_IDS = ["fruits", "chandelure", "pots"] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomObjectId() {
  const objectId = OBJECT_IDS[Math.floor(Math.random() * OBJECT_IDS.length)];

  if (!objectId) {
    throw new Error("Missing Luigi Mansion object id.");
  }

  return objectId;
}

export function useLuigiMansionGame(beatDurationMs: number): Readonly<{
  handleObjectClick: (objectId: LuigiMansionObjectId) => void;
  hiddenObjectId: LuigiMansionObjectId;
  isResolved: boolean;
  phase: LuigiMansionPhase;
  wrongObjectId: LuigiMansionObjectId | null;
}> {
  const hasResolvedRef = useRef(false);
  const wrongFeedbackTimerRef = useRef<number | null>(null);
  const [hiddenObjectId] = useState(getRandomObjectId);
  const [phase, setPhase] = useState<LuigiMansionPhase>("hiding");
  const [wrongObjectId, setWrongObjectId] =
    useState<LuigiMansionObjectId | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  const handleObjectClick = useCallback(
    (objectId: LuigiMansionObjectId) => {
      if (phase !== "selecting" || hasResolvedRef.current) {
        return;
      }

      if (objectId !== hiddenObjectId) {
        setWrongObjectId(objectId);

        if (wrongFeedbackTimerRef.current !== null) {
          window.clearTimeout(wrongFeedbackTimerRef.current);
        }

        wrongFeedbackTimerRef.current = window.setTimeout(() => {
          wrongFeedbackTimerRef.current = null;
          setWrongObjectId(null);
        }, WRONG_SELECTION_FEEDBACK_MS);
        return;
      }

      hasResolvedRef.current = true;
      setIsResolved(true);
      bgmLibrary
        .playSoundEffect("luigiMansionSuccess")
        .catch((error: unknown) => {
          console.error(error);
        });
      dispatchClear();
    },
    [hiddenObjectId, phase],
  );

  useEffect(() => {
    bgmLibrary.playSoundEffect("luigiMansionGhost").catch((error: unknown) => {
      console.error(error);
    });

    const hidingTimer = window.setTimeout(
      () => {
        setPhase("selecting");
      },
      HIDING_BEATS *
        (Number.isFinite(beatDurationMs)
          ? beatDurationMs
          : DEFAULT_BEAT_DURATION_MS),
    );

    return () => {
      window.clearTimeout(hidingTimer);

      if (wrongFeedbackTimerRef.current !== null) {
        window.clearTimeout(wrongFeedbackTimerRef.current);
      }
    };
  }, [beatDurationMs]);

  return {
    handleObjectClick,
    hiddenObjectId,
    isResolved,
    phase,
    wrongObjectId,
  };
}
