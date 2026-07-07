"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const CANVAS_WIDTH = 962;
const CANVAS_HEIGHT = 540;
const DEFAULT_BEAT_DURATION_MS = 500;
const FAILURE_ANIMATION_MS = 520;
const MAX_DELTA_MS = 34;
const MAP_IMAGE_SRC = "/games/battle-ground/images/map.png";
const PLANE_IMAGE_SRC = "/games/battle-ground/images/plane.png";
const PATH_START = { x: 118, y: 376 } as const;
const PATH_END = { x: 846, y: 158 } as const;
const TARGET_START_PROGRESS = 0.58;
const TARGET_END_PROGRESS = 0.71;
const PLANE_LENGTH = 78;
const PLANE_RENDER_HEIGHT = 104;
const PLANE_RENDER_WIDTH = 116;
const PLANE_WINGSPAN = 92;

type UseBattleGroundGameCanvasParams = Readonly<{
  beatCount: number;
  beatDurationMs: number;
  isActive: boolean;
}>;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type GameState = {
  elapsedMs: number;
  failureStartedAtMs: number | null;
  hasCleared: boolean;
  hasFailed: boolean;
  lastTimestamp: number | null;
  missFlashUntilMs: number;
};
type GameImages = {
  map: HTMLImageElement | null;
  plane: HTMLImageElement | null;
};
type GameImageCache = {
  images: GameImages;
  promise: Promise<GameImages> | null;
};
type StoppableSound = Readonly<{
  stop: () => void;
}>;

function createInitialState(): GameState {
  return {
    elapsedMs: 0,
    failureStartedAtMs: null,
    hasCleared: false,
    hasFailed: false,
    lastTimestamp: null,
    missFlashUntilMs: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function getPointAtProgress(progress: number): Point {
  return {
    x: interpolate(PATH_START.x, PATH_END.x, progress),
    y: interpolate(PATH_START.y, PATH_END.y, progress),
  };
}

function getPathAngle() {
  return Math.atan2(PATH_END.y - PATH_START.y, PATH_END.x - PATH_START.x);
}

function isTargetProgress(progress: number) {
  return progress >= TARGET_START_PROGRESS && progress <= TARGET_END_PROGRESS;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      resolve(image);
    }
  });
}

function createGameImageCache(): GameImageCache {
  const images: GameImages = {
    map: null,
    plane: null,
  };

  if (typeof window === "undefined") {
    return {
      images,
      promise: null,
    };
  }

  const promise = Promise.all([
    loadImage(MAP_IMAGE_SRC),
    loadImage(PLANE_IMAGE_SRC),
  ]).then(([map, plane]) => {
    images.map = map;
    images.plane = plane;

    return images;
  });

  return {
    images,
    promise,
  };
}

const battleGroundImageCache = createGameImageCache();

function isImageReady(
  image: HTMLImageElement | null,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function drawCoveredImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  const sourceWidth =
    sourceRatio > targetRatio
      ? image.naturalHeight * targetRatio
      : image.naturalWidth;
  const sourceHeight =
    sourceRatio > targetRatio
      ? image.naturalHeight
      : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
}

function drawTerrain(
  context: CanvasRenderingContext2D,
  map: HTMLImageElement | null,
) {
  if (isImageReady(map)) {
    drawCoveredImage(context, map);

    context.fillStyle = "rgba(2, 6, 23, 0.2)";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);

  gradient.addColorStop(0, "#14312e");
  gradient.addColorStop(0.52, "#24462e");
  gradient.addColorStop(1, "#15281f");

  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = "rgba(238, 228, 170, 0.12)";
  context.beginPath();
  context.moveTo(0, 428);
  context.bezierCurveTo(172, 368, 258, 456, 410, 392);
  context.bezierCurveTo(548, 334, 658, 420, 792, 364);
  context.bezierCurveTo(890, 324, 930, 326, 962, 318);
  context.lineTo(962, 540);
  context.lineTo(0, 540);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(238, 228, 170, 0.16)";
  context.lineWidth = 2;

  for (const x of [88, 184, 284, 392, 506, 626, 742, 850]) {
    context.beginPath();
    context.moveTo(x, 42);
    context.lineTo(x - 66, 514);
    context.stroke();
  }

  for (const y of [86, 156, 230, 302, 378, 452]) {
    context.beginPath();
    context.moveTo(42, y);
    context.lineTo(920, y - 32);
    context.stroke();
  }

  context.fillStyle = "rgba(77, 112, 82, 0.58)";
  for (const hill of [
    { radiusX: 86, radiusY: 32, x: 174, y: 206 },
    { radiusX: 112, radiusY: 42, x: 410, y: 302 },
    { radiusX: 94, radiusY: 34, x: 724, y: 244 },
    { radiusX: 70, radiusY: 28, x: 792, y: 406 },
  ]) {
    context.beginPath();
    context.ellipse(
      hill.x,
      hill.y,
      hill.radiusX,
      hill.radiusY,
      -0.2,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.fillStyle = "rgba(34, 42, 34, 0.46)";
  for (const building of [
    { height: 28, width: 42, x: 254, y: 274 },
    { height: 34, width: 58, x: 606, y: 356 },
    { height: 24, width: 48, x: 706, y: 190 },
    { height: 30, width: 50, x: 142, y: 330 },
  ]) {
    context.fillRect(building.x, building.y, building.width, building.height);
  }
}

function drawSegmentedFlightPath(context: CanvasRenderingContext2D) {
  const segments = 26;
  const gapProgress = 0.006;

  context.lineCap = "round";
  context.lineWidth = 8;

  for (let index = 0; index < segments; index += 1) {
    const startProgress = index / segments + gapProgress;
    const endProgress = (index + 0.62) / segments;
    const start = getPointAtProgress(startProgress);
    const end = getPointAtProgress(endProgress);

    context.strokeStyle = index % 2 === 0 ? "#ef4444" : "#f8fafc";
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  context.lineWidth = 2;
  context.strokeStyle = "rgba(15, 23, 42, 0.28)";
  context.beginPath();
  context.moveTo(PATH_START.x, PATH_START.y);
  context.lineTo(PATH_END.x, PATH_END.y);
  context.stroke();
}

function drawTargetZone(
  context: CanvasRenderingContext2D,
  progress: number,
  elapsedMs: number,
  missFlashUntilMs: number,
) {
  const start = getPointAtProgress(TARGET_START_PROGRESS);
  const end = getPointAtProgress(TARGET_END_PROGRESS);
  const center = getPointAtProgress(
    (TARGET_START_PROGRESS + TARGET_END_PROGRESS) / 2,
  );
  const isInside = isTargetProgress(progress);
  const isMissFlash = elapsedMs < missFlashUntilMs;
  const pulse = 0.5 + Math.sin(elapsedMs / 120) * 0.5;

  context.lineCap = "round";
  context.lineWidth = 28;
  context.strokeStyle = isMissFlash
    ? "rgba(248, 113, 113, 0.58)"
    : isInside
      ? "rgba(74, 222, 128, 0.7)"
      : "rgba(250, 204, 21, 0.56)";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.lineWidth = 4;
  context.strokeStyle = isInside ? "#bbf7d0" : "#fef08a";
  context.beginPath();
  context.arc(center.x, center.y, 58 + pulse * 5, 0, Math.PI * 2);
  context.stroke();
}

function drawPlane(
  context: CanvasRenderingContext2D,
  position: Point,
  angle: number,
  hasCleared: boolean,
  hasFailed: boolean,
  plane: HTMLImageElement | null,
) {
  if (isImageReady(plane)) {
    context.save();
    context.translate(position.x, position.y);
    context.rotate(angle + Math.PI / 2 + (hasFailed ? 0.42 : 0));
    context.shadowBlur = 16;
    context.shadowColor = hasFailed
      ? "rgba(248, 113, 113, 0.9)"
      : "rgba(0, 0, 0, 0.45)";
    context.globalAlpha = hasCleared ? 0.72 : hasFailed ? 0.86 : 1;
    context.drawImage(
      plane,
      -PLANE_RENDER_WIDTH / 2,
      -PLANE_RENDER_HEIGHT / 2,
      PLANE_RENDER_WIDTH,
      PLANE_RENDER_HEIGHT,
    );
    context.restore();
    return;
  }

  context.save();
  context.translate(position.x, position.y);
  context.rotate(angle + (hasFailed ? 0.42 : 0));

  context.fillStyle = hasCleared
    ? "#d9f99d"
    : hasFailed
      ? "#fecaca"
      : "#dbeafe";
  context.strokeStyle = "#0f172a";
  context.lineWidth = 4;
  context.lineJoin = "round";

  context.beginPath();
  context.moveTo(PLANE_LENGTH / 2, 0);
  context.lineTo(10, 13);
  context.lineTo(-PLANE_LENGTH / 2, 10);
  context.lineTo(-PLANE_LENGTH / 2 + 10, 0);
  context.lineTo(-PLANE_LENGTH / 2, -10);
  context.lineTo(10, -13);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = hasCleared
    ? "#86efac"
    : hasFailed
      ? "#f87171"
      : "#93c5fd";
  context.beginPath();
  context.moveTo(2, 0);
  context.lineTo(-24, -PLANE_WINGSPAN / 2);
  context.lineTo(-5, -11);
  context.lineTo(22, 0);
  context.lineTo(-5, 11);
  context.lineTo(-24, PLANE_WINGSPAN / 2);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#0f172a";
  context.fillRect(12, -4, 22, 8);

  context.restore();
}

function drawFailureEffect(
  context: CanvasRenderingContext2D,
  position: Point,
  failureElapsedMs: number,
) {
  const progress = clamp(failureElapsedMs / FAILURE_ANIMATION_MS, 0, 1);
  const ringRadius = 38 + progress * 92;
  const alpha = Math.max(0, 1 - progress);

  context.save();
  context.fillStyle = `rgba(127, 29, 29, ${0.3 * alpha})`;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.strokeStyle = `rgba(248, 113, 113, ${0.85 * alpha})`;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(position.x, position.y, ringRadius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = `rgba(254, 242, 242, ${0.95 * alpha})`;
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(position.x - 34, position.y - 34);
  context.lineTo(position.x + 34, position.y + 34);
  context.moveTo(position.x + 34, position.y - 34);
  context.lineTo(position.x - 34, position.y + 34);
  context.stroke();
  context.restore();
}

function drawParachuteTrail(
  context: CanvasRenderingContext2D,
  position: Point,
  elapsedMs: number,
) {
  const drop = Math.min((elapsedMs % 700) / 700, 1);

  context.strokeStyle = "rgba(191, 219, 254, 0.55)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(position.x - 10, position.y + 24);
  context.lineTo(position.x - 22, position.y + 58 + drop * 16);
  context.moveTo(position.x + 10, position.y + 24);
  context.lineTo(position.x + 22, position.y + 58 + drop * 16);
  context.stroke();

  context.strokeStyle = "rgba(248, 250, 252, 0.75)";
  context.beginPath();
  context.arc(position.x, position.y + 74 + drop * 16, 28, Math.PI, 0);
  context.stroke();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  totalDurationMs: number,
  images: GameImages,
) {
  const planeElapsedMs =
    state.hasFailed && state.failureStartedAtMs !== null
      ? state.failureStartedAtMs
      : state.elapsedMs;
  const progress = clamp(planeElapsedMs / totalDurationMs, 0, 1);
  const planePosition = getPointAtProgress(progress);

  drawTerrain(context, images.map);
  drawTargetZone(context, progress, state.elapsedMs, state.missFlashUntilMs);
  drawSegmentedFlightPath(context);
  drawPlane(
    context,
    planePosition,
    getPathAngle(),
    state.hasCleared,
    state.hasFailed,
    images.plane,
  );

  if (state.hasCleared) {
    drawParachuteTrail(context, planePosition, state.elapsedMs);
  }

  if (state.hasFailed && state.failureStartedAtMs !== null) {
    drawFailureEffect(
      context,
      planePosition,
      state.elapsedMs - state.failureStartedAtMs,
    );
  }
}

export function useBattleGroundGameCanvas({
  beatCount,
  beatDurationMs,
  isActive,
}: UseBattleGroundGameCanvasParams) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<GameImages>(battleGroundImageCache.images);
  const failureTimerRef = useRef<number | null>(null);
  const planeSoundRef = useRef<StoppableSound | null>(null);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    let isDisposed = false;

    imagesRef.current = battleGroundImageCache.images;
    battleGroundImageCache.promise
      ?.then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      stateRef.current = createInitialState();
      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }
      planeSoundRef.current?.stop();
      planeSoundRef.current = null;
      return;
    }

    let isDisposed = false;

    stateRef.current = createInitialState();
    bgmLibrary
      .playSoundEffect("battleGroundPlane")
      .then((playback) => {
        if (
          isDisposed ||
          stateRef.current.hasCleared ||
          stateRef.current.hasFailed
        ) {
          playback.stop();
          return;
        }

        planeSoundRef.current?.stop();
        planeSoundRef.current = playback;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      isDisposed = true;
      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }
      planeSoundRef.current?.stop();
      planeSoundRef.current = null;
    };
  }, [isActive, beatCount]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      const safeBeatDurationMs =
        Number.isFinite(beatDurationMs) && beatDurationMs > 0
          ? beatDurationMs
          : DEFAULT_BEAT_DURATION_MS;
      const totalDurationMs = beatCount * safeBeatDurationMs;
      const progress = clamp(state.elapsedMs / totalDurationMs, 0, 1);

      if (isTargetProgress(progress)) {
        state.hasCleared = true;
        planeSoundRef.current?.stop();
        planeSoundRef.current = null;
        dispatchClear();
        return;
      }

      state.hasFailed = true;
      state.failureStartedAtMs = state.elapsedMs;
      state.missFlashUntilMs = state.elapsedMs + FAILURE_ANIMATION_MS;
      planeSoundRef.current?.stop();
      planeSoundRef.current = null;

      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
      }

      failureTimerRef.current = window.setTimeout(() => {
        failureTimerRef.current = null;
        dispatchFailure();
      }, FAILURE_ANIMATION_MS);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }
    };
  }, [beatCount, beatDurationMs, isActive]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const safeBeatDurationMs =
      Number.isFinite(beatDurationMs) && beatDurationMs > 0
        ? beatDurationMs
        : DEFAULT_BEAT_DURATION_MS;
    const totalDurationMs = beatCount * safeBeatDurationMs;
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrameId = 0;

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const previousTimestamp = state.lastTimestamp ?? timestamp;
      const deltaMs = Math.min(timestamp - previousTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (isActive && !state.hasCleared && !state.hasFailed) {
        state.elapsedMs = Math.min(state.elapsedMs + deltaMs, totalDurationMs);
      }

      canvas.width = Math.floor(CANVAS_WIDTH * pixelRatio);
      canvas.height = Math.floor(CANVAS_HEIGHT * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawScene(context, state, totalDurationMs, imagesRef.current);

      animationFrameId = window.requestAnimationFrame(render);
    };

    render(window.performance.now());

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [beatCount, beatDurationMs, isActive]);

  return canvasRef;
}
