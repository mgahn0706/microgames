"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const BUBBLE_ASSETS = {
  blue: "/games/bubble-shooter/images/blue.png",
  green: "/games/bubble-shooter/images/green.png",
  purple: "/games/bubble-shooter/images/purple.png",
  red: "/games/bubble-shooter/images/red.png",
  yellow: "/games/bubble-shooter/images/yellow.png",
} as const;
const AIM_MAX_RADIANS = 0.82;
const AIM_SWEEP_SECONDS = 2.4;
const BUBBLE_RADIUS = 24;
const BUBBLE_SPEED = 820;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const POP_CLUSTER_SIZE = 3;
const POPS_TO_CLEAR = 3;

type BubbleColor = keyof typeof BUBBLE_ASSETS;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type Bubble = Point &
  Readonly<{
    color: BubbleColor;
    id: number;
    poppingUntilMs: number;
  }>;
type Shot = Point &
  Readonly<{
    color: BubbleColor;
    vx: number;
    vy: number;
  }>;
type LoadedImages = Record<BubbleColor, HTMLImageElement>;
const BUBBLE_COLORS = Object.keys(BUBBLE_ASSETS) as BubbleColor[];
type PlayfieldBounds = Readonly<{
  left: number;
  right: number;
  top: number;
}>;
type GameState = {
  aimElapsedSeconds: number;
  bubbles: Bubble[];
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  nextBubbleColor: BubbleColor;
  nextBubbleId: number;
  popCount: number;
  playfieldBounds: PlayfieldBounds;
  shot: Shot | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomBubbleColor() {
  return (
    BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] ?? "red"
  );
}

function createInitialBubbles(width: number) {
  const centerX = width / 2;
  const startY = 64;
  const gapX = BUBBLE_RADIUS * 1.86;
  const gapY = BUBBLE_RADIUS * 1.64;
  const rows: readonly (readonly BubbleColor[])[] = [
    ["blue", "green", "red", "red", "red", "yellow", "purple"],
    ["purple", "blue", "green", "red", "yellow", "green"],
    ["green", "yellow", "purple", "blue", "green", "purple", "blue"],
    ["yellow", "purple", "blue", "green", "yellow", "red"],
  ];
  let nextBubbleId = 1;

  return rows.flatMap((row, rowIndex) => {
    const rowWidth = (row.length - 1) * gapX;
    const rowOffset = rowIndex % 2 === 0 ? 0 : gapX * 0.42;

    return row.map((color, columnIndex) => {
      const bubble = {
        color,
        id: nextBubbleId,
        poppingUntilMs: 0,
        x: centerX - rowWidth / 2 + columnIndex * gapX + rowOffset,
        y: startY + rowIndex * gapY,
      } satisfies Bubble;

      nextBubbleId += 1;
      return bubble;
    });
  });
}

function getInitialBubbleBounds(bubbles: readonly Bubble[]) {
  const xPositions = bubbles.map(({ x }) => x);
  const yPositions = bubbles.map(({ y }) => y);

  return {
    left: Math.min(...xPositions) - BUBBLE_RADIUS,
    right: Math.max(...xPositions) + BUBBLE_RADIUS,
    top: Math.min(...yPositions) - BUBBLE_RADIUS,
  } satisfies PlayfieldBounds;
}

function createInitialState(width: number) {
  const bubbles = createInitialBubbles(width);
  const playfieldBounds = getInitialBubbleBounds(bubbles);

  return {
    aimElapsedSeconds: 0,
    bubbles,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    nextBubbleColor: getRandomBubbleColor(),
    nextBubbleId: Math.max(...bubbles.map(({ id }) => id)) + 1,
    popCount: 0,
    playfieldBounds,
    shot: null,
  } satisfies GameState;
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadImages() {
  const entries = await Promise.all(
    Object.entries(BUBBLE_ASSETS).map(async ([color, src]) => {
      const image = await preloadImage(src);

      return [color, image] as const;
    }),
  );

  return Object.fromEntries(entries) as LoadedImages;
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

function getShooterPoint(width: number, height: number) {
  return {
    x: width / 2,
    y: height - 68,
  } satisfies Point;
}

function getAimAngle(aimElapsedSeconds: number) {
  const cycle = Math.sin((aimElapsedSeconds / AIM_SWEEP_SECONDS) * Math.PI * 2);

  return -Math.PI / 2 + cycle * AIM_MAX_RADIANS;
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getShotCenterBounds(playfieldBounds: PlayfieldBounds) {
  return {
    left: playfieldBounds.left + BUBBLE_RADIUS,
    right: playfieldBounds.right - BUBBLE_RADIUS,
  };
}

function getConnectedCluster(bubbles: readonly Bubble[], startBubble: Bubble) {
  const cluster: Bubble[] = [];
  const visitedBubbleIds = new Set<number>();
  const queue = [startBubble];

  while (queue.length > 0) {
    const bubble = queue.shift();

    if (!bubble || visitedBubbleIds.has(bubble.id)) {
      continue;
    }

    visitedBubbleIds.add(bubble.id);
    cluster.push(bubble);

    bubbles.forEach((candidate) => {
      if (
        candidate.color === startBubble.color &&
        !visitedBubbleIds.has(candidate.id) &&
        getDistance(candidate, bubble) <= BUBBLE_RADIUS * 2.18
      ) {
        queue.push(candidate);
      }
    });
  }

  return cluster;
}

function playSoundEffect(track: "bubbleShooterPop" | "bubbleShooterShoot") {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
}

function attachShot(state: GameState, shot: Shot) {
  const attachedBubble = {
    color: shot.color,
    id: state.nextBubbleId,
    poppingUntilMs: 0,
    x: shot.x,
    y: shot.y,
  } satisfies Bubble;
  const nextBubbles = [...state.bubbles, attachedBubble];
  const cluster = getConnectedCluster(nextBubbles, attachedBubble);

  state.nextBubbleId += 1;
  state.shot = null;

  if (cluster.length >= POP_CLUSTER_SIZE) {
    const poppingBubbleIds = new Set(cluster.map(({ id }) => id));
    const nextPopCount = state.popCount + 1;

    state.popCount = nextPopCount;
    state.bubbles = nextBubbles.map((bubble) =>
      poppingBubbleIds.has(bubble.id)
        ? { ...bubble, poppingUntilMs: state.elapsedMs + 360 }
        : bubble,
    );
    playSoundEffect("bubbleShooterPop");

    if (nextPopCount >= POPS_TO_CLEAR) {
      state.hasCleared = true;
      window.setTimeout(dispatchClear, 170);
      return;
    }

    state.nextBubbleColor = getRandomBubbleColor();
    return;
  }

  state.bubbles = nextBubbles;
  state.nextBubbleColor = getRandomBubbleColor();
}

function updateShot(state: GameState, deltaSeconds: number) {
  if (!state.shot || state.hasCleared) {
    return;
  }

  const shot = {
    ...state.shot,
    x: state.shot.x + state.shot.vx * deltaSeconds,
    y: state.shot.y + state.shot.vy * deltaSeconds,
  } satisfies Shot;

  const shotBounds = getShotCenterBounds(state.playfieldBounds);

  if (shot.x <= shotBounds.left) {
    state.shot = {
      ...shot,
      vx: Math.abs(shot.vx),
      x: Math.min(
        shotBounds.right,
        shotBounds.left + (shotBounds.left - shot.x),
      ),
    };
    return;
  }

  if (shot.x >= shotBounds.right) {
    state.shot = {
      ...shot,
      vx: -Math.abs(shot.vx),
      x: Math.max(
        shotBounds.left,
        shotBounds.right - (shot.x - shotBounds.right),
      ),
    };
    return;
  }

  const collidedBubble = state.bubbles.find(
    (bubble) => getDistance(bubble, shot) <= BUBBLE_RADIUS * 2,
  );

  if (collidedBubble || shot.y <= state.playfieldBounds.top + BUBBLE_RADIUS) {
    attachShot(state, shot);
    return;
  }

  state.shot = shot;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, "#07112f");
  gradient.addColorStop(0.58, "#12336f");
  gradient.addColorStop(1, "#071028");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let index = 0; index < 44; index += 1) {
    const x = (index * 137) % width;
    const y = (index * 83) % height;

    context.beginPath();
    context.arc(x, y, 1.8 + (index % 4), 0, Math.PI * 2);
    context.fill();
  }
}

function drawPlayfieldRails(
  context: CanvasRenderingContext2D,
  playfieldBounds: PlayfieldBounds,
  height: number,
) {
  context.strokeStyle = "rgba(238, 244, 255, 0.78)";
  context.lineWidth = 6;
  context.lineCap = "round";
  context.shadowBlur = 10;
  context.shadowColor = "rgba(125, 211, 252, 0.32)";
  context.beginPath();
  context.moveTo(playfieldBounds.left, playfieldBounds.top);
  context.lineTo(playfieldBounds.right, playfieldBounds.top);
  context.moveTo(playfieldBounds.left, playfieldBounds.top);
  context.lineTo(playfieldBounds.left, height);
  context.moveTo(playfieldBounds.right, playfieldBounds.top);
  context.lineTo(playfieldBounds.right, height);
  context.stroke();
  context.shadowBlur = 0;
}

function drawPopProgress(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
) {
  const markerRadius = 11;
  const markerGap = 11;
  const totalWidth = POPS_TO_CLEAR * markerRadius * 2 + markerGap * 2;
  const startX = width - totalWidth - 32;
  const y = 48;

  context.save();

  for (let index = 0; index < POPS_TO_CLEAR; index += 1) {
    const x = startX + index * (markerRadius * 2 + markerGap) + markerRadius;
    const isFilled = index < state.popCount;

    context.fillStyle = isFilled
      ? "rgba(74, 222, 128, 0.92)"
      : "rgba(15, 23, 42, 0.76)";
    context.strokeStyle = isFilled
      ? "rgba(220, 252, 231, 0.95)"
      : "rgba(226, 232, 240, 0.72)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, markerRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  context.restore();
}

function drawBubble(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  bubble: Bubble,
  nowMs: number,
) {
  const popProgress =
    bubble.poppingUntilMs > 0
      ? Math.max(0, 1 - (bubble.poppingUntilMs - nowMs) / 360)
      : 0;
  const radius = BUBBLE_RADIUS * (1 + popProgress * 0.32);
  const alpha = bubble.poppingUntilMs > 0 ? 1 - popProgress : 1;
  const image = images?.[bubble.color];

  context.save();
  context.globalAlpha = alpha;

  if (image) {
    context.drawImage(
      image,
      bubble.x - radius,
      bubble.y - radius,
      radius * 2,
      radius * 2,
    );
  } else {
    context.fillStyle = bubble.color;
    context.beginPath();
    context.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawShooter(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  state: GameState,
  width: number,
  height: number,
) {
  const shooter = getShooterPoint(width, height);
  const aimAngle = getAimAngle(state.aimElapsedSeconds);
  const aimLength = Math.min(210, height * 0.36);
  const nextBubble = {
    color: state.nextBubbleColor,
    id: 0,
    poppingUntilMs: 0,
    x: shooter.x,
    y: shooter.y,
  } satisfies Bubble;

  context.save();
  context.strokeStyle = "rgba(255,255,255,0.78)";
  context.lineWidth = 6;
  context.lineCap = "round";
  context.setLineDash([12, 13]);
  context.beginPath();
  context.moveTo(shooter.x, shooter.y);
  context.lineTo(
    shooter.x + Math.cos(aimAngle) * aimLength,
    shooter.y + Math.sin(aimAngle) * aimLength,
  );
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "rgba(4,10,30,0.88)";
  context.strokeStyle = "rgba(255,255,255,0.72)";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(shooter.x, shooter.y + 28, 48, Math.PI, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();

  drawBubble(context, images, nextBubble, state.elapsedMs);
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  state: GameState,
  width: number,
  height: number,
) {
  drawBackground(context, width, height);
  drawPlayfieldRails(context, state.playfieldBounds, height);
  drawPopProgress(context, state, width);
  state.bubbles
    .filter(
      (bubble) =>
        bubble.poppingUntilMs <= 0 || bubble.poppingUntilMs > state.elapsedMs,
    )
    .forEach((bubble) => drawBubble(context, images, bubble, state.elapsedMs));

  if (state.shot) {
    drawBubble(
      context,
      images,
      { ...state.shot, id: -1, poppingUntilMs: 0 },
      state.elapsedMs,
    );
  }

  drawShooter(context, images, state, width, height);
}

export function useBubbleShooterBossGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const stateRef = useRef<GameState>(createInitialState(MIN_CANVAS_WIDTH));

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
      stateRef.current = createInitialState(canvasWidth);
    };

    const shootBubble = () => {
      const state = stateRef.current;

      if (state.shot || state.hasCleared) {
        return;
      }

      const shooter = getShooterPoint(canvasWidth, canvasHeight);
      const angle = getAimAngle(state.aimElapsedSeconds);

      state.shot = {
        color: state.nextBubbleColor,
        vx: Math.cos(angle) * BUBBLE_SPEED,
        vy: Math.sin(angle) * BUBBLE_SPEED,
        x: shooter.x,
        y: shooter.y - BUBBLE_RADIUS * 0.4,
      };
      playSoundEffect("bubbleShooterShoot");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      shootBubble();
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

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaSeconds * 1000;
      if (!state.shot) {
        state.aimElapsedSeconds +=
          deltaSeconds * (DEFAULT_BEAT_DURATION_MS / beatDurationMs);
      }
      state.bubbles = state.bubbles.filter(
        (bubble) =>
          bubble.poppingUntilMs <= 0 || bubble.poppingUntilMs > state.elapsedMs,
      );
      updateShot(state, deltaSeconds);
      drawScene(context, imagesRef.current, state, canvasWidth, canvasHeight);

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();

    preloadImages()
      .then((images) => {
        if (isDisposed) {
          return;
        }

        imagesRef.current = images;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("resize", resizeCanvas);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
