"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const ASSETS = {
  background: "/games/fruit-ninja/images/background.png",
  watermelon: "/games/fruit-ninja/images/watermelon.png",
  watermelonSliced: "/games/fruit-ninja/images/watermelon-sliced.png",
} as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const SLICE_SPREAD_DURATION_MS = 620;
const SLASH_LIFETIME_MS = 180;
const TRAIL_MAX_POINTS = 5;

type AssetKey = keyof typeof ASSETS;

type LoadedImages = Record<AssetKey, HTMLImageElement>;

type Point = Readonly<{
  timestamp: number;
  x: number;
  y: number;
}>;

type FruitPosition = Readonly<{
  rotation: number;
  size: number;
  x: number;
  y: number;
}>;

type GameState = {
  elapsedMs: number;
  hasCleared: boolean;
  isDragging: boolean;
  isSliced: boolean;
  lastTimestamp: number | null;
  pointerPosition: Point | null;
  slashAngle: number;
  slicedAtMs: number | null;
  slashTrail: Point[];
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playSliceSound() {
  bgmLibrary.playSoundEffect("fruitNinjaImpact").catch((error: unknown) => {
    console.error(error);
  });
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.decode) {
        resolve(image);
        return;
      }

      image
        .decode()
        .then(() => resolve(image))
        .catch(() => resolve(image));
    };
    image.onerror = () => {
      reject(new Error(`Failed to preload ${src}`));
    };
    image.src = src;
  });
}

async function preloadFruitNinjaImages() {
  const entries = await Promise.all(
    Object.entries(ASSETS).map(async ([key, src]) => {
      const image = await preloadImage(src);

      return [key, image] as const;
    }),
  );

  return Object.fromEntries(entries) as LoadedImages;
}

function createInitialState() {
  return {
    elapsedMs: 0,
    hasCleared: false,
    isDragging: false,
    isSliced: false,
    lastTimestamp: null,
    pointerPosition: null,
    slashAngle: -Math.PI / 4,
    slicedAtMs: null,
    slashTrail: [],
  } satisfies GameState;
}

function getBeatDurationMs(canvas: HTMLCanvasElement) {
  const rawDuration = window
    .getComputedStyle(canvas)
    .getPropertyValue("--game-rhythm-duration")
    .trim();
  const parsedDuration = Number.parseFloat(rawDuration);

  return Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : DEFAULT_BEAT_DURATION_MS;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    timestamp: performance.now(),
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  } satisfies Point;
}

function getQuadraticBezierPoint(
  progress: number,
  start: Omit<Point, "timestamp">,
  control: Omit<Point, "timestamp">,
  end: Omit<Point, "timestamp">,
) {
  const inverse = 1 - progress;

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * progress * control.x +
      progress * progress * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * progress * control.y +
      progress * progress * end.y,
  };
}

function getFruitPosition(
  width: number,
  height: number,
  elapsedMs: number,
  roundDurationMs: number,
) {
  const throwProgress = Math.min(Math.max(elapsedMs / roundDurationMs, 0), 1);
  const easedProgress = 1 - Math.pow(1 - throwProgress, 1.08);
  const position = getQuadraticBezierPoint(
    easedProgress,
    { x: width * 0.14, y: height * 0.86 },
    { x: width * 0.44, y: height * 0.08 },
    { x: width * 0.88, y: height * 0.78 },
  );
  const size = Math.min(Math.max(width * 0.17, 106), 188);

  return {
    rotation: -0.8 + easedProgress * Math.PI * 3.4,
    size,
    x: position.x,
    y: position.y,
  } satisfies FruitPosition;
}

function getDistanceFromSegmentToPoint(
  start: Omit<Point, "timestamp">,
  end: Omit<Point, "timestamp">,
  point: Omit<Point, "timestamp">,
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        segmentLengthSquared,
    ),
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function isSlashHit(start: Point, end: Point, fruit: FruitPosition) {
  const distance = getDistanceFromSegmentToPoint(start, end, fruit);

  return distance <= fruit.size * 0.42;
}

function addTrailPoint(state: GameState, point: Point) {
  const recentPoints = state.slashTrail.filter(
    (trailPoint) => point.timestamp - trailPoint.timestamp <= SLASH_LIFETIME_MS,
  );

  state.slashTrail = [...recentPoints, point].slice(-TRAIL_MAX_POINTS);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  const drawHeight = imageRatio > canvasRatio ? height : width / imageRatio;
  const drawWidth = imageRatio > canvasRatio ? height * imageRatio : width;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawFruit(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  fruit: FruitPosition,
) {
  context.save();
  context.translate(fruit.x, fruit.y);
  context.rotate(fruit.rotation);
  context.drawImage(
    image,
    -fruit.size / 2,
    -fruit.size / 2,
    fruit.size,
    fruit.size,
  );
  context.restore();
}

function drawSlicedFruit(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  fruit: FruitPosition,
  state: GameState,
) {
  const slicedElapsedMs =
    state.slicedAtMs === null ? 0 : state.elapsedMs - state.slicedAtMs;
  const progress = Math.min(
    Math.max(slicedElapsedMs / SLICE_SPREAD_DURATION_MS, 0),
    1,
  );
  const easedProgress = 1 - Math.pow(1 - progress, 2.2);
  const drawWidth = fruit.size * 1.02;
  const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
  const perpendicularAngle = state.slashAngle + Math.PI / 2;
  const spread = fruit.size * (0.18 + easedProgress * 0.64);
  const fall = fruit.size * progress * progress * 0.28;
  const pieces = [
    {
      mirrored: false,
      rotation: -0.28 - easedProgress * 0.56,
      spreadDirection: -1,
    },
    {
      mirrored: true,
      rotation: 0.28 + easedProgress * 0.56,
      spreadDirection: 1,
    },
  ] as const;

  pieces.forEach((piece) => {
    const xOffset =
      Math.cos(perpendicularAngle) * spread * piece.spreadDirection;
    const yOffset =
      Math.sin(perpendicularAngle) * spread * piece.spreadDirection + fall;

    context.save();
    context.translate(fruit.x + xOffset, fruit.y + yOffset);
    context.rotate(fruit.rotation + piece.rotation);
    context.scale(piece.mirrored ? -1 : 1, 1);
    context.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    context.restore();
  });
}

function drawSlashTrail(context: CanvasRenderingContext2D, state: GameState) {
  if (!state.isDragging || state.slashTrail.length < 2) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowBlur = 0;
  state.slashTrail.slice(1).forEach((point, index) => {
    const previousPoint = state.slashTrail[index];

    if (!previousPoint) {
      return;
    }

    const opacity = (index + 1) / state.slashTrail.length;

    context.strokeStyle = `rgba(255, 255, 255, ${0.18 + opacity * 0.52})`;
    context.lineWidth = 5 + opacity * 8;
    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    context.strokeStyle = `rgba(190, 242, 100, ${0.18 + opacity * 0.46})`;
    context.lineWidth = 1.5 + opacity * 2.5;
    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  });
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages,
  state: GameState,
  width: number,
  height: number,
  roundDurationMs: number,
) {
  drawCoverImage(context, images.background, width, height);

  const fruit = getFruitPosition(
    width,
    height,
    state.isSliced ? state.elapsedMs - 90 : state.elapsedMs,
    roundDurationMs,
  );

  if (state.isSliced) {
    drawSlicedFruit(context, images.watermelonSliced, fruit, state);
  } else {
    drawFruit(context, images.watermelon, fruit);
  }

  drawSlashTrail(context, state);
}

export function useFruitNinjaGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const stateRef = useRef<GameState>(createInitialState());

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
    let beatDurationMs = DEFAULT_BEAT_DURATION_MS;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      beatDurationMs = getBeatDurationMs(canvas);
      stateRef.current = createInitialState();
    };

    const sliceFruit = (angle: number) => {
      const state = stateRef.current;

      if (state.hasCleared) {
        return;
      }

      state.hasCleared = true;
      state.isSliced = true;
      state.slashAngle = angle;
      state.slicedAtMs = state.elapsedMs;
      playSliceSound();
      dispatchClear();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;
      const point = getPointerPoint(canvas, event);

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.isDragging = true;
      state.pointerPosition = point;
      state.slashTrail = [point];
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;
      const point = getPointerPoint(canvas, event);

      state.pointerPosition = point;

      if (!state.isDragging) {
        return;
      }

      event.preventDefault();

      const previousPoint = state.slashTrail.at(-1);

      addTrailPoint(state, point);

      if (!previousPoint || state.hasCleared) {
        return;
      }

      const fruit = getFruitPosition(
        canvasWidth,
        canvasHeight,
        state.elapsedMs,
        gameBeatCount * beatDurationMs,
      );

      if (isSlashHit(previousPoint, point, fruit)) {
        sliceFruit(
          Math.atan2(point.y - previousPoint.y, point.x - previousPoint.x),
        );
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = stateRef.current;

      event.preventDefault();
      state.isDragging = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handlePointerLeave = () => {
      const state = stateRef.current;

      if (!state.isDragging) {
        state.pointerPosition = null;
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const images = imagesRef.current;
      const deltaSeconds =
        state.lastTimestamp === null
          ? 0
          : Math.min(
              (timestamp - state.lastTimestamp) / 1000,
              MAX_DELTA_SECONDS,
            );

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaSeconds * 1000;
      state.slashTrail = state.slashTrail.filter(
        (point) => timestamp - point.timestamp <= SLASH_LIFETIME_MS,
      );

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      if (images) {
        drawScene(
          context,
          images,
          state,
          canvasWidth,
          canvasHeight,
          gameBeatCount * beatDurationMs,
        );
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();

    preloadFruitNinjaImages()
      .then((images) => {
        if (isDisposed) {
          return;
        }

        imagesRef.current = images;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
