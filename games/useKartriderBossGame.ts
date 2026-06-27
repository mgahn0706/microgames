"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const DEFAULT_BEAT_DURATION_MS = 500;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_SECONDS = 0.04;
const MAP_WIDTH = 1626;
const MAP_HEIGHT = 967;
const ROAD_LUMINANCE_THRESHOLD = 205;
const ACCELERATION_SMOOTHING = 9;
const ANGLE_SMOOTHING = 13;
const FRICTION = 1500;
const MAX_MOVE_SPEED = 720;
const CHECKPOINT_RADIUS = 82;
const CAR_COLLISION_RADIUS = 13;
const COLLISION_EFFECT_SECONDS = 0.22;
const LAP_TWO_BANNER_SECONDS = 1.15;
const FINAL_LAP_BANNER_SECONDS = 1.35;
const TOTAL_LAPS = 3;
const KARTRIDER_ASSETS = {
  kart: "/games/kartrider/images/kart.webp",
  track: "/games/kartrider/images/track.webp",
} as const;
const KARTRIDER_SOUNDS = {
  finalLap: "/games/kartrider/sounds/final-lap.mp3",
  lapTwo: "/games/kartrider/sounds/lap-2.mp3",
} as const;
const START_POINT = { x: 0.54, y: 0.205 } as const;
const CHECKPOINTS = [
  { x: 0.68, y: 0.205 },
  { x: 0.75, y: 0.28 },
  { x: 0.775, y: 0.42 },
  { x: 0.775, y: 0.61 },
  { x: 0.745, y: 0.74 },
  { x: 0.61, y: 0.755 },
  { x: 0.475, y: 0.755 },
  { x: 0.39, y: 0.785 },
  { x: 0.245, y: 0.775 },
  { x: 0.23, y: 0.64 },
  { x: 0.23, y: 0.39 },
  { x: 0.255, y: 0.225 },
  { x: 0.35, y: 0.205 },
  { x: 0.54, y: 0.205 },
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
  collisionEffectSeconds: number;
  collisionEffectX: number;
  collisionEffectY: number;
  elapsedMs: number;
  finalLapBannerSeconds: number;
  hasCleared: boolean;
  lapCount: number;
  lapTwoBannerSeconds: number;
  lastTimestamp: number | null;
  nextCheckpointIndex: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type LapCue = "finalLap" | "lapTwo";

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createAudio(src: string) {
  const audio = new Audio(src);

  audio.preload = "auto";

  return audio;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  void audio.play().catch(() => {});
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
    angle: 0,
    collisionEffectSeconds: 0,
    collisionEffectX: start.x,
    collisionEffectY: start.y,
    elapsedMs: 0,
    finalLapBannerSeconds: 0,
    hasCleared: false,
    lapCount: 0,
    lapTwoBannerSeconds: 0,
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

function updateCheckpoints(
  state: GameState,
  playLapCue: (cue: LapCue) => void,
) {
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
    const nextLapCount = state.lapCount + 1;

    state.lapCount = nextLapCount;

    if (nextLapCount < TOTAL_LAPS) {
      if (nextLapCount === 1) {
        state.lapTwoBannerSeconds = LAP_TWO_BANNER_SECONDS;
        playLapCue("lapTwo");
      } else if (nextLapCount === TOTAL_LAPS - 1) {
        state.finalLapBannerSeconds = FINAL_LAP_BANNER_SECONDS;
        playLapCue("finalLap");
      }

      state.nextCheckpointIndex = 0;
      return;
    }

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
  speedScale: number,
  playLapCue: (cue: LapCue) => void,
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
    const maxMoveSpeed = MAX_MOVE_SPEED * speedScale;
    const targetVelocityX = inputDirection.x * maxMoveSpeed;
    const targetVelocityY = inputDirection.y * maxMoveSpeed;

    state.velocityX += (targetVelocityX - state.velocityX) * smoothingRatio;
    state.velocityY += (targetVelocityY - state.velocityY) * smoothingRatio;
  } else {
    const nextVelocity = applyFrictionToVelocity(
      state.velocityX,
      state.velocityY,
      deltaSeconds * speedScale,
    );

    state.velocityX = nextVelocity.x;
    state.velocityY = nextVelocity.y;
  }

  const clampedVelocity = clampVectorLength(
    state.velocityX,
    state.velocityY,
    MAX_MOVE_SPEED * speedScale,
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
    updateCheckpoints(state, playLapCue);
    return;
  }

  const canMoveX = canPlaceKart(mask, nextX, previousY);
  const canMoveY = canPlaceKart(mask, previousX, nextY);
  const didCollide = !canMoveX || !canMoveY;

  if (didCollide) {
    state.collisionEffectSeconds = COLLISION_EFFECT_SECONDS;
    state.collisionEffectX = nextX;
    state.collisionEffectY = nextY;
  }

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
    updateCheckpoints(state, playLapCue);
    return;
  }

  state.collisionEffectSeconds = COLLISION_EFFECT_SECONDS;
}

function getTrackLayout(width: number, height: number): TrackLayout {
  const scale = Math.max(width / MAP_WIDTH, height / MAP_HEIGHT);
  const trackWidth = MAP_WIDTH * scale;
  const trackHeight = MAP_HEIGHT * scale;

  return {
    height: trackHeight,
    scale,
    width: trackWidth,
    x: (width - trackWidth) / 2,
    y: (height - trackHeight) / 2,
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

function drawCollisionEffect(
  context: CanvasRenderingContext2D,
  state: GameState,
  layout: TrackLayout,
) {
  if (state.collisionEffectSeconds <= 0) {
    return;
  }

  const effectRatio = state.collisionEffectSeconds / COLLISION_EFFECT_SECONDS;
  const progress = 1 - effectRatio;
  const effectPoint = mapToCanvas(
    { x: state.collisionEffectX, y: state.collisionEffectY },
    layout,
  );
  const radius = 10 + progress * 22;

  context.save();
  context.globalAlpha = effectRatio;
  context.strokeStyle = "#facc15";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(effectPoint.x, effectPoint.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#f97316";
  context.font = "900 22px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("쿵!", effectPoint.x, effectPoint.y - 22 - progress * 12);
  context.restore();
}

function drawLapTwoBanner(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  if (state.lapTwoBannerSeconds <= 0) {
    return;
  }

  const effectRatio = state.lapTwoBannerSeconds / LAP_TWO_BANNER_SECONDS;
  const scale = 0.9 + (1 - effectRatio) * 0.16;

  context.save();
  context.globalAlpha = Math.min(effectRatio * 1.35, 1);
  context.translate(width / 2, height * 0.24);
  context.scale(scale, scale);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${Math.min(68, width * 0.07)}px Arial, Helvetica, sans-serif`;
  context.lineWidth = 8;
  context.strokeStyle = "rgba(124, 45, 18, 0.95)";
  context.strokeText("LAP 2", 0, 0);
  context.fillStyle = "#fb923c";
  context.shadowColor = "rgba(251, 146, 60, 0.9)";
  context.shadowBlur = 24;
  context.fillText("LAP 2", 0, 0);
  context.restore();
}

function drawFinalLapBanner(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  if (state.finalLapBannerSeconds <= 0) {
    return;
  }

  const effectRatio = state.finalLapBannerSeconds / FINAL_LAP_BANNER_SECONDS;
  const scale = 0.92 + (1 - effectRatio) * 0.18;

  context.save();
  context.globalAlpha = Math.min(effectRatio * 1.35, 1);
  context.translate(width / 2, height * 0.24);
  context.scale(scale, scale);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${Math.min(72, width * 0.075)}px Arial, Helvetica, sans-serif`;
  context.lineWidth = 8;
  context.strokeStyle = "rgba(88, 28, 135, 0.95)";
  context.strokeText("FINAL LAP", 0, 0);
  context.fillStyle = "#f9a8d4";
  context.shadowColor = "rgba(244, 114, 182, 0.92)";
  context.shadowBlur = 26;
  context.fillText("FINAL LAP", 0, 0);
  context.restore();
}

function drawHud(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
) {
  const progress =
    (state.lapCount + state.nextCheckpointIndex / CHECKPOINTS.length) /
    TOTAL_LAPS;
  const progressWidth = Math.min(320, width * 0.34);
  const progressX = width - progressWidth - 28;
  const progressY = 34;
  const lapLabel = `${Math.min(state.lapCount + 1, TOTAL_LAPS)}/${TOTAL_LAPS} LAP`;

  drawCenteredText(context, "완주해라!", width / 2, 54, 38, "#f8fafc");

  context.save();
  context.fillStyle = "rgba(2, 6, 23, 0.78)";
  context.fillRect(progressX, progressY - 32, progressWidth, 26);
  context.strokeStyle = "rgba(255, 255, 255, 0.62)";
  context.lineWidth = 2;
  context.strokeRect(progressX, progressY - 32, progressWidth, 26);
  context.fillStyle = "#fde68a";
  context.font = "900 18px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(lapLabel, progressX + progressWidth / 2, progressY - 19);

  context.fillStyle = "rgba(2, 6, 23, 0.72)";
  context.fillRect(progressX, progressY, progressWidth, 20);
  context.fillStyle = "#22d3ee";
  context.fillRect(progressX, progressY, progressWidth * progress, 20);
  context.strokeStyle = "rgba(255, 255, 255, 0.62)";
  context.lineWidth = 2;
  context.strokeRect(progressX, progressY, progressWidth, 20);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages,
  width: number,
  height: number,
) {
  const layout = getTrackLayout(width, height);

  context.save();

  if (images.track?.complete && images.track.naturalWidth > 0) {
    context.drawImage(
      images.track,
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
  drawCollisionEffect(context, state, layout);
  drawLapTwoBanner(context, state, width, height);
  drawFinalLapBanner(context, state, width, height);

  if (state.hasCleared) {
    context.fillStyle = "rgba(34, 197, 94, 0.16)";
    context.fillRect(0, 0, width, height);
  }

  drawHud(context, state, width);
}

export function useKartriderBossGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages>({});
  const finalLapAudioRef = useRef<HTMLAudioElement | null>(null);
  const lapTwoAudioRef = useRef<HTMLAudioElement | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const stateRef = useRef<GameState>(createInitialState());
  const trackMaskRef = useRef<TrackMask | null>(null);

  useEffect(() => {
    imagesRef.current = (
      Object.keys(KARTRIDER_ASSETS) as Array<keyof typeof KARTRIDER_ASSETS>
    ).reduce<LoadedImages>((nextImages, assetKey) => {
      const image = new Image();

      if (assetKey === "track") {
        image.onload = () => {
          trackMaskRef.current = createTrackMask(image);
        };
      }

      image.src = KARTRIDER_ASSETS[assetKey];

      if (assetKey === "track" && image.complete && image.naturalWidth > 0) {
        trackMaskRef.current = createTrackMask(image);
      }

      return {
        ...nextImages,
        [assetKey]: image,
      };
    }, {});
  }, []);

  useEffect(() => {
    finalLapAudioRef.current = createAudio(KARTRIDER_SOUNDS.finalLap);
    lapTwoAudioRef.current = createAudio(KARTRIDER_SOUNDS.lapTwo);

    return () => {
      finalLapAudioRef.current = null;
      lapTwoAudioRef.current = null;
    };
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
    const playLapCue = (cue: LapCue) => {
      playAudio(
        cue === "finalLap" ? finalLapAudioRef.current : lapTwoAudioRef.current,
      );
    };

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
      const speedScale = DEFAULT_BEAT_DURATION_MS / beatDurationMs;

      state.lastTimestamp = timestamp;

      if (!state.hasCleared) {
        state.elapsedMs += deltaSeconds * 1000;
        updateDrivingState(
          state,
          pressedKeys,
          trackMaskRef.current,
          deltaSeconds,
          speedScale,
          playLapCue,
        );
      }

      state.collisionEffectSeconds = Math.max(
        state.collisionEffectSeconds - deltaSeconds,
        0,
      );
      state.lapTwoBannerSeconds = Math.max(
        state.lapTwoBannerSeconds - deltaSeconds,
        0,
      );
      state.finalLapBannerSeconds = Math.max(
        state.finalLapBannerSeconds - deltaSeconds,
        0,
      );

      drawScene(context, state, imagesRef.current, canvasWidth, canvasHeight);
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
  }, []);

  return canvasRef;
}
