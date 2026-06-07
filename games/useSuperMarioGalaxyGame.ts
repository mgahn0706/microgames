"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type StarBit = Readonly<{
  id: string;
  imageSrc: string;
  rotationDelaySeconds: number;
  x: number;
  y: number;
}>;

export type GalaxyCursorPosition = Readonly<{
  x: number;
  y: number;
}>;

const DRAGGED_SOUND_SRC =
  "/games/super-mario-galaxy/sounds/star-bits-dragged.mp3";
const SUCCESS_SOUND_SRC =
  "/games/super-mario-galaxy/sounds/star-bits-dragged-successfully.mp3";
const STAR_BIT_HIT_RADIUS_PX = 52;
const STAR_BIT_IMAGES = [
  "/games/super-mario-galaxy/images/blue-bits.png",
  "/games/super-mario-galaxy/images/green-bits.png",
  "/games/super-mario-galaxy/images/purple-bits.png",
  "/games/super-mario-galaxy/images/red-bits.png",
  "/games/super-mario-galaxy/images/white-bits.png",
  "/games/super-mario-galaxy/images/yellow-bits.png",
] as const;
const STAR_BIT_POSITIONS = [
  { x: 16, y: 24 },
  { x: 29, y: 62 },
  { x: 39, y: 35 },
  { x: 51, y: 70 },
  { x: 62, y: 28 },
  { x: 75, y: 58 },
  { x: 84, y: 31 },
  { x: 20, y: 75 },
  { x: 47, y: 21 },
  { x: 68, y: 78 },
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function startOneShotSound(src: string) {
  const audio = new Audio(src);

  audio.volume = 0.92;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
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

function createStarBits() {
  const positions = shuffleItems(STAR_BIT_POSITIONS);

  return STAR_BIT_IMAGES.map((imageSrc, index) => {
    const position = positions[index];

    if (!position) {
      throw new Error("Missing star bit position.");
    }

    return {
      id: imageSrc,
      imageSrc,
      rotationDelaySeconds: -Math.random() * 1.5,
      x: position.x,
      y: position.y,
    } satisfies StarBit;
  });
}

function getDistanceFromPointer(
  bit: StarBit,
  bounds: DOMRect,
  pointerX: number,
  pointerY: number,
) {
  const bitX = bounds.left + (bounds.width * bit.x) / 100;
  const bitY = bounds.top + (bounds.height * bit.y) / 100;

  return Math.hypot(pointerX - bitX, pointerY - bitY);
}

export function useSuperMarioGalaxyGame(): Readonly<{
  bits: readonly StarBit[];
  collectedBitIds: readonly string[];
  containerRef: RefObject<HTMLDivElement | null>;
  handlePointerCancel: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerEnter: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerLeave: () => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: () => void;
  pointerPosition: GalaxyCursorPosition | null;
}> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasClearedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [bits] = useState(createStarBits);
  const [collectedBitIds, setCollectedBitIds] = useState<readonly string[]>([]);
  const [pointerPosition, setPointerPosition] =
    useState<GalaxyCursorPosition | null>(null);

  const updatePointerPosition = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();

      setPointerPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [],
  );

  const collectBit = useCallback(
    (bit: StarBit) => {
      if (hasClearedRef.current) {
        return;
      }

      setCollectedBitIds((currentBitIds) => {
        if (currentBitIds.includes(bit.id)) {
          return currentBitIds;
        }

        const nextBitIds = [...currentBitIds, bit.id];
        const isFinalBit = nextBitIds.length >= bits.length;

        if (isFinalBit) {
          hasClearedRef.current = true;
          startOneShotSound(DRAGGED_SOUND_SRC);
          startOneShotSound(SUCCESS_SOUND_SRC);
          dispatchClear();
          return nextBitIds;
        }

        startOneShotSound(DRAGGED_SOUND_SRC);
        return nextBitIds;
      });
    },
    [bits.length],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      updatePointerPosition(event);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [updatePointerPosition],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      updatePointerPosition(event);

      const bounds = containerRef.current?.getBoundingClientRect();

      if (!bounds || !isDraggingRef.current) {
        return;
      }

      const touchedBit = bits.find(
        (bit) =>
          !collectedBitIds.includes(bit.id) &&
          getDistanceFromPointer(bit, bounds, event.clientX, event.clientY) <=
            STAR_BIT_HIT_RADIUS_PX,
      );

      if (!touchedBit) {
        return;
      }

      collectBit(touchedBit);
    },
    [bits, collectBit, collectedBitIds, updatePointerPosition],
  );

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handlePointerEnter = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      updatePointerPosition(event);
    },
    [updatePointerPosition],
  );

  const handlePointerLeave = useCallback(() => {
    isDraggingRef.current = false;
    setPointerPosition(null);
  }, []);

  return {
    bits,
    collectedBitIds,
    containerRef,
    handlePointerCancel: stopDragging,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp: stopDragging,
    pointerPosition,
  };
}
