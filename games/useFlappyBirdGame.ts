"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

const BACKGROUND_SRC = "/games/flappy-bird/images/background.webp";
const BIRD_SRC = "/games/flappy-bird/images/bird.png";
const DIE_SOUND_SRC = "/games/flappy-bird/sounds/die.mp3";
const PIPE_SRC = "/games/flappy-bird/images/pipe-upward.png";
const WING_SOUND_SRC = "/games/flappy-bird/sounds/winging.mp3";

const BIRD_HEIGHT = 34;
const BIRD_WIDTH = 48;
const CANVAS_HEIGHT = 360;
const CANVAS_WIDTH = 640;
const DEFAULT_BEAT_DURATION_MS = 500;
const FLAP_VELOCITY = -245;
const FLOOR_Y = 332;
const GRAVITY = 720;
const MAX_DELTA_MS = 48;
const PIPE_GAP_HEIGHT = 128;
const PIPE_TRAVEL_PER_BEAT = 71;
const PIPE_WIDTH = 72;

type PipePair = Readonly<{
  gapY: number;
  x: number;
}>;

type FlappyImages = Readonly<{
  background: HTMLImageElement;
  bird: HTMLImageElement;
  pipe: HTMLImageElement;
}>;

type GameState = {
  birdVelocityY: number;
  birdY: number;
  elapsedMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  lastTimestamp: number | null;
  pipes: PipePair[];
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createInitialPipes() {
  return [
    { gapY: 124, x: 500 },
    { gapY: 196, x: 748 },
    { gapY: 146, x: 996 },
  ] satisfies PipePair[];
}

function createInitialState() {
  return {
    birdVelocityY: FLAP_VELOCITY,
    birdY: 132,
    elapsedMs: 0,
    hasCleared: false,
    hasFailed: false,
    lastTimestamp: null,
    pipes: createInitialPipes(),
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

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function playOneShot(src: string, volume = 0.82) {
  const audio = new Audio(src);

  audio.volume = volume;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

function hasPipeCollision(birdX: number, birdY: number, pipe: PipePair) {
  const birdLeft = birdX + 8;
  const birdRight = birdX + BIRD_WIDTH - 8;
  const birdTop = birdY + 5;
  const birdBottom = birdY + BIRD_HEIGHT - 5;
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + PIPE_WIDTH;
  const gapTop = pipe.gapY - PIPE_GAP_HEIGHT / 2;
  const gapBottom = pipe.gapY + PIPE_GAP_HEIGHT / 2;

  if (birdRight < pipeLeft || birdLeft > pipeRight) {
    return false;
  }

  return birdTop < gapTop || birdBottom > gapBottom;
}

function hasCollision(state: GameState) {
  const birdX = 130;

  if (state.birdY <= 0 || state.birdY + BIRD_HEIGHT >= FLOOR_Y) {
    return true;
  }

  return state.pipes.some((pipe) => hasPipeCollision(birdX, state.birdY, pipe));
}

function getPipeSpeed(beatDurationMs: number) {
  return PIPE_TRAVEL_PER_BEAT / (beatDurationMs / 1000);
}

function stepState(state: GameState, deltaMs: number, beatDurationMs: number) {
  const deltaSeconds = deltaMs / 1000;
  const pipeSpeed = getPipeSpeed(beatDurationMs);

  state.elapsedMs += deltaMs;
  state.birdVelocityY += GRAVITY * deltaSeconds;
  state.birdY += state.birdVelocityY * deltaSeconds;
  state.pipes = state.pipes.map((pipe) => ({
    ...pipe,
    x: pipe.x - pipeSpeed * deltaSeconds,
  }));
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
) {
  if (!image.complete) {
    context.fillStyle = "#70c5ce";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawPipe(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pipe: PipePair,
) {
  const gapTop = pipe.gapY - PIPE_GAP_HEIGHT / 2;
  const gapBottom = pipe.gapY + PIPE_GAP_HEIGHT / 2;
  const topPipeHeight = gapTop;
  const bottomPipeHeight = FLOOR_Y - gapBottom;

  if (!image.complete) {
    context.fillStyle = "#22c55e";
    context.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeHeight);
    context.fillRect(pipe.x, gapBottom, PIPE_WIDTH, bottomPipeHeight);
    return;
  }

  context.save();
  context.translate(pipe.x + PIPE_WIDTH / 2, topPipeHeight / 2);
  context.scale(1, -1);
  context.drawImage(
    image,
    -PIPE_WIDTH / 2,
    -topPipeHeight / 2,
    PIPE_WIDTH,
    topPipeHeight,
  );
  context.restore();

  context.drawImage(image, pipe.x, gapBottom, PIPE_WIDTH, bottomPipeHeight);
}

function drawBird(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  const birdX = 130;
  const angle = Math.max(Math.min(state.birdVelocityY / 520, 0.55), -0.55);

  context.save();
  context.translate(birdX + BIRD_WIDTH / 2, state.birdY + BIRD_HEIGHT / 2);
  context.rotate(angle);

  if (image.complete) {
    context.drawImage(
      image,
      -BIRD_WIDTH / 2,
      -BIRD_HEIGHT / 2,
      BIRD_WIDTH,
      BIRD_HEIGHT,
    );
  } else {
    context.fillStyle = "#facc15";
    context.beginPath();
    context.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: FlappyImages,
  state: GameState,
  width: number,
  height: number,
  remainingMs: number,
  phaseDurationMs: number,
) {
  context.fillStyle = "#70c5ce";
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
  const offsetX = (width - CANVAS_WIDTH * scale) / 2;
  const offsetY = (height - CANVAS_HEIGHT * scale) / 2;

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);

  drawBackground(context, images.background);
  state.pipes.forEach((pipe) => {
    drawPipe(context, images.pipe, pipe);
  });
  drawBird(context, images.bird, state);

  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.fillRect(
    0,
    FLOOR_Y + 12,
    CANVAS_WIDTH * Math.max(Math.min(remainingMs / phaseDurationMs, 1), 0),
    5,
  );

  if (state.hasFailed) {
    context.font = "700 42px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.strokeStyle = "rgba(15, 23, 42, 0.78)";
    context.lineWidth = 7;
    context.strokeText("HIT", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    context.fillText("HIT", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  context.restore();
}

export function useFlappyBirdGameCanvas(gameBeatCount: number) {
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
    let canvasHeight = CANVAS_HEIGHT;
    let canvasWidth = CANVAS_WIDTH;
    const pixelRatio = window.devicePixelRatio || 1;
    const images = {
      background: createImage(BACKGROUND_SRC),
      bird: createImage(BIRD_SRC),
      pipe: createImage(PIPE_SRC),
    } satisfies FlappyImages;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const flap = () => {
      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      state.birdVelocityY = FLAP_VELOCITY;
      playOneShot(WING_SOUND_SRC, 0.72);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      flap();
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (!state.hasCleared && !state.hasFailed) {
        stepState(state, deltaMs, beatDurationMs);

        if (hasCollision(state)) {
          state.hasFailed = true;
          playOneShot(DIE_SOUND_SRC, 0.82);
          dispatchFailure();
        } else if (state.elapsedMs >= phaseDurationMs) {
          state.hasCleared = true;
          dispatchClear();
        }
      }

      drawScene(
        context,
        images,
        state,
        canvasWidth,
        canvasHeight,
        Math.max(phaseDurationMs - state.elapsedMs, 0),
        phaseDurationMs,
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
