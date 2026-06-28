"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_MS = 50;
const STAMP_COUNT = 3;
const STAMP_ANIMATION_MS = 420;
const MISS_PULSE_MS = 240;
const TARGET_HIT_RADIUS = 86;
const ANIMAL_CROSSING_ASSETS = {
  background: "/games/animal-crossing/images/background.webp",
  stamp: "/games/animal-crossing/images/stamp.webp",
} as const;
const STAMP_TARGET_RATIOS = [
  { x: 0.32, y: 0.39 },
  { x: 0.5, y: 0.56 },
  { x: 0.68, y: 0.4 },
] as const;

type GameState = {
  hasCleared: boolean;
  hasFailed: boolean;
  lastStampedTargetIndex: number | null;
  lastPointer: Point | null;
  lastTimestamp: number | null;
  missPulseMs: number;
  misplacedStamp: Point | null;
  misplacedStampPulseMs: number;
  stampedTargets: boolean[];
  stampPulseMs: number;
  stamps: number;
};

type LoadedImages = Partial<
  Record<keyof typeof ANIMAL_CROSSING_ASSETS, HTMLImageElement>
>;

type Point = {
  x: number;
  y: number;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playStampSound() {
  bgmLibrary.playSoundEffect("animalCrossingStamp").catch((error: unknown) => {
    console.error(error);
  });
}

function createInitialState() {
  return {
    hasCleared: false,
    hasFailed: false,
    lastStampedTargetIndex: null,
    lastPointer: null,
    lastTimestamp: null,
    missPulseMs: 0,
    misplacedStamp: null,
    misplacedStampPulseMs: 0,
    stampedTargets: Array.from({ length: STAMP_COUNT }, () => false),
    stampPulseMs: 0,
    stamps: 0,
  } satisfies GameState;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function getTargetPoints(width: number, height: number) {
  return STAMP_TARGET_RATIOS.map((target) => ({
    x: width * target.x,
    y: height * target.y,
  }));
}

function getTargetIndexAtPoint(
  state: GameState,
  point: Point,
  width: number,
  height: number,
) {
  return getTargetPoints(width, height).findIndex((target, index) => {
    if (state.stampedTargets[index]) {
      return false;
    }

    return (
      Math.hypot(point.x - target.x, point.y - target.y) <= TARGET_HIT_RADIUS
    );
  });
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );
}

function drawStamp(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  radius: number,
  animationRatio: number,
) {
  const easedDrop = 1 - Math.pow(1 - animationRatio, 3);
  const impact = Math.max(0, 1 - Math.abs(animationRatio - 0.34) / 0.34);
  const settle = Math.max(0, 1 - animationRatio);
  const yOffset = -radius * 0.42 * settle;
  const scaleX = 1 + impact * 0.18;
  const scaleY = 1 - impact * 0.16;
  const opacity = Math.min(1, 0.2 + easedDrop * 1.35);

  context.save();
  context.translate(x, y);
  context.rotate(-0.12 + impact * 0.08);
  context.scale(scaleX, scaleY);
  context.globalAlpha = opacity;

  if (isImageReady(image)) {
    const size = radius * 2.38;

    context.drawImage(image, -size / 2, -size / 2 + yOffset, size, size);
  } else {
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(0, yOffset, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#991b1b";
    context.lineWidth = 5;
    context.stroke();
    context.fillStyle = "#fff7ed";
    context.font = `900 ${radius * 0.72}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("OK", 0, yOffset + 1);
  }

  context.restore();
}

function drawInkBurst(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  animationRatio: number,
) {
  const impact = Math.max(0, 1 - Math.abs(animationRatio - 0.34) / 0.34);

  if (impact <= 0) {
    return;
  }

  context.save();
  context.globalAlpha = impact * 0.52;
  context.strokeStyle = "#dc2626";
  context.lineWidth = Math.max(3, radius * 0.08 * impact);
  context.beginPath();
  context.arc(x, y, radius * (0.62 + impact * 0.46), 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#b91c1c";
  Array.from({ length: 8 }, (_, index) => {
    const angle = index * ((Math.PI * 2) / 8);
    const burstRadius = radius * (0.72 + impact * 0.52);
    const dotSize = radius * 0.045 * impact;

    context.beginPath();
    context.arc(
      x + Math.cos(angle) * burstRadius,
      y + Math.sin(angle) * burstRadius,
      dotSize,
      0,
      Math.PI * 2,
    );
    context.fill();
  });
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages,
  width: number,
  height: number,
) {
  if (isImageReady(images.background)) {
    drawCoverImage(context, images.background, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#d9f99d");
    gradient.addColorStop(0.42, "#bbf7d0");
    gradient.addColorStop(1, "#fef3c7");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = "rgba(255, 251, 235, 0.2)";
  context.fillRect(0, 0, width, height);

  const targetPoints = getTargetPoints(width, height);
  const targetRadius = Math.min(TARGET_HIT_RADIUS, width * 0.07, height * 0.12);
  const stampRadius = targetRadius * 0.76;

  targetPoints.forEach((target, index) => {
    const isStamped = state.stampedTargets[index];
    const isNewest = isStamped && index === state.lastStampedTargetIndex;
    const animationRatio = isNewest
      ? 1 - Math.max(state.stampPulseMs / STAMP_ANIMATION_MS, 0)
      : 1;

    if (!isStamped) {
      context.save();
      context.globalAlpha = 0.86;
      context.fillStyle = "rgba(255, 255, 255, 0.34)";
      context.beginPath();
      context.arc(target.x, target.y, targetRadius, 0, Math.PI * 2);
      context.fill();
      context.setLineDash([12, 9]);
      context.strokeStyle = "#ef4444";
      context.lineWidth = 5;
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "#ef4444";
      context.font = `900 ${targetRadius * 0.52}px Arial, Helvetica, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(index + 1), target.x, target.y + 1);
      context.restore();
    }

    if (isStamped) {
      drawInkBurst(context, target.x, target.y, targetRadius, animationRatio);
      drawStamp(
        context,
        images.stamp,
        target.x,
        target.y,
        stampRadius,
        animationRatio,
      );
    }
  });

  if (state.misplacedStamp) {
    const animationRatio =
      state.misplacedStampPulseMs > 0
        ? 1 - Math.max(state.misplacedStampPulseMs / STAMP_ANIMATION_MS, 0)
        : 1;

    drawInkBurst(
      context,
      state.misplacedStamp.x,
      state.misplacedStamp.y,
      targetRadius,
      animationRatio,
    );
    drawStamp(
      context,
      images.stamp,
      state.misplacedStamp.x,
      state.misplacedStamp.y,
      stampRadius,
      animationRatio,
    );
  }

  if (state.lastPointer && state.missPulseMs > 0) {
    const missRatio = state.missPulseMs / MISS_PULSE_MS;

    context.strokeStyle = `rgba(239, 68, 68, ${0.7 * missRatio})`;
    context.lineWidth = 5;
    context.beginPath();
    context.arc(
      state.lastPointer.x,
      state.lastPointer.y,
      26 + (1 - missRatio) * 34,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
}

export function useAnimalCrossingStampGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages>({});
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    imagesRef.current = (
      Object.keys(ANIMAL_CROSSING_ASSETS) as Array<
        keyof typeof ANIMAL_CROSSING_ASSETS
      >
    ).reduce<LoadedImages>((nextImages, assetKey) => {
      const image = new Image();

      image.src = ANIMAL_CROSSING_ASSETS[assetKey];

      return {
        ...nextImages,
        [assetKey]: image,
      };
    }, {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrame = 0;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const pointer = getPointerPoint(canvas, event);
      const targetIndex = getTargetIndexAtPoint(
        state,
        pointer,
        canvasWidth,
        canvasHeight,
      );

      state.lastPointer = pointer;

      if (targetIndex < 0) {
        state.hasFailed = true;
        state.misplacedStamp = pointer;
        state.misplacedStampPulseMs = STAMP_ANIMATION_MS;
        state.missPulseMs = MISS_PULSE_MS;
        playStampSound();
        return;
      }

      state.stampedTargets[targetIndex] = true;
      state.lastStampedTargetIndex = targetIndex;
      state.stampPulseMs = STAMP_ANIMATION_MS;
      state.stamps = state.stampedTargets.filter(Boolean).length;
      playStampSound();

      if (state.stamps >= STAMP_COUNT) {
        state.hasCleared = true;
        dispatchClear();
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.stampPulseMs = Math.max(state.stampPulseMs - deltaMs, 0);
      state.misplacedStampPulseMs = Math.max(
        state.misplacedStampPulseMs - deltaMs,
        0,
      );
      state.missPulseMs = Math.max(state.missPulseMs - deltaMs, 0);
      drawScene(context, state, imagesRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, []);

  return canvasRef;
}
