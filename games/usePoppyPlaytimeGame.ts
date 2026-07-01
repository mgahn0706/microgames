"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const POPPY_PLAYTIME_IMAGES = {
  background: "/games/poppy-playtime/images/background.png",
  hand: "/games/poppy-playtime/images/hand.png",
  scanner: "/games/poppy-playtime/images/hand-scanner.png",
} as const;

const CANVAS_HEIGHT = 941;
const CANVAS_WIDTH = 1672;
const DEFAULT_BEAT_DURATION_MS = 500;
const HAND_REST_RECT = {
  height: 158,
  width: 125,
  x: 410,
  y: 654,
} as const;
const HAND_TARGET_RECT = {
  height: 238,
  width: 188,
  x: 739,
  y: 390,
} as const;
const HAND_EXTEND_MS = 210;
const MAX_DELTA_MS = 48;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const SCAN_DURATION_MS = 1180;
const SCAN_SOUND_INTERVAL_MS = 250;
const SCANNER_RECT = {
  height: 456,
  width: 356,
  x: 658,
  y: 278,
} as const;

type PoppyPlaytimeImages = Record<
  keyof typeof POPPY_PLAYTIME_IMAGES,
  HTMLImageElement
>;
type DrawLayout = Readonly<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
type Rect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;
type GameState = {
  elapsedMs: number;
  hasCleared: boolean;
  isHolding: boolean;
  lastScanSoundMs: number;
  lastTimestamp: number | null;
  pointerId: number | null;
  scanMs: number;
  snapMs: number;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function createInitialState() {
  return {
    elapsedMs: 0,
    hasCleared: false,
    isHolding: false,
    lastScanSoundMs: -SCAN_SOUND_INTERVAL_MS,
    lastTimestamp: null,
    pointerId: null,
    scanMs: 0,
    snapMs: 0,
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

function getScanProgress(state: GameState) {
  return clamp(state.scanMs / SCAN_DURATION_MS, 0, 1);
}

function easeOutBack(value: number) {
  const c1 = 1.7;
  const c3 = c1 + 1;

  return 1 + c3 * (value - 1) ** 3 + c1 * (value - 1) ** 2;
}

function getHandExtendProgress(state: GameState) {
  if (state.hasCleared) {
    return 1;
  }

  if (!state.isHolding) {
    return 0;
  }

  return clamp(easeOutBack(state.snapMs / HAND_EXTEND_MS), 0, 1.08);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function playScanSound() {
  bgmLibrary.playSoundEffect("poppyPlaytimeScanning").catch((error: unknown) => {
    console.error(error);
  });
}

function playHandExtendedSound() {
  bgmLibrary
    .playSoundEffect("poppyPlaytimeHandExtended")
    .catch((error: unknown) => {
      console.error(error);
    });
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement,
) {
  if (background.complete && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  context.fillStyle = "#111827";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawScanner(
  context: CanvasRenderingContext2D,
  scanner: HTMLImageElement,
) {
  if (scanner.complete && scanner.naturalWidth > 0) {
    context.drawImage(
      scanner,
      SCANNER_RECT.x,
      SCANNER_RECT.y,
      SCANNER_RECT.width,
      SCANNER_RECT.height,
    );
    return;
  }

  context.fillStyle = "rgba(15, 23, 42, 0.72)";
  context.fillRect(
    SCANNER_RECT.x,
    SCANNER_RECT.y,
    SCANNER_RECT.width,
    SCANNER_RECT.height,
  );
}

function drawHandImage(
  context: CanvasRenderingContext2D,
  hand: HTMLImageElement,
  rect: Rect,
) {
  if (hand.complete && hand.naturalWidth > 0) {
    context.drawImage(hand, rect.x, rect.y, rect.width, rect.height);
    return;
  }

  context.fillStyle = "#38bdf8";
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, 44);
  context.fill();
}

function drawExtendedHand(
  context: CanvasRenderingContext2D,
  hand: HTMLImageElement,
  state: GameState,
) {
  const extendProgress = getHandExtendProgress(state);
  const contactPulse =
    state.isHolding || state.hasCleared
      ? Math.sin(state.elapsedMs * 0.036) * 5
      : 0;
  const handRect = {
    height: interpolate(HAND_REST_RECT.height, HAND_TARGET_RECT.height, extendProgress),
    width: interpolate(HAND_REST_RECT.width, HAND_TARGET_RECT.width, extendProgress),
    x: interpolate(HAND_REST_RECT.x, HAND_TARGET_RECT.x, extendProgress),
    y:
      interpolate(HAND_REST_RECT.y, HAND_TARGET_RECT.y, extendProgress) +
      contactPulse,
  } as const;
  const wristStart = {
    x: HAND_REST_RECT.x + HAND_REST_RECT.width / 2,
    y: HAND_REST_RECT.y + HAND_REST_RECT.height,
  };
  const wristEnd = {
    x: handRect.x + handRect.width / 2,
    y: handRect.y + handRect.height * 0.82,
  };

  context.save();
  context.lineCap = "round";
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "rgba(24, 117, 255, 0.88)";
  context.lineWidth = 34;
  context.beginPath();
  context.moveTo(wristStart.x, wristStart.y);
  context.lineTo(wristEnd.x, wristEnd.y);
  context.stroke();

  context.strokeStyle = "rgba(74, 201, 255, 0.82)";
  context.lineWidth = 15;
  context.beginPath();
  context.moveTo(wristStart.x, wristStart.y);
  context.lineTo(wristEnd.x, wristEnd.y);
  context.stroke();

  if (state.isHolding && state.snapMs < HAND_EXTEND_MS + 130) {
    const streakAlpha = 1 - clamp(state.snapMs / (HAND_EXTEND_MS + 130), 0, 1);

    context.strokeStyle = `rgba(178, 236, 255, ${0.56 * streakAlpha})`;
    context.lineWidth = 7;
    context.setLineDash([34, 22]);
    Array.from({ length: 3 }).forEach((_, index) => {
      const offset = (index - 1) * 22;

      context.beginPath();
      context.moveTo(wristStart.x - 24, wristStart.y + offset);
      context.lineTo(wristEnd.x - 62, wristEnd.y + offset * 0.25);
      context.stroke();
    });
    context.setLineDash([]);
  }

  if (extendProgress > 0.92) {
    const gripAlpha = state.hasCleared ? 0.95 : 0.56;

    context.strokeStyle = `rgba(125, 255, 196, ${gripAlpha})`;
    context.lineWidth = 8;
    context.beginPath();
    context.roundRect(
      HAND_TARGET_RECT.x - 12,
      HAND_TARGET_RECT.y - 12 + contactPulse,
      HAND_TARGET_RECT.width + 24,
      HAND_TARGET_RECT.height + 24,
      42,
    );
    context.stroke();
  }

  drawHandImage(context, hand, handRect);
  context.restore();
}

function drawGauge(context: CanvasRenderingContext2D, state: GameState) {
  const progress = getScanProgress(state);
  const x = SCANNER_RECT.x + 42;
  const y = SCANNER_RECT.y + SCANNER_RECT.height - 86;
  const width = SCANNER_RECT.width - 84;
  const height = 24;

  context.save();
  context.fillStyle = "rgba(5, 8, 18, 0.72)";
  context.strokeStyle = "rgba(125, 211, 252, 0.72)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x, y, width, height, 12);
  context.fill();
  context.stroke();

  const gradient = context.createLinearGradient(x, y, x + width, y);

  gradient.addColorStop(0, "#0284c7");
  gradient.addColorStop(0.55, "#38bdf8");
  gradient.addColorStop(1, "#e0f2fe");
  context.shadowBlur = 18;
  context.shadowColor = "rgba(56, 189, 248, 0.86)";
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(x, y, width * progress, height, 12);
  context.fill();
  context.restore();
}

function drawScanEffects(context: CanvasRenderingContext2D, state: GameState) {
  const progress = getScanProgress(state);
  const scannerInnerX = SCANNER_RECT.x + 44;
  const scannerInnerY = SCANNER_RECT.y + 68;
  const scannerInnerWidth = SCANNER_RECT.width - 88;
  const scannerInnerHeight = SCANNER_RECT.height - 150;
  const sweepX = scannerInnerX + scannerInnerWidth * progress;

  context.save();
  context.globalCompositeOperation = "lighter";

  if ((state.isHolding || state.hasCleared) && getHandExtendProgress(state) > 0.82) {
    const pulse = 0.58 + Math.sin(state.elapsedMs * 0.024) * 0.18;

    context.fillStyle = `rgba(56, 189, 248, ${0.12 + progress * 0.16})`;
    context.fillRect(
      scannerInnerX,
      scannerInnerY,
      scannerInnerWidth,
      scannerInnerHeight,
    );
    context.strokeStyle = `rgba(186, 230, 253, ${pulse})`;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(sweepX, scannerInnerY + 12);
    context.lineTo(sweepX, scannerInnerY + scannerInnerHeight - 12);
    context.stroke();

    Array.from({ length: 5 }).forEach((_, index) => {
      const offset = (index - 2) * 28;

      context.strokeStyle = `rgba(56, 189, 248, ${
        0.22 - Math.abs(index - 2) * 0.04
      })`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(sweepX + offset, scannerInnerY + 28);
      context.lineTo(sweepX + offset, scannerInnerY + scannerInnerHeight - 28);
      context.stroke();
    });
  }

  if (state.hasCleared) {
    context.strokeStyle = "rgba(125, 255, 196, 0.92)";
    context.lineWidth = 10;
    context.beginPath();
    context.roundRect(
      scannerInnerX - 12,
      scannerInnerY - 12,
      scannerInnerWidth + 24,
      scannerInnerHeight + 24,
      44,
    );
    context.stroke();
  }

  context.restore();
}

function drawRoundTimer(
  context: CanvasRenderingContext2D,
  remainingRatio: number,
) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.24)";
  context.fillRect(510, 844, 652, 7);
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fillRect(510, 844, 652 * remainingRatio, 7);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: PoppyPlaytimeImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);

  const layout = getDrawLayout(width, height);

  context.save();
  context.translate(layout.offsetX, layout.offsetY);
  context.scale(layout.scale, layout.scale);

  drawBackground(context, images.background);
  drawScanner(context, images.scanner);
  drawScanEffects(context, state);
  drawExtendedHand(context, images.hand, state);
  drawGauge(context, state);
  drawRoundTimer(context, remainingRatio);

  context.restore();
}

export function usePoppyPlaytimeGameCanvas(gameBeatCount: number) {
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
    const pixelRatio = window.devicePixelRatio || 1;
    const images = {
      background: createImage(POPPY_PLAYTIME_IMAGES.background),
      hand: createImage(POPPY_PLAYTIME_IMAGES.hand),
      scanner: createImage(POPPY_PLAYTIME_IMAGES.scanner),
    } satisfies PoppyPlaytimeImages;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const stopScan = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.pointerId !== event.pointerId || state.hasCleared) {
        return;
      }

      state.isHolding = false;
      state.pointerId = null;
      state.scanMs = 0;
      state.snapMs = 0;
      state.lastScanSoundMs = -SCAN_SOUND_INTERVAL_MS;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.isHolding = true;
      state.pointerId = event.pointerId;
      state.scanMs = 0;
      state.snapMs = 0;
      state.lastScanSoundMs = -SCAN_SOUND_INTERVAL_MS;
      playHandExtendedSound();
      playScanSound();
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

      if (state.isHolding && !state.hasCleared) {
        state.snapMs += deltaMs;
        state.scanMs += deltaMs;

        if (state.scanMs - state.lastScanSoundMs >= SCAN_SOUND_INTERVAL_MS) {
          state.lastScanSoundMs = state.scanMs;
          playScanSound();
        }

        if (state.scanMs >= SCAN_DURATION_MS) {
          state.hasCleared = true;
          state.isHolding = false;
          state.pointerId = null;
          dispatchClear();
        }
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
    canvas.addEventListener("pointerup", stopScan);
    canvas.addEventListener("pointercancel", stopScan);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", stopScan);
      canvas.removeEventListener("pointercancel", stopScan);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
