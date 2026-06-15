"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const BALL_IMAGE_SRC = "/games/bounce-ball/images/ball.png";
const BLOCK_IMAGE_SRC = "/games/bounce-ball/images/block.png";
const STAR_IMAGE_SRC = "/games/bounce-ball/images/star.png";
const BOUNCE_SOUND_SRC = "/games/bounce-ball/sounds/ball-bounce.mp3";
const STAR_SOUND_SRC = "/games/bounce-ball/sounds/star-gain.mp3";

const BALL_RADIUS = 7;
const BALL_SPEED = 260;
const BLOCK_HEIGHT = 21;
const BLOCK_WIDTH = 22;
const BOUNCE_VELOCITY = -360;
const COURT_HEIGHT = 540;
const COURT_WIDTH = 960;
const DEFAULT_BEAT_DURATION_MS = 500;
const GRAVITY = 1050;
const MAX_DELTA_MS = 40;
const MAX_PHYSICS_STEP_MS = 8;
const STAR_RADIUS = 10;
const STAR_X = 595;
const STAR_Y = 350;

const PLATFORM_RUNS = [
  { tileCount: 4, x: 240, y: 390 },
  { tileCount: 6, x: 350, y: 375 },
  { tileCount: 5, x: 500, y: 360 },
] as const;
const PLATFORM_TILES = PLATFORM_RUNS.flatMap(({ tileCount, x, y }) =>
  Array.from({ length: tileCount }, (_, index) => ({
    x: x + index * BLOCK_WIDTH,
    y,
  })),
);
const START_X = 273;
const START_Y = PLATFORM_TILES[0].y - BALL_RADIUS;

type DirectionKeyState = Readonly<{
  left: boolean;
  right: boolean;
}>;

type GameState = {
  ballVX: number;
  ballVY: number;
  ballX: number;
  ballY: number;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
};

type BounceBallImages = Readonly<{
  ball: HTMLImageElement;
  block: HTMLImageElement;
  star: HTMLImageElement;
}>;

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function createInitialState() {
  return {
    ballVX: 0,
    ballVY: BOUNCE_VELOCITY,
    ballX: START_X,
    ballY: START_Y,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
  } satisfies GameState;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playOneShot(src: string, volume: number) {
  const audio = new Audio(src);

  audio.volume = volume;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
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

function updateHorizontalVelocity(state: GameState, keys: DirectionKeyState) {
  const direction = Number(keys.right) - Number(keys.left);

  state.ballVX = direction * BALL_SPEED;
}

function landOnPlatform(
  state: GameState,
  previousBottom: number,
  nextBottom: number,
) {
  if (state.ballVY <= 0) {
    return false;
  }

  const platform = PLATFORM_TILES.find(
    ({ x, y }) =>
      previousBottom <= y &&
      nextBottom >= y &&
      state.ballX + BALL_RADIUS > x + 1 &&
      state.ballX - BALL_RADIUS < x + BLOCK_WIDTH - 1,
  );

  if (!platform) {
    return false;
  }

  state.ballY = platform.y - BALL_RADIUS;
  state.ballVY = BOUNCE_VELOCITY;
  playOneShot(BOUNCE_SOUND_SRC, 0.52);

  return true;
}

function hasCollectedStar(state: GameState) {
  return (
    Math.hypot(state.ballX - STAR_X, state.ballY - STAR_Y) <=
    BALL_RADIUS + STAR_RADIUS - 3
  );
}

function stepPhysics(
  state: GameState,
  keys: DirectionKeyState,
  deltaMs: number,
  speedScale: number,
) {
  const deltaSeconds = (deltaMs / 1000) * speedScale;
  const previousBottom = state.ballY + BALL_RADIUS;

  updateHorizontalVelocity(state, keys);
  state.ballX = clamp(
    state.ballX + state.ballVX * deltaSeconds,
    BALL_RADIUS,
    COURT_WIDTH - BALL_RADIUS,
  );
  state.ballVY += GRAVITY * deltaSeconds;
  state.ballY += state.ballVY * deltaSeconds;

  landOnPlatform(state, previousBottom, state.ballY + BALL_RADIUS);

  if (state.ballY - BALL_RADIUS > COURT_HEIGHT) {
    state.ballX = START_X;
    state.ballY = START_Y;
    state.ballVY = BOUNCE_VELOCITY;
  }

  if (!state.hasCleared && hasCollectedStar(state)) {
    state.hasCleared = true;
    playOneShot(STAR_SOUND_SRC, 0.88);
    dispatchClear();
  }
}

function stepState(
  state: GameState,
  keys: DirectionKeyState,
  deltaMs: number,
  beatDurationMs: number,
) {
  const speedScale = DEFAULT_BEAT_DURATION_MS / beatDurationMs;
  const stepCount = Math.max(
    1,
    Math.ceil((deltaMs * speedScale) / MAX_PHYSICS_STEP_MS),
  );
  const stepDeltaMs = deltaMs / stepCount;

  for (let index = 0; index < stepCount; index += 1) {
    stepPhysics(state, keys, stepDeltaMs, speedScale);

    if (state.hasCleared) {
      return;
    }
  }
}

function drawBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, 0, COURT_HEIGHT);

  gradient.addColorStop(0, "#78cdf7");
  gradient.addColorStop(0.7, "#c8efff");
  gradient.addColorStop(1, "#effcff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);

  context.fillStyle = "rgba(255, 255, 255, 0.68)";
  [
    { height: 26, width: 138, x: 112, y: 105 },
    { height: 22, width: 116, x: 430, y: 142 },
    { height: 30, width: 162, x: 748, y: 78 },
  ].forEach(({ height, width, x, y }) => {
    context.beginPath();
    context.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
  });
}

function drawPlatforms(
  context: CanvasRenderingContext2D,
  blockImage: HTMLImageElement,
) {
  PLATFORM_TILES.forEach(({ x, y }) => {
    if (blockImage.complete && blockImage.naturalWidth > 0) {
      context.drawImage(blockImage, x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
      return;
    }

    context.fillStyle = "#8b5a35";
    context.fillRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
    context.fillStyle = "#65a83e";
    context.fillRect(x, y, BLOCK_WIDTH, 3);
  });
}

function drawStar(context: CanvasRenderingContext2D, image: HTMLImageElement) {
  const size = STAR_RADIUS * 2;

  context.save();
  context.translate(STAR_X, STAR_Y);
  context.shadowBlur = 8;
  context.shadowColor = "#fff34a";

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, -size / 2, -size / 2, size, size);
  } else {
    context.fillStyle = "#fff000";
    context.beginPath();
    context.arc(0, 0, STAR_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawBall(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  const size = BALL_RADIUS * 2;

  context.save();
  context.translate(state.ballX, state.ballY);
  context.rotate(state.elapsedMs * 0.004 * Math.sign(state.ballVX));
  context.shadowBlur = 5;
  context.shadowColor = "rgba(255, 234, 0, 0.72)";

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, -BALL_RADIUS, -BALL_RADIUS, size, size);
  } else {
    context.fillStyle = "#ffe600";
    context.beginPath();
    context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: BounceBallImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#79c9f5";
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / COURT_WIDTH, height / COURT_HEIGHT);
  const offsetX = (width - COURT_WIDTH * scale) / 2;
  const offsetY = (height - COURT_HEIGHT * scale) / 2;

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  drawBackground(context);
  drawPlatforms(context, images.block);

  if (!state.hasCleared) {
    drawStar(context, images.star);
  }

  drawBall(context, images.ball, state);

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.fillRect(0, COURT_HEIGHT - 5, COURT_WIDTH * remainingRatio, 5);
  context.restore();
}

export function useBounceBallGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keyStateRef = useRef<DirectionKeyState>({
    left: false,
    right: false,
  });
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

    const images = {
      ball: createImage(BALL_IMAGE_SRC),
      block: createImage(BLOCK_IMAGE_SRC),
      star: createImage(STAR_IMAGE_SRC),
    } satisfies BounceBallImages;
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = COURT_HEIGHT;
    let canvasWidth = COURT_WIDTH;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, COURT_WIDTH);
      canvasHeight = Math.max(bounds.height, COURT_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      keyStateRef.current = {
        ...keyStateRef.current,
        left: event.key === "ArrowLeft" ? true : keyStateRef.current.left,
        right: event.key === "ArrowRight" ? true : keyStateRef.current.right,
      };
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      keyStateRef.current = {
        ...keyStateRef.current,
        left: event.key === "ArrowLeft" ? false : keyStateRef.current.left,
        right: event.key === "ArrowRight" ? false : keyStateRef.current.right,
      };
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (!state.hasCleared) {
        state.elapsedMs += deltaMs;
        stepState(state, keyStateRef.current, deltaMs, beatDurationMs);
      }

      drawScene(
        context,
        images,
        state,
        canvasWidth,
        canvasHeight,
        clamp(1 - state.elapsedMs / phaseDurationMs, 0, 1),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    keyStateRef.current = { left: false, right: false };
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
    };
  }, [gameBeatCount]);

  return canvasRef;
}
