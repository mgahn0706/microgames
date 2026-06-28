"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MIN_POINT_DISTANCE = 5;
const MIN_CIRCLE_DIAMETER = 92;
const MAX_CIRCLE_DIAMETER_RATIO = 0.7;
const MIN_POINT_COUNT = 20;
const MIN_PASSING_CIRCLE_SCORE = 0.6;
const ZELDA_ASSETS = {
  background: "/games/zelda/images/background.webp",
  cursor: "/games/zelda/images/cursor.png",
} as const;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type LoadedImages = Readonly<{
  background: HTMLImageElement;
  cursor: HTMLImageElement;
}>;

type BackgroundLayout = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type GameState = {
  hasResolved: boolean;
  isDrawing: boolean;
  path: Point[];
  pointer: Point | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadZeldaImages() {
  const [background, cursor] = await Promise.all([
    preloadImage(ZELDA_ASSETS.background),
    preloadImage(ZELDA_ASSETS.cursor),
  ]);

  return { background, cursor } satisfies LoadedImages;
}

function getCoverLayout(
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  return {
    height: drawHeight,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies BackgroundLayout;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  } satisfies Point;
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getPathLength(path: readonly Point[]) {
  return path.slice(1).reduce((totalLength, point, index) => {
    return totalLength + getDistance(path[index], point);
  }, 0);
}

function getPathBounds(path: readonly Point[]) {
  return path.reduce(
    (bounds, point) => ({
      bottom: Math.max(bounds.bottom, point.y),
      left: Math.min(bounds.left, point.x),
      right: Math.max(bounds.right, point.x),
      top: Math.min(bounds.top, point.y),
    }),
    {
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
    },
  );
}

function getCentroid(path: readonly Point[]) {
  const total = path.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / path.length,
    y: total.y / path.length,
  } satisfies Point;
}

function normalizeAngleDelta(delta: number) {
  if (delta > Math.PI) {
    return delta - Math.PI * 2;
  }

  if (delta < -Math.PI) {
    return delta + Math.PI * 2;
  }

  return delta;
}

function getSignedAngleTravel(path: readonly Point[], center: Point) {
  return path.slice(1).reduce((angleTravel, point, index) => {
    const previousPoint = path[index];
    const previousAngle = Math.atan2(
      previousPoint.y - center.y,
      previousPoint.x - center.x,
    );
    const nextAngle = Math.atan2(point.y - center.y, point.x - center.x);

    return angleTravel + normalizeAngleDelta(nextAngle - previousAngle);
  }, 0);
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function getRangeScore(value: number, ideal: number, tolerance: number) {
  return clamp01(1 - Math.abs(value - ideal) / tolerance);
}

function evaluateCirclePath(
  path: readonly Point[],
  width: number,
  height: number,
) {
  if (path.length < MIN_POINT_COUNT) {
    return false;
  }

  const bounds = getPathBounds(path);
  const pathWidth = bounds.right - bounds.left;
  const pathHeight = bounds.bottom - bounds.top;
  const maxCircleDiameter = Math.min(width, height) * MAX_CIRCLE_DIAMETER_RATIO;

  if (
    pathWidth < MIN_CIRCLE_DIAMETER ||
    pathHeight < MIN_CIRCLE_DIAMETER ||
    pathWidth > maxCircleDiameter ||
    pathHeight > maxCircleDiameter
  ) {
    return false;
  }

  const aspectRatio = pathWidth / pathHeight;

  if (aspectRatio < 0.58 || aspectRatio > 1.72) {
    return false;
  }

  const center = getCentroid(path);
  const radii = path.map((point) => getDistance(point, center));
  const averageRadius =
    radii.reduce((sum, radius) => sum + radius, 0) / radii.length;

  if (!Number.isFinite(averageRadius) || averageRadius <= 0) {
    return false;
  }

  const radiusVariance =
    radii.reduce((sum, radius) => {
      const delta = radius - averageRadius;

      return sum + delta * delta;
    }, 0) / radii.length;
  const radiusDeviation = Math.sqrt(radiusVariance) / averageRadius;
  const circumferenceRatio =
    getPathLength(path) / (Math.PI * 2 * averageRadius);
  const signedAngleTravel = Math.abs(getSignedAngleTravel(path, center));
  const angleScore = getRangeScore(signedAngleTravel / (Math.PI * 2), 1, 0.48);
  const aspectScore = getRangeScore(aspectRatio, 1, 0.72);
  const circumferenceScore = getRangeScore(circumferenceRatio, 1, 0.72);
  const roundnessScore = clamp01(1 - radiusDeviation / 0.48);
  const circleScore =
    roundnessScore * 0.38 +
    angleScore * 0.28 +
    aspectScore * 0.2 +
    circumferenceScore * 0.14;

  return circleScore >= MIN_PASSING_CIRCLE_SCORE;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!background) {
    context.fillStyle = "#17130f";
    context.fillRect(0, 0, width, height);
    return;
  }

  const layout = getCoverLayout(background, width, height);

  context.drawImage(
    background,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
  );
}

function drawPath(context: CanvasRenderingContext2D, path: readonly Point[]) {
  if (path.length < 2) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowBlur = 30;
  context.shadowColor = "rgba(216,180,254,0.94)";
  context.strokeStyle = "rgba(255,255,255,0.92)";
  context.lineWidth = 14;
  context.beginPath();
  context.moveTo(path[0].x, path[0].y);
  path.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.stroke();

  context.shadowBlur = 10;
  context.strokeStyle = "rgba(192,132,252,0.78)";
  context.lineWidth = 5;
  context.stroke();
  context.restore();
}

function drawCursor(
  context: CanvasRenderingContext2D,
  cursor: HTMLImageElement | null,
  pointer: Point | null,
) {
  if (!cursor || !pointer) {
    return;
  }

  const size = 54;

  context.save();
  context.shadowBlur = 18;
  context.shadowColor = "rgba(216,180,254,0.9)";
  context.drawImage(
    cursor,
    pointer.x - size * 0.5,
    pointer.y - size * 0.5,
    size,
    size,
  );
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  state: GameState,
  width: number,
  height: number,
) {
  drawBackground(context, images?.background ?? null, width, height);
  drawPath(context, state.path);
  drawCursor(context, images?.cursor ?? null, state.pointer);
}

export function useZeldaCircleDrawGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>({
    hasResolved: false,
    isDrawing: false,
    path: [],
    pointer: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const resizeCanvas = () => {
      const width = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
      const height = Math.max(window.innerHeight, MIN_CANVAS_HEIGHT);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawScene(context, imagesRef.current, stateRef.current, width, height);
    };

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      drawScene(context, imagesRef.current, stateRef.current, width, height);
      frameRef.current = window.requestAnimationFrame(render);
    };

    const beginDrawing = (event: PointerEvent) => {
      if (stateRef.current.hasResolved) {
        return;
      }

      event.preventDefault();
      const point = getPointerPoint(canvas, event);

      canvas.setPointerCapture(event.pointerId);
      stateRef.current = {
        ...stateRef.current,
        isDrawing: true,
        path: [point],
        pointer: point,
      };
    };

    const continueDrawing = (event: PointerEvent) => {
      if (
        stateRef.current.hasResolved ||
        !stateRef.current.isDrawing ||
        stateRef.current.path.length === 0
      ) {
        return;
      }

      event.preventDefault();
      const point = getPointerPoint(canvas, event);
      const previousPoint =
        stateRef.current.path[stateRef.current.path.length - 1];

      if (getDistance(previousPoint, point) < MIN_POINT_DISTANCE) {
        stateRef.current = {
          ...stateRef.current,
          pointer: point,
        };
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        path: [...stateRef.current.path, point],
        pointer: point,
      };
    };

    const finishDrawing = (event: PointerEvent) => {
      if (
        stateRef.current.hasResolved ||
        !stateRef.current.isDrawing ||
        stateRef.current.path.length === 0
      ) {
        return;
      }

      event.preventDefault();
      const point = getPointerPoint(canvas, event);
      const nextPath = [...stateRef.current.path, point];
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const isRound = evaluateCirclePath(nextPath, width, height);

      stateRef.current = {
        hasResolved: true,
        isDrawing: false,
        path: nextPath,
        pointer: point,
      };

      if (isRound) {
        dispatchClear();
        return;
      }

      dispatchFailure();
    };

    preloadZeldaImages()
      .then((loadedImages) => {
        imagesRef.current = loadedImages;
        resizeCanvas();
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    resizeCanvas();
    frameRef.current = window.requestAnimationFrame(render);
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", beginDrawing);
    canvas.addEventListener("pointermove", continueDrawing);
    canvas.addEventListener("pointerup", finishDrawing);
    canvas.addEventListener("pointercancel", finishDrawing);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", beginDrawing);
      canvas.removeEventListener("pointermove", continueDrawing);
      canvas.removeEventListener("pointerup", finishDrawing);
      canvas.removeEventListener("pointercancel", finishDrawing);
    };
  }, []);

  return canvasRef;
}
