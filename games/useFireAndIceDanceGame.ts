"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

const BACKGROUND_IMAGE_SRC =
  "/games/a-dance-of-fire-and-ice/images/background.png";
const COUNTDOWN_BEATS = 2;
const DEFAULT_BEAT_DURATION_MS = 500;
const REQUIRED_STEPS = 3;
const HIT_WINDOW_BEATS = 0.2;
const PIVOT_TRANSITION_BEATS = 0.18;
const MAX_DELTA_MS = 50;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const ORB_RADIUS = 27;

type TimingFeedback = "early" | "great" | "late" | "none";

type GameState = {
  feedback: TimingFeedback;
  feedbackMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  hitCount: number;
  lastHitBeat: number;
  lastTimestamp: number | null;
  pivotBeat: number;
  pivotTransitionFrom: OrbPoints | null;
  pivotTransitionStartedMs: number | null;
  startTimestamp: number | null;
};

type Point = Readonly<{
  x: number;
  y: number;
}>;

type OrbPoints = Readonly<{
  blue: Point;
  red: Point;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createInitialState() {
  return {
    feedback: "none",
    feedbackMs: 0,
    hasCleared: false,
    hasFailed: false,
    hitCount: 0,
    lastHitBeat: -1,
    lastTimestamp: null,
    pivotBeat: COUNTDOWN_BEATS - 1,
    pivotTransitionFrom: null,
    pivotTransitionStartedMs: null,
    startTimestamp: null,
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

function isImageReady(
  image: HTMLImageElement | null,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );
}

function getTrackPoints(width: number, height: number) {
  const trackWidth = Math.min(width * 0.62, 680);
  const startX = (width - trackWidth) / 2;
  const centerY = height * 0.6;

  return Array.from({ length: REQUIRED_STEPS + 1 }, (_, index) => {
    const progress = index / REQUIRED_STEPS;

    return {
      x: startX + trackWidth * progress,
      y: centerY,
    };
  });
}

function drawTrack(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  hitCount: number,
) {
  const tileGap = Math.max(8, Math.min(16, points[1].x - points[0].x) * 0.08);
  const tileWidth = points[1].x - points[0].x - tileGap;
  const tileHeight = Math.min(92, tileWidth * 0.46);

  context.save();

  points.forEach((point, index) => {
    const isReached = index <= hitCount;
    const left = point.x - tileWidth / 2;
    const top = point.y - tileHeight / 2;
    const stoneGradient = context.createLinearGradient(
      0,
      top,
      0,
      top + tileHeight,
    );

    stoneGradient.addColorStop(0, isReached ? "#8f929b" : "#777a84");
    stoneGradient.addColorStop(0.18, isReached ? "#747781" : "#62656e");
    stoneGradient.addColorStop(0.82, isReached ? "#555862" : "#464952");
    stoneGradient.addColorStop(1, isReached ? "#3d4048" : "#343740");

    context.shadowBlur = 0;
    context.fillStyle = stoneGradient;
    context.strokeStyle = "#292c33";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(left, top, tileWidth, tileHeight, 5);
    context.fill();
    context.stroke();

    context.strokeStyle = "rgba(224, 226, 232, 0.28)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(left + 7, top + tileHeight - 7);
    context.lineTo(left + 7, top + 7);
    context.lineTo(left + tileWidth - 7, top + 7);
    context.stroke();

    context.strokeStyle = "rgba(22, 24, 29, 0.45)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(left + tileWidth * 0.2, top + tileHeight * 0.58);
    context.lineTo(left + tileWidth * 0.34, top + tileHeight * 0.48);
    context.lineTo(left + tileWidth * 0.43, top + tileHeight * 0.62);
    context.moveTo(left + tileWidth * 0.68, top + tileHeight * 0.29);
    context.lineTo(left + tileWidth * 0.76, top + tileHeight * 0.4);
    context.stroke();
  });
  context.restore();
}

function drawOrb(
  context: CanvasRenderingContext2D,
  point: Point,
  color: string,
  radius: number,
  beatPulse: number,
) {
  context.save();
  context.shadowBlur = 34;
  context.shadowColor = color;
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();

  if (beatPulse > 0) {
    context.globalAlpha = beatPulse * 0.72;
    context.shadowBlur = 0;
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      radius + 5 + (1 - beatPulse) * 13,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }

  context.restore();
}

function getOrbPoints(
  points: readonly Point[],
  state: GameState,
  elapsedMs: number,
  beatDurationMs: number,
) {
  const elapsedBeats = elapsedMs / beatDurationMs;
  const anchorIndex = Math.min(state.hitCount, REQUIRED_STEPS);
  const anchor = points[anchorIndex];
  const next = points[Math.min(anchorIndex + 1, REQUIRED_STEPS)];
  const orbitRadius =
    anchorIndex >= REQUIRED_STEPS
      ? ORB_RADIUS * 1.75
      : Math.hypot(next.x - anchor.x, next.y - anchor.y);
  const rotationBeats = elapsedBeats - state.pivotBeat;
  const angle = Math.PI + rotationBeats * Math.PI;
  const moving = {
    x: anchor.x + Math.cos(angle) * orbitRadius,
    y: anchor.y + Math.sin(angle) * orbitRadius,
  };
  const isRedAnchor = state.hitCount % 2 === 0;

  return isRedAnchor
    ? { blue: moving, red: anchor }
    : { blue: anchor, red: moving };
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function interpolatePoint(from: Point, to: Point, progress: number) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function getDisplayedOrbPoints(
  points: readonly Point[],
  state: GameState,
  elapsedMs: number,
  beatDurationMs: number,
) {
  const nextPoints = getOrbPoints(points, state, elapsedMs, beatDurationMs);

  if (!state.pivotTransitionFrom || state.pivotTransitionStartedMs === null) {
    return nextPoints;
  }

  const transitionDurationMs = PIVOT_TRANSITION_BEATS * beatDurationMs;
  const progress = Math.min(
    Math.max(
      (elapsedMs - state.pivotTransitionStartedMs) / transitionDurationMs,
      0,
    ),
    1,
  );

  if (progress >= 1) {
    state.pivotTransitionFrom = null;
    state.pivotTransitionStartedMs = null;
    return nextPoints;
  }

  const easedProgress = easeOutCubic(progress);

  return {
    blue: interpolatePoint(
      state.pivotTransitionFrom.blue,
      nextPoints.blue,
      easedProgress,
    ),
    red: interpolatePoint(
      state.pivotTransitionFrom.red,
      nextPoints.red,
      easedProgress,
    ),
  };
}

function drawBeatIndicator(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  beatPulse: number,
) {
  const centerX = width / 2;
  const centerY = height * 0.085;
  const radius = 12 + beatPulse * 7;

  context.save();
  context.globalAlpha = 0.4 + beatPulse * 0.6;
  context.shadowBlur = 12 + beatPulse * 18;
  context.shadowColor = "#ffffff";
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = beatPulse * 0.72;
  context.shadowBlur = 0;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    radius + 7 + (1 - beatPulse) * 18,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
}

function getCueText(state: GameState, elapsedBeats: number) {
  if (state.hasFailed) {
    return "MISS";
  }

  if (state.hasCleared) {
    return "ON BEAT!";
  }

  if (elapsedBeats < 1) {
    return "READY";
  }

  if (elapsedBeats < COUNTDOWN_BEATS) {
    return "GO!";
  }

  if (state.feedback === "early") {
    return "빠름";
  }

  if (state.feedback === "late") {
    return "느림";
  }

  if (state.feedback === "great") {
    return "좋아!";
  }

  return "SPACE";
}

function getCueColor(state: GameState, elapsedBeats: number) {
  if (state.hasFailed) {
    return "#fb7185";
  }

  if (state.hasCleared || state.feedback === "great") {
    return "#fef08a";
  }

  if (state.feedback === "early") {
    return "#7dd3fc";
  }

  if (state.feedback === "late") {
    return "#fda4af";
  }

  return elapsedBeats < COUNTDOWN_BEATS ? "#ffffff" : "#e9d5ff";
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  backgroundImage: HTMLImageElement | null,
  width: number,
  height: number,
  elapsedMs: number,
  beatDurationMs: number,
) {
  if (isImageReady(backgroundImage)) {
    drawCoverImage(context, backgroundImage, width, height);
  } else {
    const fallback = context.createLinearGradient(0, 0, width, height);

    fallback.addColorStop(0, "#170633");
    fallback.addColorStop(1, "#4c1d6f");
    context.fillStyle = fallback;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = "rgba(10, 3, 30, 0.28)";
  context.fillRect(0, 0, width, height);

  const elapsedBeats = elapsedMs / beatDurationMs;
  const beatProgress = ((elapsedBeats % 1) + 1) % 1;
  const rawBeatPulse = Math.max(1 - beatProgress / 0.38, 0);
  const beatPulse = easeOutCubic(rawBeatPulse);
  const points = getTrackPoints(width, height);
  const orbPoints = getDisplayedOrbPoints(
    points,
    state,
    elapsedMs,
    beatDurationMs,
  );

  drawTrack(context, points, state.hitCount);

  drawOrb(context, orbPoints.red, "#ff1744", ORB_RADIUS, beatPulse);
  drawOrb(context, orbPoints.blue, "#1687ff", ORB_RADIUS, beatPulse);
  drawBeatIndicator(context, width, height, beatPulse);

  const cueText = getCueText(state, elapsedBeats);
  const cueY = height * 0.22;

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${Math.min(66, width * 0.075)}px Arial, sans-serif`;
  context.fillStyle = getCueColor(state, elapsedBeats);
  context.shadowBlur = 28;
  context.shadowColor = context.fillStyle;
  context.fillText(cueText, width / 2, cueY);

  context.shadowBlur = 0;
  context.font = `800 ${Math.min(24, width * 0.029)}px Arial, sans-serif`;
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fillText(
    `${state.hitCount} / ${REQUIRED_STEPS}`,
    width / 2,
    cueY + Math.min(72, height * 0.11),
  );
  context.restore();
}

function failGame(state: GameState) {
  if (state.hasCleared || state.hasFailed) {
    return;
  }

  state.hasFailed = true;
  dispatchFailure();
}

export function useFireAndIceDanceGameCanvas(gameBeatCount: number) {
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    const image = new Image();

    image.src = BACKGROUND_IMAGE_SRC;
    backgroundImageRef.current = image;
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
      if (event.code !== "Space" || event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (
        state.startTimestamp === null ||
        state.hasCleared ||
        state.hasFailed
      ) {
        return;
      }

      const elapsedMs = performance.now() - state.startTimestamp;
      const elapsedBeats = elapsedMs / beatDurationMs;
      const relativeBeat = elapsedBeats - state.pivotBeat;
      const targetRotationBeat = Math.max(
        Math.round((relativeBeat - 1) / 2) * 2 + 1,
        1,
      );
      const targetBeat = state.pivotBeat + targetRotationBeat;

      if (targetBeat < COUNTDOWN_BEATS) {
        return;
      }

      const timingOffsetBeats = elapsedBeats - targetBeat;
      const isOnBeat = Math.abs(timingOffsetBeats) <= HIT_WINDOW_BEATS;

      if (!isOnBeat || state.lastHitBeat === targetBeat) {
        state.feedback = timingOffsetBeats < 0 ? "early" : "late";
        state.feedbackMs = beatDurationMs * 0.72;
        return;
      }

      state.feedback = "great";
      state.feedbackMs = beatDurationMs * 0.58;
      state.lastHitBeat = targetBeat;
      state.pivotTransitionFrom = getOrbPoints(
        getTrackPoints(canvasWidth, canvasHeight),
        state,
        elapsedMs,
        beatDurationMs,
      );
      state.pivotTransitionStartedMs = elapsedMs;
      state.pivotBeat = targetBeat;
      state.hitCount += 1;

      if (state.hitCount >= REQUIRED_STEPS) {
        state.hasCleared = true;
        dispatchClear();
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.startTimestamp ??= timestamp;
      state.feedbackMs = Math.max(state.feedbackMs - deltaMs, 0);

      if (state.feedbackMs === 0) {
        state.feedback = "none";
      }

      const elapsedMs = timestamp - state.startTimestamp;

      if (
        !state.hasCleared &&
        !state.hasFailed &&
        elapsedMs >= gameBeatCount * beatDurationMs
      ) {
        failGame(state);
      }

      drawScene(
        context,
        state,
        backgroundImageRef.current,
        canvasWidth,
        canvasHeight,
        elapsedMs,
        beatDurationMs,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [gameBeatCount]);

  return canvasRef;
}
