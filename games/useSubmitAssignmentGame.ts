"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type SubmitAssignmentResult = "failure" | "success";

type ImageRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type HitArea = "cancel" | "checkbox" | "previous" | "submit";

const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const RESULT_DELAY_MS = 680;
const HIT_AREAS = {
  cancel: { height: 104, width: 150, x: 445, y: 433 },
  checkbox: { height: 54, width: 54, x: 437, y: 341 },
  previous: { height: 112, width: 190, x: 399, y: 695 },
  submit: { height: 104, width: 225, x: 592, y: 433 },
} satisfies Record<HitArea, ImageRect>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getRenderedImageRect(container: HTMLDivElement) {
  const bounds = container.getBoundingClientRect();
  const scale = Math.min(
    bounds.width / BACKGROUND_WIDTH,
    bounds.height / BACKGROUND_HEIGHT,
  );
  const width = BACKGROUND_WIDTH * scale;
  const height = BACKGROUND_HEIGHT * scale;

  return {
    height,
    width,
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
  } satisfies ImageRect;
}

function getImagePoint(container: HTMLDivElement, event: PointerEvent) {
  const bounds = container.getBoundingClientRect();
  const imageRect = getRenderedImageRect(container);
  const x = event.clientX - bounds.left - imageRect.x;
  const y = event.clientY - bounds.top - imageRect.y;

  return {
    x: (x / imageRect.width) * BACKGROUND_WIDTH,
    y: (y / imageRect.height) * BACKGROUND_HEIGHT,
  };
}

function isPointInRect(
  point: Readonly<{ x: number; y: number }>,
  rect: ImageRect,
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getHitArea(point: Readonly<{ x: number; y: number }>) {
  return (Object.keys(HIT_AREAS) as HitArea[]).find((hitArea) =>
    isPointInRect(point, HIT_AREAS[hitArea]),
  );
}

export function useSubmitAssignmentGame(): Readonly<{
  containerRef: RefObject<HTMLDivElement | null>;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  hasChecked: boolean;
  result: SubmitAssignmentResult | null;
}> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [result, setResult] = useState<SubmitAssignmentResult | null>(null);

  const resolveGame = useCallback((nextResult: SubmitAssignmentResult) => {
    setResult(nextResult);

    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
    }

    resultTimerRef.current = window.setTimeout(() => {
      if (nextResult === "success") {
        dispatchClear();
      } else {
        dispatchFailure();
      }
    }, RESULT_DELAY_MS);
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;

      if (!container || result) {
        return;
      }

      const hitArea = getHitArea(getImagePoint(container, event));

      if (!hitArea) {
        return;
      }

      event.preventDefault();

      if (hitArea === "checkbox") {
        setHasChecked(true);
        return;
      }

      if (hitArea === "submit" && hasChecked) {
        resolveGame("success");
        return;
      }

      if (
        hitArea === "submit" ||
        hitArea === "cancel" ||
        hitArea === "previous"
      ) {
        resolveGame("failure");
      }
    },
    [hasChecked, resolveGame, result],
  );

  useEffect(
    () => () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current);
      }
    },
    [],
  );

  return {
    containerRef,
    handlePointerDown,
    hasChecked,
    result,
  };
}
