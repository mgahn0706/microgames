"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const DAVE_THE_DIVER_IMAGES = {
  background: "/games/dave-the-diver/images/background.png",
  clownfish: "/games/dave-the-diver/images/clownfish.png",
  diver: "/games/dave-the-diver/images/diver.png",
} as const;

const AIM_ORIGIN = { x: 455, y: 548 } as const;
const CANVAS_HEIGHT = 941;
const CANVAS_WIDTH = 1672;
const CHARGE_MS = 900;
const CLOWNFISH = {
  height: 82,
  width: 112,
  x: 1055,
  y: 438,
} as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const DIVER = {
  height: 330,
  width: 330,
  x: 180,
  y: 365,
} as const;
const GIG_LENGTH = 780;
const MAX_DELTA_MS = 48;
const MIN_HIT_CHARGE_RATIO = 0.52;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const SHOT_DURATION_MS = 260;
const SHOT_FADE_MS = 220;
const SWEEP_PERIOD_MS = 2850;
const SWEEP_WIDTH_RADIANS = 0.28;
const TARGET_ANGLE_RADIANS = -0.105;

type DaveTheDiverImages = Record<
  keyof typeof DAVE_THE_DIVER_IMAGES,
  HTMLImageElement
>;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type DrawLayout = Readonly<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
type GameState = {
  chargeMs: number;
  elapsedMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  isHolding: boolean;
  lastTimestamp: number | null;
  pointerId: number | null;
  shotAngle: number;
  shotAtMs: number | null;
  shotHit: boolean;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function createInitialState() {
  return {
    chargeMs: 0,
    elapsedMs: 0,
    hasCleared: false,
    hasFailed: false,
    isHolding: false,
    lastTimestamp: null,
    pointerId: null,
    shotAngle: TARGET_ANGLE_RADIANS,
    shotAtMs: null,
    shotHit: false,
  } satisfies GameState;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function getDrawLayout(width: number, height: number) {
  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);

  return {
    offsetX: (width - CANVAS_WIDTH * scale) / 2,
    offsetY: (height - CANVAS_HEIGHT * scale) / 2,
    scale,
  } satisfies DrawLayout;
}

function getPointerPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  layout: DrawLayout,
) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - bounds.left - layout.offsetX) / layout.scale,
    y: (event.clientY - bounds.top - layout.offsetY) / layout.scale,
  } satisfies Point;
}

function getChargeRatio(state: GameState) {
  return clamp(state.chargeMs / CHARGE_MS, 0, 1);
}

function getWiperSweepValue(elapsedMs: number) {
  const cycleProgress = (elapsedMs % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
  const linearSweep =
    cycleProgress < 0.5 ? cycleProgress * 4 - 1 : 3 - cycleProgress * 4;
  const edgeEase = Math.sin((linearSweep * Math.PI) / 2);

  return edgeEase;
}

function getBaseAimAngle(state: GameState) {
  return (
    TARGET_ANGLE_RADIANS +
    getWiperSweepValue(state.elapsedMs) * SWEEP_WIDTH_RADIANS
  );
}

function getAimAngle(state: GameState) {
  return getBaseAimAngle(state);
}

function getShotEnd(angle: number, progress = 1) {
  return {
    x: AIM_ORIGIN.x + Math.cos(angle) * GIG_LENGTH * progress,
    y: AIM_ORIGIN.y + Math.sin(angle) * GIG_LENGTH * progress,
  } satisfies Point;
}

function getDistanceFromSegmentToPoint(start: Point, end: Point, point: Point) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestPoint = {
    x: start.x + segmentX * t,
    y: start.y + segmentY * t,
  };

  return Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y);
}

function isShotHit(angle: number) {
  const fishCenter = {
    x: CLOWNFISH.x + CLOWNFISH.width / 2,
    y: CLOWNFISH.y + CLOWNFISH.height / 2,
  };
  const distance = getDistanceFromSegmentToPoint(
    AIM_ORIGIN,
    getShotEnd(angle),
    fishCenter,
  );

  return distance <= Math.min(CLOWNFISH.width, CLOWNFISH.height) * 0.45;
}

function playGigSound() {
  bgmLibrary.playSoundEffect("daveTheDiverGig").catch((error: unknown) => {
    console.error(error);
  });
}

function fireGig(state: GameState) {
  if (
    !state.isHolding ||
    state.hasCleared ||
    state.hasFailed ||
    state.shotAtMs !== null
  ) {
    return;
  }

  const angle = getAimAngle(state);
  const shotHit =
    getChargeRatio(state) >= MIN_HIT_CHARGE_RATIO && isShotHit(angle);

  state.isHolding = false;
  state.pointerId = null;
  state.shotAngle = angle;
  state.shotAtMs = state.elapsedMs;
  state.shotHit = shotHit;
  playGigSound();

  if (shotHit) {
    state.hasCleared = true;
    dispatchClear();
    return;
  }

  state.hasFailed = true;
  dispatchFailure();
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement,
) {
  if (background.complete && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);

  gradient.addColorStop(0, "#0cb8ff");
  gradient.addColorStop(1, "#036dba");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawDiver(context: CanvasRenderingContext2D, diver: HTMLImageElement) {
  if (diver.complete && diver.naturalWidth > 0) {
    context.drawImage(diver, DIVER.x, DIVER.y, DIVER.width, DIVER.height);
    return;
  }

  context.fillStyle = "#f59e0b";
  context.beginPath();
  context.arc(AIM_ORIGIN.x - 70, AIM_ORIGIN.y, 88, 0, Math.PI * 2);
  context.fill();
}

function drawClownfish(
  context: CanvasRenderingContext2D,
  clownfish: HTMLImageElement,
  state: GameState,
) {
  if (state.shotHit && state.shotAtMs !== null) {
    const hitElapsedMs = state.elapsedMs - state.shotAtMs - SHOT_DURATION_MS;
    const alpha = 1 - clamp(hitElapsedMs / SHOT_FADE_MS, 0, 1);

    context.save();
    context.globalAlpha = alpha;
    context.translate(0, -Math.max(hitElapsedMs, 0) * 0.08);
  }

  if (clownfish.complete && clownfish.naturalWidth > 0) {
    context.drawImage(
      clownfish,
      CLOWNFISH.x,
      CLOWNFISH.y,
      CLOWNFISH.width,
      CLOWNFISH.height,
    );
  } else {
    context.fillStyle = "#f97316";
    context.beginPath();
    context.ellipse(
      CLOWNFISH.x + CLOWNFISH.width / 2,
      CLOWNFISH.y + CLOWNFISH.height / 2,
      CLOWNFISH.width / 2,
      CLOWNFISH.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  if (state.shotHit && state.shotAtMs !== null) {
    context.restore();
  }
}

function drawAimLine(context: CanvasRenderingContext2D, state: GameState) {
  const angle = getAimAngle(state);
  const end = getShotEnd(angle, 0.72);
  const chargeRatio = getChargeRatio(state);

  context.save();
  context.lineCap = "round";
  context.lineWidth = 7;
  context.strokeStyle = `rgba(5, 10, 16, ${0.38 + chargeRatio * 0.46})`;
  context.setLineDash([18, 18]);
  context.beginPath();
  context.moveTo(AIM_ORIGIN.x, AIM_ORIGIN.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "rgba(5, 10, 16, 0.86)";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(AIM_ORIGIN.x, AIM_ORIGIN.y, 34 + chargeRatio * 22, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawGigShot(context: CanvasRenderingContext2D, state: GameState) {
  if (state.shotAtMs === null) {
    return;
  }

  const shotElapsedMs = state.elapsedMs - state.shotAtMs;
  const fadeElapsedMs = shotElapsedMs - SHOT_DURATION_MS;

  if (fadeElapsedMs > SHOT_FADE_MS) {
    return;
  }

  const progress = clamp(shotElapsedMs / SHOT_DURATION_MS, 0, 1);
  const alpha = 1 - clamp(fadeElapsedMs / SHOT_FADE_MS, 0, 1);
  const end = getShotEnd(state.shotAngle, progress);

  context.save();
  context.globalAlpha = alpha;
  context.lineCap = "round";
  context.strokeStyle = "rgba(5, 8, 12, 0.96)";
  context.lineWidth = 9;
  context.shadowBlur = state.shotHit ? 18 : 8;
  context.shadowColor = state.shotHit
    ? "rgba(255, 245, 160, 0.62)"
    : "rgba(0, 0, 0, 0.38)";
  context.beginPath();
  context.moveTo(AIM_ORIGIN.x, AIM_ORIGIN.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.fillStyle = context.strokeStyle;
  context.beginPath();
  context.arc(end.x, end.y, 11, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawChargeGauge(context: CanvasRenderingContext2D, state: GameState) {
  const chargeRatio = getChargeRatio(state);

  context.save();
  context.fillStyle = "rgba(0, 51, 86, 0.56)";
  context.strokeStyle = "rgba(255, 255, 255, 0.62)";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(548, 792, 576, 34, 17);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255, 214, 74, 0.92)";
  context.beginPath();
  context.roundRect(548, 792, 576 * chargeRatio, 34, 17);
  context.fill();
  context.restore();
}

function drawRoundTimer(context: CanvasRenderingContext2D, remainingRatio: number) {
  context.save();
  context.fillStyle = "rgba(226, 244, 255, 0.32)";
  context.fillRect(548, 842, 576, 8);
  context.fillStyle = "rgba(226, 244, 255, 0.86)";
  context.fillRect(548, 842, 576 * remainingRatio, 8);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: DaveTheDiverImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#009fe8";
  context.fillRect(0, 0, width, height);

  const layout = getDrawLayout(width, height);

  context.save();
  context.translate(layout.offsetX, layout.offsetY);
  context.scale(layout.scale, layout.scale);

  drawBackground(context, images.background);
  drawClownfish(context, images.clownfish, state);

  if (state.isHolding) {
    drawAimLine(context, state);
  }

  drawGigShot(context, state);
  drawDiver(context, images.diver);
  drawChargeGauge(context, state);
  drawRoundTimer(context, remainingRatio);

  context.restore();
}

export function useDaveTheDiverGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let layout = getDrawLayout(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT);
    const pixelRatio = window.devicePixelRatio || 1;
    const images = {
      background: createImage(DAVE_THE_DIVER_IMAGES.background),
      clownfish: createImage(DAVE_THE_DIVER_IMAGES.clownfish),
      diver: createImage(DAVE_THE_DIVER_IMAGES.diver),
    } satisfies DaveTheDiverImages;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      layout = getDrawLayout(canvasWidth, canvasHeight);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared || state.shotAtMs !== null) {
        return;
      }

      const point = getPointerPoint(canvas, event, layout);

      if (point.x < DIVER.x || point.x > CANVAS_WIDTH || point.y < 0) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.isHolding = true;
      state.pointerId = event.pointerId;
      state.chargeMs = 0;
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.isHolding || state.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      fireGig(state);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.pointerId === event.pointerId) {
        fireGig(state);
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaMs;

      if (state.isHolding) {
        state.chargeMs += deltaMs;
      }

      drawScene(
        context,
        images,
        state,
        canvasWidth,
        canvasHeight,
        clamp((phaseDurationMs - state.elapsedMs) / phaseDurationMs, 0, 1),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
