"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const BACKGROUND_SRC = "/games/nintendogs/images/background-and-dogs.png";
const CURSOR_SRC = "/games/nintendogs/images/cursor.png";
const CURSOR_RENDER_HEIGHT = 86;
const CURSOR_RENDER_WIDTH = 92;
const PET_DISTANCE_TO_CLEAR = 210;
const RUB_SOUND_INTERVAL_MS = 180;
const HEART_LIFETIME_MS = 720;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;

const DOG_HIT_AREAS = [
  { radiusX: 0.16, radiusY: 0.32, x: 0.14, y: 0.72 },
  { radiusX: 0.15, radiusY: 0.2, x: 0.5, y: 0.81 },
  { radiusX: 0.18, radiusY: 0.33, x: 0.84, y: 0.72 },
] as const;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type Heart = Point &
  Readonly<{
    createdAtMs: number;
  }>;

type GameImages = Readonly<{
  background: HTMLImageElement;
  cursor: HTMLImageElement;
}>;
type CoverImageLayout = Readonly<{
  sourceHeight: number;
  sourceWidth: number;
  sourceX: number;
  sourceY: number;
}>;
type StoppableSound = Readonly<{
  stop: () => void;
}>;

type GameState = {
  activeDogIndex: number | null;
  elapsedMs: number;
  hasCleared: boolean;
  hearts: Heart[];
  isDragging: boolean;
  lastRubSoundAtMs: number;
  lastTimestamp: number | null;
  petDistance: number;
  pointer: Point | null;
  previousPointer: Point | null;
};

function createInitialState(): GameState {
  return {
    activeDogIndex: null,
    elapsedMs: 0,
    hasCleared: false,
    hearts: [],
    isDragging: false,
    lastRubSoundAtMs: -Infinity,
    lastTimestamp: null,
    petDistance: 0,
    pointer: null,
    previousPointer: null,
  };
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    image.src = src;
  });
}

async function preloadImages() {
  const [background, cursor] = await Promise.all([
    createImage(BACKGROUND_SRC),
    createImage(CURSOR_SRC),
  ]);

  return { background, cursor } satisfies GameImages;
}

function getPointerPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  canvasWidth: number,
  canvasHeight: number,
): Point {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvasWidth / bounds.width;
  const scaleY = canvasHeight / bounds.height;

  return {
    x: (event.clientX - bounds.left) * scaleX,
    y: (event.clientY - bounds.top) * scaleY,
  };
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getCoverImageLayout(
  image: HTMLImageElement,
  width: number,
  height: number,
): CoverImageLayout {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const sourceWidth =
    sourceRatio > targetRatio
      ? image.naturalHeight * targetRatio
      : image.naturalWidth;
  const sourceHeight =
    sourceRatio > targetRatio
      ? image.naturalHeight
      : image.naturalWidth / targetRatio;

  return {
    sourceHeight,
    sourceWidth,
    sourceX: (image.naturalWidth - sourceWidth) / 2,
    sourceY: (image.naturalHeight - sourceHeight) / 2,
  };
}

function getDogAreaOnCanvas(
  dog: (typeof DOG_HIT_AREAS)[number],
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const layout = getCoverImageLayout(image, width, height);

  return {
    radiusX: ((dog.radiusX * image.naturalWidth) / layout.sourceWidth) * width,
    radiusY:
      ((dog.radiusY * image.naturalHeight) / layout.sourceHeight) * height,
    x:
      ((dog.x * image.naturalWidth - layout.sourceX) / layout.sourceWidth) *
      width,
    y:
      ((dog.y * image.naturalHeight - layout.sourceY) / layout.sourceHeight) *
      height,
  };
}

function getDogIndexAtPoint(
  point: Point,
  image: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!image) {
    return -1;
  }

  return DOG_HIT_AREAS.findIndex((dog) => {
    const area = getDogAreaOnCanvas(dog, image, width, height);
    const normalizedX = (point.x - area.x) / area.radiusX;
    const normalizedY = (point.y - area.y) / area.radiusY;

    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  });
}

function playBarkSound() {
  bgmLibrary.playSoundEffect("nintendogsBark").catch((error: unknown) => {
    console.error(error);
  });
}

function drawCoveredImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const layout = getCoverImageLayout(image, width, height);

  context.drawImage(
    image,
    layout.sourceX,
    layout.sourceY,
    layout.sourceWidth,
    layout.sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function drawHeart(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  context.save();
  context.translate(x, y);
  context.scale(size, size);
  context.fillStyle = `rgba(255, 111, 145, ${alpha})`;
  context.beginPath();
  context.moveTo(0, 0.28);
  context.bezierCurveTo(-0.72, -0.22, -0.52, -0.94, 0, -0.62);
  context.bezierCurveTo(0.52, -0.94, 0.72, -0.22, 0, 0.28);
  context.closePath();
  context.fill();
  context.restore();
}

function drawPetFeedback(
  context: CanvasRenderingContext2D,
  images: GameImages,
  state: GameState,
  width: number,
  height: number,
) {
  if (state.activeDogIndex !== null) {
    const dog = getDogAreaOnCanvas(
      DOG_HIT_AREAS[state.activeDogIndex],
      images.background,
      width,
      height,
    );

    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.15)";
    context.strokeStyle = "rgba(255, 255, 255, 0.62)";
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(dog.x, dog.y, dog.radiusX, dog.radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  for (const heart of state.hearts) {
    const ageMs = state.elapsedMs - heart.createdAtMs;
    const progress = Math.min(ageMs / HEART_LIFETIME_MS, 1);
    const alpha = 1 - progress;

    drawHeart(
      context,
      heart.x,
      heart.y - progress * 54,
      20 + progress * 10,
      alpha,
    );
  }

  if (state.pointer) {
    context.drawImage(
      images.cursor,
      state.pointer.x - CURSOR_RENDER_WIDTH / 2,
      state.pointer.y - CURSOR_RENDER_HEIGHT / 2,
      CURSOR_RENDER_WIDTH,
      CURSOR_RENDER_HEIGHT,
    );
  }
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: GameImages,
  state: GameState,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  drawCoveredImage(context, images.background, width, height);
  drawPetFeedback(context, images, state, width, height);
}

export function useNintendogsGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<GameImages | null>(null);
  const rubSoundRef = useRef<StoppableSound | null>(null);
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
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;
    let rubSoundRequestId = 0;
    const pixelRatio = window.devicePixelRatio || 1;

    const stopRubSound = () => {
      rubSoundRequestId += 1;
      rubSoundRef.current?.stop();
      rubSoundRef.current = null;
    };

    const startRubSound = () => {
      const state = stateRef.current;

      if (rubSoundRef.current || state.hasCleared) {
        return;
      }

      const requestId = rubSoundRequestId + 1;

      rubSoundRequestId = requestId;
      bgmLibrary
        .playSoundEffect("nintendogsRub")
        .then((playback) => {
          const nextState = stateRef.current;

          if (
            isDisposed ||
            requestId !== rubSoundRequestId ||
            nextState.hasCleared ||
            !nextState.isDragging ||
            nextState.activeDogIndex === null
          ) {
            playback.stop();
            return;
          }

          rubSoundRef.current?.stop();
          rubSoundRef.current = playback;
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stateRef.current = createInitialState();
    };

    const clearGame = () => {
      const state = stateRef.current;

      if (state.hasCleared) {
        return;
      }

      state.hasCleared = true;
      stopRubSound();
      playBarkSound();
      dispatchClear();
    };

    const addPetProgress = (point: Point, distance: number) => {
      const state = stateRef.current;

      state.petDistance += distance;
      state.pointer = point;

      if (state.elapsedMs - state.lastRubSoundAtMs >= RUB_SOUND_INTERVAL_MS) {
        state.lastRubSoundAtMs = state.elapsedMs;
        state.hearts = [
          ...state.hearts,
          { ...point, createdAtMs: state.elapsedMs },
        ];
      }

      startRubSound();

      if (state.petDistance >= PET_DISTANCE_TO_CLEAR) {
        clearGame();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;
      const point = getPointerPoint(canvas, event, canvasWidth, canvasHeight);
      const dogIndex = getDogIndexAtPoint(
        point,
        imagesRef.current?.background ?? null,
        canvasWidth,
        canvasHeight,
      );

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.isDragging = true;
      state.pointer = point;
      state.previousPointer = point;
      state.activeDogIndex = dogIndex >= 0 ? dogIndex : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;
      const point = getPointerPoint(canvas, event, canvasWidth, canvasHeight);
      const dogIndex = getDogIndexAtPoint(
        point,
        imagesRef.current?.background ?? null,
        canvasWidth,
        canvasHeight,
      );

      state.pointer = point;

      if (!state.isDragging || state.hasCleared) {
        return;
      }

      event.preventDefault();

      const previousPointer = state.previousPointer ?? point;

      state.previousPointer = point;
      state.activeDogIndex = dogIndex >= 0 ? dogIndex : null;

      if (dogIndex < 0) {
        return;
      }

      addPetProgress(point, getDistance(previousPointer, point));
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const state = stateRef.current;

      event.preventDefault();
      state.activeDogIndex = null;
      state.isDragging = false;
      state.previousPointer = null;
      stopRubSound();

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
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
      state.hearts = state.hearts.filter(
        (heart) => state.elapsedMs - heart.createdAtMs <= HEART_LIFETIME_MS,
      );

      if (images) {
        drawScene(context, images, state, canvasWidth, canvasHeight);
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();

    preloadImages()
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
    canvas.addEventListener("pointercancel", handlePointerEnd);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerEnd);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      stopRubSound();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
