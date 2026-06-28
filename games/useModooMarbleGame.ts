"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_MS = 50;
const GAUGE_CYCLE_MS = 1180;
const RESULT_POPUP_DELAY_MS = 620;
const SEGMENT_RESULTS = [2, 7, 9, 12] as const;
const MODOO_MARBLE_ASSETS = {
  background: "/games/modoo-marble/images/background.webp",
  buttonIdle: "/games/modoo-marble/images/roll-button-idle.png",
  buttonPressed: "/games/modoo-marble/images/roll-button-pressed.png",
} as const;

type AssetKey = keyof typeof MODOO_MARBLE_ASSETS;

type BackgroundLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type Rect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type GameState = {
  gaugeElapsedMs: number;
  hasResolved: boolean;
  isHolding: boolean;
  lastTimestamp: number | null;
  result: (typeof SEGMENT_RESULTS)[number] | null;
  resultAtMs: number;
  selectedSegmentIndex: number | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
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
    scale,
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

function isPointInRect(point: Point, rect: Rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getButtonRect(width: number, height: number) {
  const buttonWidth = Math.min(width * 0.46, 360);
  const buttonHeight = buttonWidth * 0.62;

  return {
    height: buttonHeight,
    width: buttonWidth,
    x: width * 0.5 - buttonWidth / 2,
    y: height * 0.65 - buttonHeight / 2,
  } satisfies Rect;
}

function getGaugeProgress(elapsedMs: number) {
  const phase = (elapsedMs % GAUGE_CYCLE_MS) / GAUGE_CYCLE_MS;

  return phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
}

function getSegmentIndex(progress: number) {
  return Math.min(Math.floor(progress * SEGMENT_RESULTS.length), 3);
}

function createInitialState() {
  return {
    gaugeElapsedMs: 0,
    hasResolved: false,
    isHolding: false,
    lastTimestamp: null,
    result: null,
    resultAtMs: 0,
    selectedSegmentIndex: null,
  } satisfies GameState;
}

function loadImages() {
  return (Object.keys(MODOO_MARBLE_ASSETS) as AssetKey[]).reduce<
    Partial<Record<AssetKey, HTMLImageElement>>
  >((images, assetKey) => {
    const image = new Image();

    image.src = MODOO_MARBLE_ASSETS[assetKey];

    return {
      ...images,
      [assetKey]: image,
    };
  }, {});
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  width: number,
  height: number,
) {
  if (isImageReady(image)) {
    const layout = getCoverLayout(image, width, height);

    context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
    return;
  }

  const gradient = context.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#261343");
  gradient.addColorStop(0.52, "#4f246c");
  gradient.addColorStop(1, "#160c2a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawGaugeTrack(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  activeProgress: number,
  selectedSegmentIndex: number | null,
) {
  const startAngle = Math.PI + 0.04;
  const endAngle = Math.PI * 2 - 0.04;
  const fillEndAngle = startAngle + (endAngle - startAngle) * activeProgress;
  const selectedProgress =
    selectedSegmentIndex === null
      ? null
      : (selectedSegmentIndex + 1) / SEGMENT_RESULTS.length;

  context.save();
  context.lineCap = "round";
  context.lineWidth = 21;
  context.strokeStyle = "rgba(255, 255, 255, 0.24)";
  context.beginPath();
  context.arc(centerX, centerY, radius, startAngle, endAngle);
  context.stroke();

  if (activeProgress > 0) {
    const gradient = context.createLinearGradient(
      centerX - radius,
      centerY,
      centerX + radius,
      centerY,
    );

    gradient.addColorStop(0, "#fb71c6");
    gradient.addColorStop(0.55, "#d946ef");
    gradient.addColorStop(1, "#8b5cf6");
    context.shadowBlur = 22;
    context.shadowColor = "rgba(232, 121, 249, 0.76)";
    context.strokeStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, startAngle, fillEndAngle);
    context.stroke();
  }

  if (selectedProgress !== null) {
    const markerAngle = startAngle + (endAngle - startAngle) * selectedProgress;
    const markerX = centerX + Math.cos(markerAngle) * radius;
    const markerY = centerY + Math.sin(markerAngle) * radius;

    context.shadowBlur = 24;
    context.shadowColor = "rgba(255, 255, 255, 0.82)";
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(markerX, markerY, 13, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#7c3aed";
    context.beginPath();
    context.arc(markerX, markerY, 6, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawResultZone(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  activeProgress: number,
  selectedSegmentIndex: number | null,
) {
  const startAngle = Math.PI + 0.04;
  const endAngle = Math.PI * 2 - 0.04;
  const finalStartAngle =
    startAngle + (endAngle - startAngle) * (3 / SEGMENT_RESULTS.length);
  const isInFinalZone = activeProgress >= 3 / SEGMENT_RESULTS.length;
  const isFinalSelected = selectedSegmentIndex === 3;

  context.save();
  context.lineCap = "round";
  context.lineWidth = isFinalSelected ? 7 : 5;
  context.strokeStyle =
    isInFinalZone || isFinalSelected
      ? "rgba(255, 255, 255, 0.88)"
      : "rgba(255, 255, 255, 0.34)";
  context.beginPath();
  context.arc(centerX, centerY, radius + 31, finalStartAngle, endAngle);
  context.stroke();
  context.restore();
}

function drawGauge(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  const centerX = width * 0.5;
  const centerY = height * 0.64;
  const radius = Math.min(width * 0.28, height * 0.31, 210);
  const activeProgress =
    state.result === null ? getGaugeProgress(state.gaugeElapsedMs) : 0;

  context.save();
  context.fillStyle = "rgba(22, 12, 42, 0.48)";
  context.beginPath();
  context.ellipse(centerX, centerY, radius + 46, radius * 0.52, 0, 0, Math.PI);
  context.fill();
  context.restore();

  drawResultZone(
    context,
    centerX,
    centerY,
    radius,
    activeProgress,
    state.selectedSegmentIndex,
  );
  drawGaugeTrack(
    context,
    centerX,
    centerY,
    radius,
    activeProgress,
    state.selectedSegmentIndex,
  );
}

function drawButton(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  state: GameState,
  width: number,
  height: number,
) {
  const rect = getButtonRect(width, height);
  const image = state.isHolding ? images.buttonPressed : images.buttonIdle;

  context.save();
  context.shadowBlur = state.isHolding ? 22 : 12;
  context.shadowColor = state.isHolding
    ? "rgba(216, 180, 254, 0.75)"
    : "rgba(244, 114, 182, 0.45)";

  if (isImageReady(image)) {
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  } else {
    const gradient = context.createLinearGradient(
      rect.x,
      rect.y,
      rect.x,
      rect.y + rect.height,
    );

    gradient.addColorStop(0, state.isHolding ? "#c026d3" : "#f472b6");
    gradient.addColorStop(1, state.isHolding ? "#7c3aed" : "#a855f7");
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(rect.x, rect.y, rect.width, rect.height, 22);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = `700 ${Math.max(18, rect.height * 0.22)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("ROLL", rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  context.restore();
}

function drawResultPopup(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  if (state.result === null) {
    return;
  }

  const elapsedMs = performance.now() - state.resultAtMs;
  const popProgress = Math.min(elapsedMs / 180, 1);
  const holdProgress = Math.min(elapsedMs / RESULT_POPUP_DELAY_MS, 1);
  const radius = (48 + 18 * Math.sin(popProgress * Math.PI)) * popProgress;
  const centerX = width * 0.5;
  const centerY = height * 0.38 - holdProgress * 8;

  context.save();
  context.shadowBlur = 28;
  context.shadowColor = "rgba(255, 255, 255, 0.65)";
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(centerX, centerY, Math.max(radius, 28), 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(168, 85, 247, 0.5)";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#111111";
  context.font = `900 ${Math.max(32, radius * 0.72)}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(state.result), centerX, centerY + 2);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  state: GameState,
  width: number,
  height: number,
) {
  drawBackground(context, images.background, width, height);
  drawGauge(context, state, width, height);
  drawButton(context, images, state, width, height);
  drawResultPopup(context, state, width, height);
}

function playDiceRollSound() {
  bgmLibrary.playSoundEffect("modooDiceRoll").catch((error: unknown) => {
    console.error(error);
  });
}

export function useModooMarbleGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    imagesRef.current = loadImages();
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

    let canvasWidth = MIN_CANVAS_WIDTH;
    let canvasHeight = MIN_CANVAS_HEIGHT;

    const resizeCanvas = () => {
      const width = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
      const height = Math.max(window.innerHeight, MIN_CANVAS_HEIGHT);
      const pixelRatio = window.devicePixelRatio || 1;

      canvasWidth = width;
      canvasHeight = height;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resolveResult = (result: (typeof SEGMENT_RESULTS)[number]) => {
      if (stateRef.current.hasResolved) {
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        hasResolved: true,
      };

      if (result === 12) {
        dispatchClear();
        return;
      }

      dispatchFailure();
    };

    const releaseGauge = () => {
      const state = stateRef.current;

      if (!state.isHolding || state.hasResolved || state.result !== null) {
        return;
      }

      const progress = getGaugeProgress(state.gaugeElapsedMs);
      const segmentIndex = getSegmentIndex(progress);
      const result = SEGMENT_RESULTS[segmentIndex];

      stateRef.current = {
        ...state,
        isHolding: false,
        result,
        resultAtMs: performance.now(),
        selectedSegmentIndex: segmentIndex,
      };
      playDiceRollSound();
      timeoutRef.current = window.setTimeout(() => {
        resolveResult(result);
      }, RESULT_POPUP_DELAY_MS);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasResolved || state.result !== null) {
        return;
      }

      const point = getPointerPoint(canvas, event);

      if (!isPointInRect(point, getButtonRect(canvasWidth, canvasHeight))) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      stateRef.current = {
        ...state,
        gaugeElapsedMs: 0,
        isHolding: true,
        selectedSegmentIndex: null,
      };
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      stateRef.current = {
        ...state,
        gaugeElapsedMs: state.isHolding
          ? state.gaugeElapsedMs + deltaMs
          : state.gaugeElapsedMs,
        lastTimestamp: timestamp,
      };
      drawScene(
        context,
        imagesRef.current,
        stateRef.current,
        canvasWidth,
        canvasHeight,
      );
      frameRef.current = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    canvas.addEventListener("pointerup", releaseGauge);
    canvas.addEventListener("pointercancel", releaseGauge);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      canvas.removeEventListener("pointerup", releaseGauge);
      canvas.removeEventListener("pointercancel", releaseGauge);
    };
  }, []);

  return canvasRef;
}
