"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type MiniMetroStationShape = "circle" | "square" | "triangle";

export type MiniMetroStation = Readonly<{
  id: MiniMetroStationShape;
  x: number;
  y: number;
}>;

export type MiniMetroLinePoint = Readonly<{
  x: number;
  y: number;
}>;

const STATION_HIT_RADIUS_PX = 34;
const CLEAR_AFTER_RELEASE_MS = 140;
const STATION_SHAPES = ["circle", "triangle", "square"] as const;
const STATION_POSITION_CANDIDATES = [
  { x: 22, y: 36 },
  { x: 32, y: 62 },
  { x: 42, y: 30 },
  { x: 51, y: 57 },
  { x: 61, y: 34 },
  { x: 71, y: 63 },
  { x: 80, y: 41 },
  { x: 28, y: 48 },
  { x: 48, y: 42 },
  { x: 67, y: 51 },
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function shuffleItems<T>(items: readonly T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = nextItems[index];
    const swapItem = nextItems[swapIndex];

    nextItems[index] = swapItem;
    nextItems[swapIndex] = currentItem;
  }

  return nextItems;
}

function createStations() {
  const positions = shuffleItems(STATION_POSITION_CANDIDATES);

  return STATION_SHAPES.map((shape, index) => {
    const position = positions[index];

    if (!position) {
      throw new Error("Missing Mini Metro station position.");
    }

    return {
      id: shape,
      x: position.x,
      y: position.y,
    } satisfies MiniMetroStation;
  });
}

function getPointerPoint(
  element: HTMLDivElement,
  event: PointerEvent<HTMLDivElement>,
) {
  const bounds = element.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 100,
    y: ((event.clientY - bounds.top) / bounds.height) * 100,
  } satisfies MiniMetroLinePoint;
}

function getStationDistancePx(
  station: MiniMetroStation,
  bounds: DOMRect,
  event: PointerEvent<HTMLDivElement>,
) {
  const stationX = bounds.left + (bounds.width * station.x) / 100;
  const stationY = bounds.top + (bounds.height * station.y) / 100;

  return Math.hypot(event.clientX - stationX, event.clientY - stationY);
}

export function useMiniMetroGame(): Readonly<{
  connectedStationIds: readonly MiniMetroStationShape[];
  containerRef: RefObject<HTMLDivElement | null>;
  handlePointerCancel: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerLeave: () => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: () => void;
  isDragging: boolean;
  previewLinePoint: MiniMetroLinePoint | null;
  stations: readonly MiniMetroStation[];
}> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const connectedStationIdsRef = useRef<readonly MiniMetroStationShape[]>([]);
  const hasClearedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isReadyToClearRef = useRef(false);
  const [connectedStationIds, setConnectedStationIds] = useState<
    readonly MiniMetroStationShape[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewLinePoint, setPreviewLinePoint] =
    useState<MiniMetroLinePoint | null>(null);
  const [stations] = useState(createStations);

  const connectTouchedStation = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const bounds = containerRef.current?.getBoundingClientRect();

      if (!bounds || hasClearedRef.current || isReadyToClearRef.current) {
        return;
      }

      const touchedStation = stations.find(
        (station) =>
          !connectedStationIdsRef.current.includes(station.id) &&
          getStationDistancePx(station, bounds, event) <= STATION_HIT_RADIUS_PX,
      );

      if (!touchedStation) {
        return;
      }

      setConnectedStationIds((currentStationIds) => {
        if (
          hasClearedRef.current ||
          currentStationIds.includes(touchedStation.id)
        ) {
          return currentStationIds;
        }

        const nextStationIds = [...currentStationIds, touchedStation.id];
        const isComplete = nextStationIds.length >= stations.length;

        connectedStationIdsRef.current = nextStationIds;
        setPreviewLinePoint({
          x: touchedStation.x,
          y: touchedStation.y,
        });
        bgmLibrary
          .playSoundEffect("miniMetroSelectedStation")
          .catch((error: unknown) => {
            console.error(error);
          });

        if (isComplete) {
          isReadyToClearRef.current = true;
        }

        return nextStationIds;
      });
    },
    [stations],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (hasClearedRef.current) {
        return;
      }

      event.preventDefault();
      isDraggingRef.current = true;
      isReadyToClearRef.current = false;
      connectedStationIdsRef.current = [];
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      setIsDragging(true);
      setConnectedStationIds([]);
      setPreviewLinePoint(getPointerPoint(event.currentTarget, event));
      event.currentTarget.setPointerCapture(event.pointerId);
      connectTouchedStation(event);
    },
    [connectTouchedStation],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (
        !isDraggingRef.current ||
        hasClearedRef.current ||
        isReadyToClearRef.current
      ) {
        return;
      }

      const nextPoint = getPointerPoint(event.currentTarget, event);

      setPreviewLinePoint(nextPoint);
      connectTouchedStation(event);
    },
    [connectTouchedStation],
  );

  const clearCompletedConnection = useCallback(() => {
    hasClearedRef.current = true;
    bgmLibrary.playSoundEffect("miniMetroSuccess").catch((error: unknown) => {
      console.error(error);
    });
    clearTimerRef.current = window.setTimeout(() => {
      clearTimerRef.current = null;
      dispatchClear();
    }, CLEAR_AFTER_RELEASE_MS);
  }, []);

  const resetConnection = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);

    if (hasClearedRef.current) {
      return;
    }

    isReadyToClearRef.current = false;
    setConnectedStationIds([]);
    connectedStationIdsRef.current = [];
    setPreviewLinePoint(null);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);

    if (hasClearedRef.current) {
      return;
    }

    if (isReadyToClearRef.current) {
      clearCompletedConnection();
      return;
    }

    resetConnection();
  }, [clearCompletedConnection, resetConnection]);

  useEffect(
    () => () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    },
    [],
  );

  return {
    connectedStationIds,
    containerRef,
    handlePointerCancel: resetConnection,
    handlePointerDown,
    handlePointerLeave: resetConnection,
    handlePointerMove,
    handlePointerUp,
    isDragging,
    previewLinePoint,
    stations,
  };
}
