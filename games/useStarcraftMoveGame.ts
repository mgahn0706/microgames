"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

type Point = Readonly<{
  x: number;
  y: number;
}>;

type Rect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

const BACKGROUND_HEIGHT = 1242;
const BACKGROUND_WIDTH = 2264;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_MS = 50;
const DRAGOON_WORLD_UNITS_PER_BEAT = 920;
const DRAGOON_FRAME_HEIGHT = 190;
const DRAGOON_HIT_RADIUS = 106;
const ARRIVAL_RADIUS = 44;
const MOVE_FRAME_MS = 118;
const DRAGOON_START = { x: 415, y: 785 } satisfies Point;
const MINERAL_TARGET = { x: 1875, y: 735 } satisfies Point;
const MINERAL_HOTSPOT = {
  height: 360,
  width: 520,
  x: 1658,
  y: 498,
} satisfies Rect;
const STARCRAFT_ASSETS = {
  background: "/games/starcraft/images/background.webp",
  idle: "/games/starcraft/images/idle.png",
  moving1: "/games/starcraft/images/moving-1.png",
  moving2: "/games/starcraft/images/moving-2.png",
  moving3: "/games/starcraft/images/moving-3.png",
} as const;
const MOVING_ASSET_KEYS = ["moving1", "moving2", "moving3"] as const;

type AssetKey = keyof typeof STARCRAFT_ASSETS;

type BackgroundLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type GameState = {
  dragoon: Point;
  frameElapsedMs: number;
  hasCleared: boolean;
  isSelected: boolean;
  lastTimestamp: number | null;
  moveTarget: Point | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createInitialState() {
  return {
    dragoon: DRAGOON_START,
    frameElapsedMs: 0,
    hasCleared: false,
    isSelected: false,
    lastTimestamp: null,
    moveTarget: null,
  } satisfies GameState;
}

function loadImages() {
  return (Object.keys(STARCRAFT_ASSETS) as AssetKey[]).reduce<
    Partial<Record<AssetKey, HTMLImageElement>>
  >((images, assetKey) => {
    const image = new Image();

    image.src = STARCRAFT_ASSETS[assetKey];

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

function getContainLayout(width: number, height: number) {
  const scale = Math.min(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);
  const drawWidth = BACKGROUND_WIDTH * scale;
  const drawHeight = BACKGROUND_HEIGHT * scale;

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

function getWorldPoint(point: Point, layout: BackgroundLayout) {
  return {
    x: (point.x - layout.x) / layout.scale,
    y: (point.y - layout.y) / layout.scale,
  } satisfies Point;
}

function getCanvasPoint(point: Point, layout: BackgroundLayout) {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale,
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

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function playMoveVoice() {
  bgmLibrary.playSoundEffect("starcraftMove").catch((error: unknown) => {
    console.error(error);
  });
}

function drawFallbackBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#17210f");
  gradient.addColorStop(0.58, "#2f421d");
  gradient.addColorStop(1, "#1b120c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawSelectionCircle(
  context: CanvasRenderingContext2D,
  dragoon: Point,
  layout: BackgroundLayout,
) {
  const center = getCanvasPoint({ x: dragoon.x, y: dragoon.y - 16 }, layout);

  context.save();
  context.lineWidth = Math.max(2, 4 * layout.scale);
  context.strokeStyle = "#58ff56";
  context.shadowBlur = 12 * layout.scale;
  context.shadowColor = "rgba(88, 255, 86, 0.75)";
  context.beginPath();
  context.ellipse(
    center.x,
    center.y,
    78 * layout.scale,
    32 * layout.scale,
    0,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
}

function drawGuideLabel(
  context: CanvasRenderingContext2D,
  text: string,
  point: Point,
  layout: BackgroundLayout,
) {
  const center = getCanvasPoint(point, layout);
  const fontSize = Math.max(16, 30 * layout.scale);
  const paddingX = Math.max(10, 18 * layout.scale);
  const paddingY = Math.max(6, 10 * layout.scale);

  context.save();
  context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const labelWidth = context.measureText(text).width + paddingX * 2;
  const labelHeight = fontSize + paddingY * 2;

  context.fillStyle = "rgba(3, 12, 6, 0.86)";
  context.strokeStyle = "rgba(88, 255, 86, 0.95)";
  context.lineWidth = Math.max(2, 3 * layout.scale);
  context.shadowBlur = 16 * layout.scale;
  context.shadowColor = "rgba(88, 255, 86, 0.62)";
  context.beginPath();
  context.roundRect(
    center.x - labelWidth / 2,
    center.y - labelHeight / 2,
    labelWidth,
    labelHeight,
    Math.max(6, 8 * layout.scale),
  );
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "#dcffdc";
  context.fillText(text, center.x, center.y);
  context.restore();
}

function drawSelectGuide(
  context: CanvasRenderingContext2D,
  frameElapsedMs: number,
  dragoon: Point,
  layout: BackgroundLayout,
) {
  const center = getCanvasPoint({ x: dragoon.x, y: dragoon.y - 16 }, layout);
  const pulse = 0.5 + 0.5 * Math.sin(frameElapsedMs / 130);
  const radiusX = (98 + pulse * 16) * layout.scale;
  const radiusY = (42 + pulse * 7) * layout.scale;

  context.save();
  context.lineWidth = Math.max(3, 5 * layout.scale);
  context.strokeStyle = `rgba(88, 255, 86, ${0.68 + pulse * 0.24})`;
  context.shadowBlur = 18 * layout.scale;
  context.shadowColor = "rgba(88, 255, 86, 0.82)";
  context.beginPath();
  context.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(center.x, center.y - radiusY - 62 * layout.scale);
  context.lineTo(center.x, center.y - radiusY - 12 * layout.scale);
  context.stroke();
  context.restore();

  drawGuideLabel(
    context,
    "먼저 선택",
    { x: dragoon.x, y: dragoon.y - 230 },
    layout,
  );
}

function drawMineralGuide(
  context: CanvasRenderingContext2D,
  frameElapsedMs: number,
  layout: BackgroundLayout,
) {
  const topLeft = getCanvasPoint(
    { x: MINERAL_HOTSPOT.x, y: MINERAL_HOTSPOT.y },
    layout,
  );
  const width = MINERAL_HOTSPOT.width * layout.scale;
  const height = MINERAL_HOTSPOT.height * layout.scale;
  const pulse = 0.5 + 0.5 * Math.sin(frameElapsedMs / 115);

  context.save();
  context.strokeStyle = `rgba(88, 255, 86, ${0.5 + pulse * 0.3})`;
  context.lineWidth = Math.max(3, 5 * layout.scale);
  context.shadowBlur = 18 * layout.scale;
  context.shadowColor = "rgba(88, 255, 86, 0.62)";
  context.strokeRect(topLeft.x, topLeft.y, width, height);
  context.restore();

  drawGuideLabel(
    context,
    "미네랄 클릭",
    { x: MINERAL_TARGET.x, y: MINERAL_TARGET.y - 260 },
    layout,
  );
}

function drawMoveMarker(
  context: CanvasRenderingContext2D,
  frameElapsedMs: number,
  layout: BackgroundLayout,
) {
  const center = getCanvasPoint(MINERAL_TARGET, layout);
  const pulse = 0.6 + 0.4 * Math.sin(frameElapsedMs / 90);

  context.save();
  context.strokeStyle = `rgba(88, 255, 86, ${0.55 + pulse * 0.25})`;
  context.lineWidth = Math.max(2, 4 * layout.scale);
  context.shadowBlur = 12 * layout.scale;
  context.shadowColor = "rgba(88, 255, 86, 0.55)";
  context.beginPath();
  context.moveTo(center.x - 30 * layout.scale, center.y);
  context.lineTo(center.x - 8 * layout.scale, center.y);
  context.moveTo(center.x + 8 * layout.scale, center.y);
  context.lineTo(center.x + 30 * layout.scale, center.y);
  context.moveTo(center.x, center.y - 30 * layout.scale);
  context.lineTo(center.x, center.y - 8 * layout.scale);
  context.moveTo(center.x, center.y + 8 * layout.scale);
  context.lineTo(center.x, center.y + 30 * layout.scale);
  context.stroke();
  context.restore();
}

function drawDragoonFallback(
  context: CanvasRenderingContext2D,
  dragoon: Point,
  layout: BackgroundLayout,
) {
  const center = getCanvasPoint(dragoon, layout);
  const width = 118 * layout.scale;
  const height = 148 * layout.scale;

  context.save();
  context.translate(center.x, center.y - height * 0.55);
  context.fillStyle = "#d6b95c";
  context.strokeStyle = "#323642";
  context.lineWidth = Math.max(2, 4 * layout.scale);
  context.beginPath();
  context.ellipse(0, 0, width * 0.36, height * 0.34, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#e9d47f";
  context.fillRect(-width * 0.13, -height * 0.36, width * 0.26, height * 0.5);
  context.fillStyle = "#151923";
  context.fillRect(-width * 0.07, -height * 0.26, width * 0.14, height * 0.32);
  context.restore();
}

function drawDragoon(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  layout: BackgroundLayout,
) {
  const isMoving = state.moveTarget !== null;
  const assetKey = isMoving
    ? MOVING_ASSET_KEYS[
        Math.floor(state.frameElapsedMs / MOVE_FRAME_MS) %
          MOVING_ASSET_KEYS.length
      ]
    : "idle";
  const image = images[assetKey];

  if (!isImageReady(image)) {
    drawDragoonFallback(context, state.dragoon, layout);
    return;
  }

  const bottomCenter = getCanvasPoint(state.dragoon, layout);
  const drawHeight = DRAGOON_FRAME_HEIGHT * layout.scale;
  const drawWidth = drawHeight * (image.naturalWidth / image.naturalHeight);

  context.drawImage(
    image,
    bottomCenter.x - drawWidth / 2,
    bottomCenter.y - drawHeight,
    drawWidth,
    drawHeight,
  );
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  layout: BackgroundLayout,
  width: number,
  height: number,
) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  if (isImageReady(images.background)) {
    context.drawImage(
      images.background,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  } else {
    drawFallbackBackground(context, width, height);
  }

  if (state.isSelected) {
    drawSelectionCircle(context, state.dragoon, layout);
  } else {
    drawSelectGuide(context, state.frameElapsedMs, state.dragoon, layout);
  }

  if (state.isSelected && state.moveTarget === null && !state.hasCleared) {
    drawMineralGuide(context, state.frameElapsedMs, layout);
  }

  if (state.moveTarget !== null) {
    drawMoveMarker(context, state.frameElapsedMs, layout);
  }

  drawDragoon(context, state, images, layout);
}

function updateMovement(
  state: GameState,
  beatDurationMs: number,
  deltaMs: number,
) {
  if (state.hasCleared || state.moveTarget === null) {
    return;
  }

  const distance = getDistance(state.dragoon, state.moveTarget);

  if (distance <= ARRIVAL_RADIUS) {
    state.dragoon = state.moveTarget;
    state.moveTarget = null;
    state.hasCleared = true;
    dispatchClear();
    return;
  }

  const speed = DRAGOON_WORLD_UNITS_PER_BEAT / beatDurationMs;
  const step = Math.min(distance, speed * deltaMs);
  const progress = step / distance;

  state.dragoon = {
    x: state.dragoon.x + (state.moveTarget.x - state.dragoon.x) * progress,
    y: state.dragoon.y + (state.moveTarget.y - state.dragoon.y) * progress,
  };
}

export function useStarcraftMoveGameCanvas({
  beatDurationMs,
}: Readonly<{ beatDurationMs: number }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const layoutRef = useRef<BackgroundLayout>(
    getContainLayout(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT),
  );
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
      layoutRef.current = getContainLayout(canvasWidth, canvasHeight);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared) {
        return;
      }

      const layout = layoutRef.current;
      const worldPoint = getWorldPoint(getPointerPoint(canvas, event), layout);

      if (
        getDistance(worldPoint, state.dragoon) <= DRAGOON_HIT_RADIUS &&
        state.moveTarget === null
      ) {
        event.preventDefault();
        state.isSelected = true;
        return;
      }

      if (!state.isSelected || !isPointInRect(worldPoint, MINERAL_HOTSPOT)) {
        return;
      }

      event.preventDefault();
      state.moveTarget = MINERAL_TARGET;
      playMoveVoice();
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.frameElapsedMs += deltaMs;
      updateMovement(state, beatDurationMs, deltaMs);
      drawScene(
        context,
        state,
        imagesRef.current,
        layoutRef.current,
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [beatDurationMs]);

  return canvasRef;
}
