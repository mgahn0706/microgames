"use client";

import { useEffect, useRef } from "react";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_SECONDS = 1 / 30;
const COOKIE_WIDTH = 82;
const COOKIE_HEIGHT = 104;
const COOKIE_SLIDE_WIDTH = 108;
const COOKIE_SLIDE_HEIGHT = 58;
const GRAVITY = 3100;
const GROUND_Y_RATIO = 0.78;
const JUMP_VELOCITY = -1060;
const OBSTACLE_TRAVEL_PER_BEAT = 335;
const OBSTACLE_GROUPS = [
  { beatOffset: 3.35, type: "bottom" },
  { beatOffset: 5.2, type: "top" },
  { beatOffset: 7.05, type: "bottom" },
  { beatOffset: 8.9, type: "top" },
  { beatOffset: 10.45, type: "bottom" },
] as const;
const COOKIE_RUN_ASSETS = {
  background: "/games/cookie-run/images/background.webp",
  bottomSpikes: "/games/cookie-run/images/bottom_spikes.png",
  ceilingFork: "/games/cookie-run/images/ceiling-fork.png",
  jump: "/games/cookie-run/images/cookie-jump.png",
  runA: "/games/cookie-run/images/cookie-run-A.png",
  runB: "/games/cookie-run/images/cookie-run-B.png",
  slide: "/games/cookie-run/images/cookie-slide.png",
} as const;
const COOKIE_RUN_SOUNDS = {
  jump: "/games/cookie-run/sounds/cookie-jump.mp3",
  slide: "/games/cookie-run/sounds/cookie-slide.mp3",
} as const;

type ObstacleType = (typeof OBSTACLE_GROUPS)[number]["type"];

type Obstacle = {
  type: ObstacleType;
  x: number;
};

type GameState = {
  elapsedMs: number;
  hasCrashed: boolean;
  hasResolved: boolean;
  isSlideHeld: boolean;
  jumpCount: number;
  lastTimestamp: number | null;
  obstacles: Obstacle[];
  playerVelocityY: number;
  playerY: number;
};

type BackgroundLayout = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type LoadedImages = Readonly<
  Record<keyof typeof COOKIE_RUN_ASSETS, HTMLImageElement>
>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getBeatDurationMs(canvas: HTMLCanvasElement) {
  const rawDuration = window
    .getComputedStyle(canvas)
    .getPropertyValue("--game-rhythm-duration")
    .trim();
  const parsedDuration = Number.parseFloat(rawDuration);

  return Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : RHYTHM_DURATION_MS;
}

function createInitialState(width: number) {
  const playerX = width * 0.21;

  return {
    elapsedMs: 0,
    hasCrashed: false,
    hasResolved: false,
    isSlideHeld: false,
    jumpCount: 0,
    lastTimestamp: null,
    obstacles: OBSTACLE_GROUPS.map((obstacle) => ({
      type: obstacle.type,
      x: playerX + OBSTACLE_TRAVEL_PER_BEAT * obstacle.beatOffset,
    })),
    playerVelocityY: 0,
    playerY: 0,
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

async function preloadCookieRunImages() {
  const [background, bottomSpikes, ceilingFork, jump, runA, runB, slide] =
    await Promise.all([
      preloadImage(COOKIE_RUN_ASSETS.background),
      preloadImage(COOKIE_RUN_ASSETS.bottomSpikes),
      preloadImage(COOKIE_RUN_ASSETS.ceilingFork),
      preloadImage(COOKIE_RUN_ASSETS.jump),
      preloadImage(COOKIE_RUN_ASSETS.runA),
      preloadImage(COOKIE_RUN_ASSETS.runB),
      preloadImage(COOKIE_RUN_ASSETS.slide),
    ]);

  return {
    background,
    bottomSpikes,
    ceilingFork,
    jump,
    runA,
    runB,
    slide,
  } satisfies LoadedImages;
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
  audio.play().catch(() => {
    // Browser audio can be blocked before a trusted input unlocks playback.
  });
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
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies BackgroundLayout;
}

function getGroundY(height: number) {
  return height * GROUND_Y_RATIO;
}

function getObstacleSpeed(beatDurationMs: number) {
  return OBSTACLE_TRAVEL_PER_BEAT / (beatDurationMs / 1000);
}

function intersects(first: DOMRectReadOnly, second: DOMRectReadOnly) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!image) {
    context.fillStyle = "#1f2937";
    context.fillRect(0, 0, width, height);
    return;
  }

  const layout = getCoverLayout(image, width, height);

  context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
}

function drawGround(
  context: CanvasRenderingContext2D,
  width: number,
  y: number,
) {
  const groundHeight = 24;

  context.save();
  context.fillStyle = "#4a2b1b";
  context.fillRect(0, y, width, groundHeight);
  context.fillStyle = "#8b5a2b";
  context.fillRect(0, y, width, 6);
  context.fillStyle = "rgba(0,0,0,0.22)";
  context.fillRect(0, y + groundHeight, width, 80);
  context.restore();
}

function getPlayerRect(
  playerX: number,
  groundY: number,
  playerY: number,
  isSliding: boolean,
) {
  const width = isSliding ? COOKIE_SLIDE_WIDTH : COOKIE_WIDTH;
  const height = isSliding ? COOKIE_SLIDE_HEIGHT : COOKIE_HEIGHT;

  return new DOMRect(
    playerX - width * 0.5,
    groundY - height + playerY,
    width,
    height,
  );
}

function getObstacleRect(obstacle: Obstacle, groundY: number) {
  if (obstacle.type === "bottom") {
    return new DOMRect(obstacle.x, groundY - 70, 62, 70);
  }

  return new DOMRect(obstacle.x, groundY - 220, 50, 145);
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  rect: DOMRectReadOnly,
  elapsedMs: number,
  hasCrashed: boolean,
  isAirborne: boolean,
  isSliding: boolean,
) {
  const image = isSliding
    ? images?.slide
    : isAirborne
      ? images?.jump
      : Math.floor(elapsedMs / 140) % 2 === 0
        ? images?.runA
        : images?.runB;

  context.save();
  context.shadowBlur = 18;
  context.globalAlpha = hasCrashed ? 0.58 : 1;
  context.shadowColor = hasCrashed
    ? "rgba(239,68,68,0.5)"
    : "rgba(250,204,21,0.36)";

  if (image) {
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  } else {
    context.fillStyle = "#f59e0b";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  context.restore();
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  obstacle: Obstacle,
  groundY: number,
) {
  const rect = getObstacleRect(obstacle, groundY);
  const image =
    obstacle.type === "bottom" ? images?.bottomSpikes : images?.ceilingFork;

  if (image) {
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    return;
  }

  context.fillStyle = obstacle.type === "bottom" ? "#ef4444" : "#d1d5db";
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  state: GameState,
  width: number,
  height: number,
) {
  const groundY = getGroundY(height);
  const playerX = width * 0.21;
  const isAirborne = state.jumpCount > 0 || state.playerY < 0;
  const isSliding = state.isSlideHeld && !isAirborne;
  const playerRect = getPlayerRect(playerX, groundY, state.playerY, isSliding);

  drawBackground(context, images?.background ?? null, width, height);
  drawGround(context, width, groundY);
  state.obstacles.forEach((obstacle) => {
    drawObstacle(context, images, obstacle, groundY);
  });
  drawPlayer(
    context,
    images,
    playerRect,
    state.elapsedMs,
    state.hasCrashed,
    isAirborne,
    isSliding,
  );

  if (state.hasCrashed) {
    context.fillStyle = "rgba(239, 68, 68, 0.32)";
    context.fillRect(0, 0, width, height);
  }
}

function collides(state: GameState, width: number, height: number) {
  const groundY = getGroundY(height);
  const playerX = width * 0.21;
  const isAirborne = state.jumpCount > 0 || state.playerY < 0;
  const isSliding = state.isSlideHeld && !isAirborne;
  const playerRect = getPlayerRect(playerX, groundY, state.playerY, isSliding);

  return state.obstacles.some((obstacle) => {
    const obstacleRect = getObstacleRect(obstacle, groundY);

    return intersects(playerRect, obstacleRect);
  });
}

export function useCookieRunGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const frameRef = useRef<number | null>(null);
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null);
  const slideAudioRef = useRef<HTMLAudioElement | null>(null);
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

    const beatDurationMs = getBeatDurationMs(canvas);
    const roundDurationMs = gameBeatCount * beatDurationMs;
    const obstacleSpeed = getObstacleSpeed(beatDurationMs);

    jumpAudioRef.current = createAudio(COOKIE_RUN_SOUNDS.jump);
    slideAudioRef.current = createAudio(COOKIE_RUN_SOUNDS.slide);

    const resizeCanvas = () => {
      const width = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
      const height = Math.max(window.innerHeight, MIN_CANVAS_HEIGHT);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      return { height, width };
    };

    const resolveClear = () => {
      if (stateRef.current.hasResolved) {
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        hasResolved: true,
      };
      dispatchClear();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        stateRef.current.hasCrashed ||
        stateRef.current.hasResolved ||
        event.repeat
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        if (stateRef.current.jumpCount >= 2) {
          return;
        }

        stateRef.current = {
          ...stateRef.current,
          isSlideHeld: false,
          jumpCount: stateRef.current.jumpCount + 1,
          playerVelocityY: JUMP_VELOCITY,
        };
        playAudio(jumpAudioRef.current);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (stateRef.current.isSlideHeld) {
          return;
        }

        stateRef.current = {
          ...stateRef.current,
          isSlideHeld: true,
        };
        playAudio(slideAudioRef.current);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown") {
        return;
      }

      event.preventDefault();
      stateRef.current = {
        ...stateRef.current,
        isSlideHeld: false,
      };
    };

    const render = (timestamp: number) => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const previousTimestamp = stateRef.current.lastTimestamp ?? timestamp;
      const deltaSeconds = Math.min(
        (timestamp - previousTimestamp) / 1000,
        MAX_DELTA_SECONDS,
      );
      const nextElapsedMs = stateRef.current.elapsedMs + deltaSeconds * 1000;
      const isOnGround = stateRef.current.playerY >= 0;
      const nextPlayerVelocityY = stateRef.current.hasCrashed
        ? 0
        : isOnGround && stateRef.current.playerVelocityY > 0
          ? 0
          : stateRef.current.playerVelocityY + GRAVITY * deltaSeconds;
      const nextPlayerY = stateRef.current.hasCrashed
        ? stateRef.current.playerY
        : Math.min(
            stateRef.current.playerY + nextPlayerVelocityY * deltaSeconds,
            0,
          );
      const nextJumpCount = nextPlayerY >= 0 ? 0 : stateRef.current.jumpCount;
      const nextObstacles = stateRef.current.hasCrashed
        ? stateRef.current.obstacles
        : stateRef.current.obstacles.map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - obstacleSpeed * deltaSeconds,
          }));

      stateRef.current = {
        ...stateRef.current,
        elapsedMs: nextElapsedMs,
        jumpCount: nextJumpCount,
        lastTimestamp: timestamp,
        obstacles: nextObstacles,
        playerVelocityY: nextPlayerY >= 0 ? 0 : nextPlayerVelocityY,
        playerY: nextPlayerY,
      };

      drawScene(context, imagesRef.current, stateRef.current, width, height);

      if (
        !stateRef.current.hasResolved &&
        !stateRef.current.hasCrashed &&
        collides(stateRef.current, width, height)
      ) {
        stateRef.current = {
          ...stateRef.current,
          hasCrashed: true,
          isSlideHeld: false,
        };
      }

      if (
        !stateRef.current.hasResolved &&
        !stateRef.current.hasCrashed &&
        stateRef.current.elapsedMs >= roundDurationMs
      ) {
        resolveClear();
      }

      frameRef.current = window.requestAnimationFrame(render);
    };

    preloadCookieRunImages()
      .then((loadedImages) => {
        imagesRef.current = loadedImages;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    const initialSize = resizeCanvas();

    stateRef.current = createInitialState(initialSize.width);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [gameBeatCount]);

  return canvasRef;
}
