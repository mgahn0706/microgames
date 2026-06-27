"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

const ASSETS = {
  apple: "/games/snake/images/apple.png",
  snakeEyes: "/games/snake/images/snake-eyes.png",
} as const;
const APPLE_CELL = { x: 5, y: 2 } as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const GRID_SIZE = 7;
const SNAKE_STEP_BEAT_RATIO = 0.5;
const INITIAL_SNAKE = [
  { x: 2, y: 4 },
  { x: 1, y: 4 },
  { x: 0, y: 4 },
] as const;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const APPLE_EAT_ANIMATION_MS = 360;
const SOUND_EFFECTS = {
  die: "/games/snake/sounds/die.ogg",
  eat: "/games/snake/sounds/eat.ogg",
} as const;

type AssetKey = keyof typeof ASSETS;

type Direction = "down" | "left" | "right" | "up";

type LoadedImages = Record<AssetKey, HTMLImageElement>;

type Cell = Readonly<{
  x: number;
  y: number;
}>;

type SnakeBodyPoint = Readonly<{
  center: Cell;
  motion: Cell;
}>;

type GameState = {
  appleEatenAtMs: number | null;
  direction: Direction;
  elapsedMs: number;
  hasResolved: boolean;
  lastTimestamp: number | null;
  nextDirection: Direction;
  pendingAppleEat: boolean;
  previousSnake: Cell[];
  snake: Cell[];
  stepAccumulatorMs: number;
};

const DIRECTION_VECTORS = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
} satisfies Record<Direction, Cell>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function playSoundEffect(src: string) {
  const audio = new Audio(src);

  audio.volume = 0.9;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.decode) {
        resolve(image);
        return;
      }

      image
        .decode()
        .then(() => resolve(image))
        .catch(() => resolve(image));
    };
    image.onerror = () => {
      reject(new Error(`Failed to preload ${src}`));
    };
    image.src = src;
  });
}

async function preloadSnakeImages() {
  const entries = await Promise.all(
    Object.entries(ASSETS).map(async ([key, src]) => {
      const image = await preloadImage(src);

      return [key, image] as const;
    }),
  );

  return Object.fromEntries(entries) as LoadedImages;
}

function preloadSound(src: string) {
  const audio = new Audio(src);

  audio.preload = "auto";
  audio.load();
}

function preloadSnakeSounds() {
  Object.values(SOUND_EFFECTS).forEach((src) => {
    try {
      preloadSound(src);
    } catch (error: unknown) {
      console.error(error);
    }
  });
}

function createInitialState() {
  return {
    appleEatenAtMs: null,
    direction: "right",
    elapsedMs: 0,
    hasResolved: false,
    lastTimestamp: null,
    nextDirection: "right",
    pendingAppleEat: false,
    previousSnake: [...INITIAL_SNAKE],
    snake: [...INITIAL_SNAKE],
    stepAccumulatorMs: 0,
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

function isOppositeDirection(first: Direction, second: Direction) {
  return (
    (first === "left" && second === "right") ||
    (first === "right" && second === "left") ||
    (first === "up" && second === "down") ||
    (first === "down" && second === "up")
  );
}

function getDirectionFromKey(event: KeyboardEvent): Direction | null {
  if (event.key === "ArrowDown") {
    return "down";
  }

  if (event.key === "ArrowLeft") {
    return "left";
  }

  if (event.key === "ArrowRight") {
    return "right";
  }

  if (event.key === "ArrowUp") {
    return "up";
  }

  return null;
}

function areSameCell(first: Cell, second: Cell) {
  return first.x === second.x && first.y === second.y;
}

function isOutOfBounds(cell: Cell) {
  return cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE;
}

function resolveFailure(state: GameState) {
  if (state.hasResolved) {
    return;
  }

  state.hasResolved = true;
  playSoundEffect(SOUND_EFFECTS.die);
  dispatchFailure();
}

function resolveClear(state: GameState) {
  if (state.hasResolved) {
    return;
  }

  state.hasResolved = true;
  dispatchClear();
}

function advanceSnake(state: GameState) {
  if (state.hasResolved || state.pendingAppleEat) {
    return;
  }

  const direction = isOppositeDirection(state.direction, state.nextDirection)
    ? state.direction
    : state.nextDirection;
  const vector = DIRECTION_VECTORS[direction];
  const head = state.snake[0];
  const previousSnake = state.snake;
  const nextHead = {
    x: head.x + vector.x,
    y: head.y + vector.y,
  } satisfies Cell;

  state.direction = direction;

  const isEatingApple = areSameCell(nextHead, APPLE_CELL);
  const collisionBody = isEatingApple ? state.snake : state.snake.slice(0, -1);

  if (
    isOutOfBounds(nextHead) ||
    collisionBody.some((segment) => areSameCell(segment, nextHead))
  ) {
    resolveFailure(state);
    return;
  }

  if (isEatingApple) {
    state.previousSnake = previousSnake;
    state.snake = [nextHead, ...state.snake];
    state.pendingAppleEat = true;
    return;
  }

  state.previousSnake = previousSnake;
  state.snake = [nextHead, ...state.snake.slice(0, -1)];
}

function eatApple(state: GameState) {
  if (state.appleEatenAtMs !== null) {
    return;
  }

  state.appleEatenAtMs = state.elapsedMs;
  playSoundEffect(SOUND_EFFECTS.eat);
}

function getInterpolatedCell(
  current: Cell,
  previous: Cell | undefined,
  progress: number,
) {
  if (!previous) {
    return current;
  }

  return {
    x: previous.x + (current.x - previous.x) * progress,
    y: previous.y + (current.y - previous.y) * progress,
  } satisfies Cell;
}

function getBoardLayout(width: number, height: number) {
  const size = Math.min(width, height) * 0.72;
  const cellSize = size / GRID_SIZE;

  return {
    cellSize,
    size,
    x: (width - size) / 2,
    y: (height - size) / 2,
  } as const;
}

function getCellCenter(cell: Cell, layout: ReturnType<typeof getBoardLayout>) {
  return {
    x: layout.x + (cell.x + 0.5) * layout.cellSize,
    y: layout.y + (cell.y + 0.5) * layout.cellSize,
  } satisfies Cell;
}

function drawApple(
  context: CanvasRenderingContext2D,
  images: LoadedImages,
  state: GameState,
  layout: ReturnType<typeof getBoardLayout>,
) {
  const centerX = layout.x + (APPLE_CELL.x + 0.5) * layout.cellSize;
  const centerY = layout.y + (APPLE_CELL.y + 0.54) * layout.cellSize;
  const size = layout.cellSize * 0.72;
  const eatenProgress =
    state.appleEatenAtMs === null
      ? 0
      : Math.min(
          Math.max(
            (state.elapsedMs - state.appleEatenAtMs) / APPLE_EAT_ANIMATION_MS,
            0,
          ),
          1,
        );
  const appleScale = state.appleEatenAtMs === null ? 1 : 1 - eatenProgress;

  if (state.appleEatenAtMs !== null) {
    context.save();
    context.globalAlpha = 1 - eatenProgress;
    context.strokeStyle = "#fca5a5";
    context.lineWidth = Math.max(layout.cellSize * 0.05, 2);
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      size * (0.48 + eatenProgress * 0.58),
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  if (appleScale <= 0) {
    return;
  }

  context.save();
  context.translate(centerX, centerY);
  context.scale(appleScale, appleScale);
  context.drawImage(images.apple, -size / 2, -size / 2, size, size);
  context.restore();
}

function drawSnakeBody(
  context: CanvasRenderingContext2D,
  points: readonly SnakeBodyPoint[],
  layout: ReturnType<typeof getBoardLayout>,
) {
  const pointsFromTail = [...points].reverse();

  if (pointsFromTail.length === 0) {
    return;
  }

  const getOrthogonalCorner = (from: SnakeBodyPoint, to: SnakeBodyPoint) => {
    const xDelta = Math.abs(to.center.x - from.center.x);
    const yDelta = Math.abs(to.center.y - from.center.y);

    if (xDelta <= 0.5 || yDelta <= 0.5) {
      return null;
    }

    if (Math.abs(from.motion.x) > Math.abs(from.motion.y)) {
      return { x: to.center.x, y: from.center.y } satisfies Cell;
    }

    if (Math.abs(from.motion.y) > Math.abs(from.motion.x)) {
      return { x: from.center.x, y: to.center.y } satisfies Cell;
    }

    if (Math.abs(to.motion.x) > Math.abs(to.motion.y)) {
      return { x: from.center.x, y: to.center.y } satisfies Cell;
    }

    return { x: to.center.x, y: from.center.y } satisfies Cell;
  };

  const drawOrthogonalPath = () => {
    pointsFromTail.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.center.x, point.center.y);
        return;
      }

      const previousPoint = pointsFromTail[index - 1];
      const corner = previousPoint
        ? getOrthogonalCorner(previousPoint, point)
        : null;

      if (corner) {
        context.lineTo(corner.x, corner.y);
      }

      context.lineTo(point.center.x, point.center.y);
    });
  };

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(30, 58, 138, 0.62)";
  context.lineWidth = layout.cellSize * 0.8;
  context.beginPath();
  drawOrthogonalPath();
  context.stroke();

  context.strokeStyle = "#2563eb";
  context.lineWidth = layout.cellSize * 0.66;
  context.beginPath();
  drawOrthogonalPath();
  context.stroke();
  const head = pointsFromTail.at(-1)?.center;

  if (head) {
    context.fillStyle = "#3b82f6";
    context.beginPath();
    context.arc(head.x, head.y, layout.cellSize * 0.35, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawSnakeEyes(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  headCenter: Cell,
  direction: Direction,
  layout: ReturnType<typeof getBoardLayout>,
) {
  const vector = DIRECTION_VECTORS[direction];
  const rotationByDirection = {
    down: Math.PI,
    left: -Math.PI / 2,
    right: Math.PI / 2,
    up: 0,
  } satisfies Record<Direction, number>;
  const size = layout.cellSize * 0.52;

  context.save();
  context.translate(
    headCenter.x + vector.x * layout.cellSize * 0.1,
    headCenter.y + vector.y * layout.cellSize * 0.1,
  );
  context.rotate(rotationByDirection[direction]);
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages,
  state: GameState,
  width: number,
  height: number,
  stepIntervalMs: number,
) {
  const layout = getBoardLayout(width, height);
  const progress = Math.min(
    Math.max(state.stepAccumulatorMs / stepIntervalMs, 0),
    1,
  );

  context.fillStyle = "#052e16";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#064e3b";
  context.fillRect(layout.x, layout.y, layout.size, layout.size);

  context.strokeStyle = "rgba(209, 250, 229, 0.18)";
  context.lineWidth = 2;
  for (let index = 0; index <= GRID_SIZE; index += 1) {
    const position = layout.x + index * layout.cellSize;

    context.beginPath();
    context.moveTo(position, layout.y);
    context.lineTo(position, layout.y + layout.size);
    context.stroke();
  }
  for (let index = 0; index <= GRID_SIZE; index += 1) {
    const position = layout.y + index * layout.cellSize;

    context.beginPath();
    context.moveTo(layout.x, position);
    context.lineTo(layout.x + layout.size, position);
    context.stroke();
  }

  drawApple(context, images, state, layout);

  const snakeBodyPoints = state.snake.map((segment, index) => {
    const previousSegment = state.previousSnake[index];
    const interpolatedCell = getInterpolatedCell(
      segment,
      previousSegment,
      progress,
    );

    return {
      center: getCellCenter(interpolatedCell, layout),
      motion: previousSegment
        ? {
            x: segment.x - previousSegment.x,
            y: segment.y - previousSegment.y,
          }
        : { x: 0, y: 0 },
    } satisfies SnakeBodyPoint;
  });

  drawSnakeBody(context, snakeBodyPoints, layout);

  const head = snakeBodyPoints[0];

  if (head) {
    drawSnakeEyes(
      context,
      images.snakeEyes,
      head.center,
      state.direction,
      layout,
    );
  }
}

export function useSnakeGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
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
    let beatDurationMs = DEFAULT_BEAT_DURATION_MS;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      beatDurationMs = getBeatDurationMs(canvas);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getDirectionFromKey(event);

      if (!direction) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (!isOppositeDirection(state.direction, direction)) {
        state.nextDirection = direction;
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const images = imagesRef.current;
      const deltaMs =
        state.lastTimestamp === null ? 0 : timestamp - state.lastTimestamp;

      beatDurationMs = getBeatDurationMs(canvas);
      const stepIntervalMs = beatDurationMs * SNAKE_STEP_BEAT_RATIO;

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaMs;

      if (!state.hasResolved) {
        state.stepAccumulatorMs += deltaMs;

        if (state.pendingAppleEat) {
          state.stepAccumulatorMs = Math.min(
            state.stepAccumulatorMs,
            stepIntervalMs,
          );

          if (state.stepAccumulatorMs >= stepIntervalMs) {
            eatApple(state);
          }

          if (
            state.appleEatenAtMs !== null &&
            state.elapsedMs - state.appleEatenAtMs >= APPLE_EAT_ANIMATION_MS
          ) {
            resolveClear(state);
          }
        } else {
          while (state.stepAccumulatorMs >= stepIntervalMs) {
            state.stepAccumulatorMs -= stepIntervalMs;
            advanceSnake(state);

            if (state.pendingAppleEat || state.hasResolved) {
              break;
            }
          }
        }

        if (
          !state.pendingAppleEat &&
          state.elapsedMs >= gameBeatCount * beatDurationMs
        ) {
          resolveFailure(state);
        }
      }

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      if (images) {
        drawScene(
          context,
          images,
          state,
          canvasWidth,
          canvasHeight,
          stepIntervalMs,
        );
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    preloadSnakeSounds();
    preloadSnakeImages()
      .then((images) => {
        if (isDisposed) {
          return;
        }

        imagesRef.current = images;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [gameBeatCount]);

  return canvasRef;
}
