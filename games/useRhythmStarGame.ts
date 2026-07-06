"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type RhythmStarJudgement = "great" | "good" | "miss" | "perfect";
export type RhythmStarNoteStatus = "hit" | "missed" | "pending";

export type RhythmStarNote = Readonly<{
  id: string;
  laneIndex: number;
  status: RhythmStarNoteStatus;
  targetBeat: number;
}>;

type RhythmStarFeedback = Readonly<{
  id: number;
  judgement: RhythmStarJudgement;
}>;

const LANE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;
const TARGET_BEATS = [4, 7, 10] as const;
const CLEAR_BEAT_OFFSET = 0.06;
const HIT_WINDOW_BEATS = 0.78;
const PERFECT_WINDOW_BEATS = 0.2;
const GREAT_WINDOW_BEATS = 0.42;
const FEEDBACK_DURATION_MS = 420;
const LANE_GLOW_DURATION_MS = 190;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function shuffleLanes() {
  return LANE_KEYS.map((_, laneIndex) => laneIndex).sort(
    () => Math.random() - 0.5,
  );
}

function createNotes(): RhythmStarNote[] {
  const lanes = shuffleLanes();

  return TARGET_BEATS.map(
    (targetBeat, index) =>
      ({
        id: `rhythm-star-${targetBeat}`,
        laneIndex: lanes[index],
        status: "pending",
        targetBeat,
      }) satisfies RhythmStarNote,
  );
}

function getJudgement(deltaBeats: number): Exclude<RhythmStarJudgement, "miss"> {
  const absoluteDelta = Math.abs(deltaBeats);

  if (absoluteDelta <= PERFECT_WINDOW_BEATS) {
    return "perfect";
  }

  if (absoluteDelta <= GREAT_WINDOW_BEATS) {
    return "great";
  }

  return "good";
}

function findBestHitNote(
  notes: readonly RhythmStarNote[],
  laneIndex: number,
  elapsedBeats: number,
) {
  return notes
    .filter((note) => note.status === "pending" && note.laneIndex === laneIndex)
    .map((note) => ({
      deltaBeats: elapsedBeats - note.targetBeat,
      note,
    }))
    .filter(({ deltaBeats }) => Math.abs(deltaBeats) <= HIT_WINDOW_BEATS)
    .sort(
      (first, second) =>
        Math.abs(first.deltaBeats) - Math.abs(second.deltaBeats),
    )[0];
}

function hasAnyNoteInHitWindow(
  notes: readonly RhythmStarNote[],
  elapsedBeats: number,
) {
  return notes.some(
    (note) =>
      note.status === "pending" &&
      Math.abs(elapsedBeats - note.targetBeat) <= HIT_WINDOW_BEATS,
  );
}

export function useRhythmStarGame({
  beatCount,
  beatDurationMs,
  isActive,
}: Readonly<{
  beatCount: number;
  beatDurationMs: number;
  isActive: boolean;
}>): Readonly<{
  activeLaneIndex: number | null;
  elapsedBeats: number;
  feedback: RhythmStarFeedback | null;
  keys: typeof LANE_KEYS;
  notes: readonly RhythmStarNote[];
}> {
  const allNotesHitRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const clearedRef = useRef(false);
  const elapsedBeatsRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const laneGlowTimerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const [activeLaneIndex, setActiveLaneIndex] = useState<number | null>(null);
  const [elapsedBeats, setElapsedBeats] = useState(0);
  const [feedback, setFeedback] = useState<RhythmStarFeedback | null>(null);
  const [notes, setNotes] = useState<RhythmStarNote[]>(createNotes);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current === null) {
      return;
    }

    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  }, []);

  const showFeedback = useCallback(
    (judgement: RhythmStarJudgement) => {
      clearFeedbackTimer();
      setFeedback({ id: window.performance.now(), judgement });
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback(null);
        feedbackTimerRef.current = null;
      }, FEEDBACK_DURATION_MS);
    },
    [clearFeedbackTimer],
  );

  const showLaneGlow = useCallback((laneIndex: number) => {
    if (laneGlowTimerRef.current !== null) {
      window.clearTimeout(laneGlowTimerRef.current);
    }

    setActiveLaneIndex(laneIndex);
    laneGlowTimerRef.current = window.setTimeout(() => {
      setActiveLaneIndex(null);
      laneGlowTimerRef.current = null;
    }, LANE_GLOW_DURATION_MS);
  }, []);

  const dispatchClearOnce = useCallback(() => {
    if (clearedRef.current) {
      return;
    }

    clearedRef.current = true;
    dispatchClear();
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    allNotesHitRef.current = false;
    clearedRef.current = false;
    elapsedBeatsRef.current = 0;
    startTimestampRef.current = null;
    setActiveLaneIndex(null);
    setElapsedBeats(0);
    setFeedback(null);
    setNotes(createNotes());
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const clearBeat = Math.max(0, beatCount - CLEAR_BEAT_OFFSET);

    const tick = (timestamp: number) => {
      if (startTimestampRef.current === null) {
        startTimestampRef.current = timestamp;
      }

      const nextElapsedBeats =
        (timestamp - startTimestampRef.current) / beatDurationMs;

      elapsedBeatsRef.current = nextElapsedBeats;
      setElapsedBeats(nextElapsedBeats);

      if (allNotesHitRef.current && nextElapsedBeats >= clearBeat) {
        dispatchClearOnce();
      }

      setNotes((currentNotes) => {
        const nextNotes = currentNotes.map((note) =>
          note.status === "pending" &&
          nextElapsedBeats - note.targetBeat > HIT_WINDOW_BEATS
            ? { ...note, status: "missed" as const }
            : note,
        );

        return nextNotes;
      });
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
    };
  }, [beatCount, beatDurationMs, dispatchClearOnce, isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const laneIndex = LANE_KEYS.findIndex((key) => key === event.key);

      if (laneIndex < 0 || clearedRef.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      showLaneGlow(laneIndex);

      const currentElapsedBeats = elapsedBeatsRef.current;

      setNotes((currentNotes) => {
        const bestHit = findBestHitNote(
          currentNotes,
          laneIndex,
          currentElapsedBeats,
        );

        if (!bestHit) {
          if (hasAnyNoteInHitWindow(currentNotes, currentElapsedBeats)) {
            showFeedback("miss");
          }

          return currentNotes;
        }

        const nextNotes = currentNotes.map((note) =>
          note.id === bestHit.note.id
            ? { ...note, status: "hit" as const }
            : note,
        );

        showFeedback(getJudgement(bestHit.deltaBeats));

        if (nextNotes.every((note) => note.status === "hit")) {
          allNotesHitRef.current = true;
        }

        return nextNotes;
      });
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isActive, showFeedback, showLaneGlow]);

  useEffect(() => clearFeedbackTimer, [clearFeedbackTimer]);

  useEffect(
    () => () => {
      if (laneGlowTimerRef.current !== null) {
        window.clearTimeout(laneGlowTimerRef.current);
      }
    },
    [],
  );

  return {
    activeLaneIndex,
    elapsedBeats,
    feedback,
    keys: LANE_KEYS,
    notes,
  };
}
