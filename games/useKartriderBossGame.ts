"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const DEFAULT_BEAT_DURATION_MS = 500;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_SECONDS = 0.04;
const MAP_WIDTH = 1629;
const MAP_HEIGHT = 965;
const ROAD_LUMINANCE_THRESHOLD = 92;
const ACCELERATION_SMOOTHING = 18;
const ANGLE_SMOOTHING = 20;
const FRICTION = 2400;
const MAX_MOVE_SPEED = 960;
const CHECKPOINT_RADIUS = 82;
const CAR_COLLISION_RADIUS = 13;
const COLLISION_FLASH_SECONDS = 0.16;
const KARTRIDER_ASSETS = {
  kart: "/games/kartrider/images/kart.png",
  minimap: "/games/kartrider/images/minimap.png",
} as const;
const START_POINT = { x: 0.45, y: 0.86 } as const;
const CHECKPOINTS = [
  { x: 0.38, y: 0.79 },
  { x: 0.24, y: 0.78 },
  { x: 0.17, y: 0.66 },
  { x: 0.17, y: 0.39 },
  { x: 0.2, y: 0.18 },
  { x: 0.34, y: 0.14 },
  { x: 0.54, y: 0.14 },
  { x: 0.71, y: 0.17 },
  { x: 0.8, y: 0.34 },
  { x: 0.84, y: 0.47 },
  { x: 0.84, y: 0.68 },
  { x: 0.78, y: 0.79 },
  { x: 0.58, y: 0.79 },
  { x: 0.45, y: 0.75 },
  { x: 0.45, y: 0.86 },
] as const;

type LoadedImages = Partial<
  Record<keyof typeof KARTRIDER_ASSETS, HTMLImageElement>
>;

type TrackMask = Readonly<{
  data: Uint8ClampedArray;
  height: number;
  width: number;
}>;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type TrackLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type GameState = {
  angle: number;
  collisionFlashSeconds: number;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  nextCheckpointIndex: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function toMapPoint(point: Point) {
  return {
    x: point.x * MAP_WIDTH,
    y: point.y * MAP_HEIGHT,
  };
}

function createInitialState() {
  const start = toMapPoint(START_POINT);

  return {
    angle: Math.PI,
    collisionFlashSeconds: 0,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    nextCheckpointIndex: 0,
    velocityX: 0,
    velocityY: 0,
    x: start.x,
    y: start.y,
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

function createTrackMask(image: HTMLImageElement): TrackMask | null {
  const maskCanvas = document.createElement("canvas");
  const context = maskCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  maskCanvas.width = image.naturalWidth;
  maskCanvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  return {
    data: imageData.data,
    height: imageData.height,
    width: imageData.width,
  };
}

function isRoadPixel(mask: TrackMask | null, x: number, y: number) {
  if (!mask) {
    return true;
  }

  const pixelX = Math.round(x);
  const pixelY = Math.round(y);

  if (
    pixelX < 0 ||
    pixelX >= mask.width ||
    pixelY < 0 ||
    pixelY >= mask.height
  ) {
    return false;
  }

  const index = (pixelY * mask.width + pixelX) * 4;
  const red = mask.data[index] ?? 0;
  const green = mask.data[index + 1] ?? 0;
  const blue = mask.data[index + 2] ?? 0;
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

  return luminance >= ROAD_LUMINANCE_THRESHOLD;
}

function canPlaceKart(mask: TrackMask | null, x: number, y: number) {
  const samplePoints = [
    { x, y },
    { x: x + CAR_COLLISION_RADIUS, y },
    { x: x - CAR_COLLISION_RADIUS, y },
    { x, y: y + CAR_COLLISION_RADIUS },
    { x, y: y - CAR_COLLISION_RADIUS },
  ];

  return samplePoints.every((point) => isRoadPixel(mask, point.x, point.y));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getSmoothingRatio(rate: number, deltaSeconds: number) {
  return 1 - Math.exp(-rate * deltaSeconds);
}

function getVectorLength(x: number, y: number) {
  return Math.hypot(x, y);
}

function clampVectorLength(x: number, y: number, maxLength: number) {
  const length = getVectorLength(x, y);

  if (length <= maxLength || length === 0) {
    return { x, y };
  }

  const scale = maxLength / length;

  return {
    x: x * scale,
    y: y * scale,
  };
}

function applyFrictionToVelocity(
  velocityX: number,
  velocityY: number,
  deltaSeconds: number,
) {
  const speed = getVectorLength(velocityX, velocityY);

  if (speed === 0) {
    return { x: 0, y: 0 };
  }

  const nextSpeed = Math.max(speed - FRICTION * deltaSeconds, 0);
  const scale = nextSpeed / speed;

  return {
    x: velocityX * scale,
    y: velocityY * scale,
  };
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getShortestAngleDelta(fromAngle: number, toAngle: number) {
  return Math.atan2(
    Math.sin(toAngle - fromAngle),
    Math.cos(toAngle - fromAngle),
  );
}

function updateCheckpoints(state: GameState) {
  const checkpoint = CHECKPOINTS[state.nextCheckpointIndex];

  if (!checkpoint) {
    return;
  }

  const checkpointPoint = toMapPoint(checkpoint);
  const distance = getDistance(
    { x: state.x, y: state.y },
    { x: checkpointPoint.x, y: checkpointPoint.y },
  );

  if (distance > CHECKPOINT_RADIUS) {
    return;
  }

  state.nextCheckpointIndex += 1;

  if (state.nextCheckpointIndex >= CHECKPOINTS.length) {
    state.hasCleared = true;
    state.velocityX = 0;
    state.velocityY = 0;
    dispatchClear();
  }
}

function getInputDirection(pressedKeys: ReadonlySet<string>) {
  const x =
    (pressedKeys.has("ArrowLeft") ? -1 : 0) +
    (pressedKeys.has("ArrowRight") ? 1 : 0);
  const y =
    (pressedKeys.has("ArrowUp") ? -1 : 0) +
    (pressedKeys.has("ArrowDown") ? 1 : 0);
  const length = getVectorLength(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function updateDrivingState(
  state: GameState,
  pressedKeys: ReadonlySet<string>,
  mask: TrackMask | null,
  deltaSeconds: number,
) {
  if (state.hasCleared) {
    return;
  }

  const inputDirection = getInputDirection(pressedKeys);

  if (inputDirection.x !== 0 || inputDirection.y !== 0) {
    const smoothingRatio = getSmoothingRatio(
      ACCELERATION_SMOOTHING,
      deltaSeconds,
    );
    const targetVelocityX = inputDirection.x * MAX_MOVE_SPEED;
    const targetVelocityY = inputDirection.y * MAX_MOVE_SPEED;

    state.velocityX += (targetVelocityX - state.velocityX) * smoothingRatio;
    state.velocityY += (targetVelocityY - state.velocityY) * smoothingRatio;
  } else {
    const nextVelocity = applyFrictionToVelocity(
      state.velocityX,
      state.velocityY,
      deltaSeconds,
    );

    state.velocityX = nextVelocity.x;
    state.velocityY = nextVelocity.y;
  }

  const clampedVelocity = clampVectorLength(
    state.velocityX,
    state.velocityY,
    MAX_MOVE_SPEED,
  );

  state.velocityX = clampedVelocity.x;
  state.velocityY = clampedVelocity.y;

  if (getVectorLength(state.velocityX, state.velocityY) > 8) {
    const targetAngle = Math.atan2(state.velocityY, state.velocityX);
    const smoothingRatio = getSmoothingRatio(ANGLE_SMOOTHING, deltaSeconds);

    state.angle +=
      getShortestAngleDelta(state.angle, targetAngle) * smoothingRatio;
  }

  const previousX = state.x;
  const previousY = state.y;
  const nextX = state.x + state.velocityX * deltaSeconds;
  const nextY = state.y + state.velocityY * deltaSeconds;

  if (canPlaceKart(mask, nextX, nextY)) {
    state.x = nextX;
    state.y = nextY;
    updateCheckpoints(state);
    return;
  }

  const canMoveX = canPlaceKart(mask, nextX, previousY);
  const canMoveY = canPlaceKart(mask, previousX, nextY);

  if (canMoveX) {
    state.x = nextX;
  } else {
    state.x = previousX;
    state.velocityX *= 0.16;
  }

  if (canMoveY) {
    state.y = nextY;
  } else {
    state.y = previousY;
    state.velocityY *= 0.16;
  }

  if (canMoveX || canMoveY) {
    updateCheckpoints(state);
    return;
  }

  state.collisionFlashSeconds = COLLISION_FLASH_SECONDS;
}

function getTrackLayout(width: number, height: number): TrackLayout {
  const maxTrackWidth = width * 0.9;
  const maxTrackHeight = height * 0.74;
  const scale = Math.min(
    maxTrackWidth / MAP_WIDTH,
    maxTrackHeight / MAP_HEIGHT,
  );
  const trackWidth = MAP_WIDTH * scale;
  const trackHeight = MAP_HEIGHT * scale;

  return {
    height: trackHeight,
    scale,
    width: trackWidth,
    x: (width - trackWidth) / 2,
    y: (height - trackHeight) / 2 + height * 0.035,
  };
}

function mapToCanvas(point: Point, layout: TrackLayout) {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale,
  };
}

function drawFallbackTrack(
  context: CanvasRenderingContext2D,
  layout: TrackLayout,
) {
  context.save();
  context.translate(layout.x, layout.y);
  context.scale(layout.scale, layout.scale);
  context.fillStyle = "#020617";
  context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  context.strokeStyle = "#f8fafc";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 130;
  context.beginPath();
  context.moveTo(START_POINT.x * MAP_WIDTH, START_POINT.y * MAP_HEIGHT);
  CHECKPOINTS.forEach((checkpoint) => {
    context.lineTo(checkpoint.x * MAP_WIDTH, checkpoint.y * MAP_HEIGHT);
  });
  context.stroke();
  context.restore();
}

function drawCheckpoint(
  context: CanvasRenderingContext2D,
  state: GameState,
  layout: TrackLayout,
) {
  const checkpoint = CHECKPOINTS[state.nextCheckpointIndex];

  if (!checkpoint || state.hasCleared) {
    return;
  }

  const checkpointCanvas = mapToCanvas(toMapPoint(checkpoint), layout);
  const radius = CHECKPOINT_RADIUS * layout.scale;

  context.save();
  context.globalAlpha = 0.9;
  context.strokeStyle = "#facc15";
  context.lineWidth = Math.max(4, radius * 0.12);
  context.setLineDash([radius * 0.42, radius * 0.22]);
  context.beginPath();
  context.arc(checkpointCanvas.x, checkpointCanvas.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "rgba(250, 204, 21, 0.2)";
  context.beginPath();
  context.arc(
    checkpointCanvas.x,
    checkpointCanvas.y,
    radius * 0.72,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawKart(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  state: GameState,
  layout: TrackLayout,
) {
  const kartCenter = mapToCanvas({ x: state.x, y: state.y }, layout);
  const kartWidth = clamp(layout.width * 0.026, 22, 36);
  const kartHeight = kartWidth * 0.72;

  context.save();
  context.translate(kartCenter.x, kartCenter.y);
  context.rotate(state.angle + Math.PI);
  context.shadowColor = "rgba(14, 165, 233, 0.55)";
  context.shadowBlur = 16;

  if (image?.complete && image.naturalWidth > 0) {
    context.drawImage(
      image,
      -kartWidth / 2,
      -kartHeight / 2,
      kartWidth,
      kartHeight,
    );
  } else {
    context.fillStyle = "#38bdf8";
    context.fillRect(-kartWidth / 2, -kartHeight / 2, kartWidth, kartHeight);
    context.fillStyle = "#f8fafc";
    context.fillRect(
      -kartWidth / 2,
      -kartHeight / 4,
      kartWidth * 0.32,
      kartHeight / 2,
    );
  }

  context.restore();
}

function drawHud(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  remainingMs: number,
) {
  const progress = state.nextCheckpointIndex / CHECKPOINTS.length;
  const progressWidth = Math.min(320, width * 0.34);
  const progressX = width - progressWidth - 28;
  const progressY = 34;

  drawCenteredText(context, "완주해라!", width / 2, 54, 38, "#f8fafc");

  context.save();
  context.fillStyle = "rgba(2, 6, 23, 0.72)";
  context.fillRect(progressX, progressY, progressWidth, 20);
  context.fillStyle = "#22d3ee";
  context.fillRect(progressX, progressY, progressWidth * progress, 20);
  context.strokeStyle = "rgba(255, 255, 255, 0.62)";
  context.lineWidth = 2;
  context.strokeRect(progressX, progressY, progressWidth, 20);
  context.fillStyle = "#f8fafc";
  context.font = "900 18px Arial, Helvetica, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(`${Math.ceil(remainingMs / 1000)}초`, width - 28, 62);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages,
  width: number,
  height: number,
  remainingMs: number,
) {
  const layout = getTrackLayout(width, height);

  context.fillStyle = "#020617";
  context.fillRect(0, 0, width, height);

  const backgroundGradient = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.68,
  );

  backgroundGradient.addColorStop(0, "rgba(14, 165, 233, 0.2)");
  backgroundGradient.addColorStop(0.52, "rgba(15, 23, 42, 0.42)");
  backgroundGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.shadowColor = "rgba(248, 250, 252, 0.36)";
  context.shadowBlur = 20;

  if (images.minimap?.complete && images.minimap.naturalWidth > 0) {
    context.drawImage(
      images.minimap,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  } else {
    drawFallbackTrack(context, layout);
  }

  context.restore();
  drawCheckpoint(context, state, layout);
  drawKart(context, images.kart, state, layout);

  if (state.collisionFlashSeconds > 0) {
    context.fillStyle = `rgba(239, 68, 68, ${
      state.collisionFlashSeconds / COLLISION_FLASH_SECONDS / 4
    })`;
    context.fillRect(0, 0, width, height);
  }

  if (state.hasCleared) {
    context.fillStyle = "rgba(34, 197, 94, 0.16)";
    context.fillRect(0, 0, width, height);
  }

  drawHud(context, state, width, remainingMs);
}

export function useKartriderBossGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages>({});
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const stateRef = useRef<GameState>(createInitialState());
  const trackMaskRef = useRef<TrackMask | null>(null);

  useEffect(() => {
    imagesRef.current = (
      Object.keys(KARTRIDER_ASSETS) as Array<keyof typeof KARTRIDER_ASSETS>
    ).reduce<LoadedImages>((nextImages, assetKey) => {
      const image = new Image();

      if (assetKey === "minimap") {
        image.onload = () => {
          trackMaskRef.current = createTrackMask(image);
        };
      }

      image.src = KARTRIDER_ASSETS[assetKey];

      if (assetKey === "minimap" && image.complete && image.naturalWidth > 0) {
        trackMaskRef.current = createTrackMask(image);
      }

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
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    const pixelRatio = window.devicePixelRatio || 1;
    const pressedKeys = pressedKeysRef.current;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      pressedKeys.add(event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      pressedKeys.delete(event.key);
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaSeconds =
        state.lastTimestamp === null
          ? 0
          : Math.min(
              (timestamp - state.lastTimestamp) / 1000,
              MAX_DELTA_SECONDS,
            );
      const phaseDurationMs = gameBeatCount * beatDurationMs;

      state.lastTimestamp = timestamp;

      if (!state.hasCleared) {
        state.elapsedMs += deltaSeconds * 1000;
        updateDrivingState(
          state,
          pressedKeys,
          trackMaskRef.current,
          deltaSeconds,
        );
      }

      state.collisionFlashSeconds = Math.max(
        state.collisionFlashSeconds - deltaSeconds,
        0,
      );

      drawScene(
        context,
        state,
        imagesRef.current,
        canvasWidth,
        canvasHeight,
        Math.max(phaseDurationMs - state.elapsedMs, 0),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      pressedKeys.clear();
    };
  }, [gameBeatCount]);

  return canvasRef;
}
