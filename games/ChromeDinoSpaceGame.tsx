"use client";

import { useEffect, useRef } from "react";
import type { Microgame } from "@/data/microgames";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const CACTUS_COUNT = 2;
const CACTUS_HEIGHT = 82;
const CACTUS_WIDTH = 48;
const DINO_HEIGHT = 86;
const DINO_WIDTH = 92;
const GRAVITY = 3900;
const GROUND_RATIO = 0.68;
const GROUND_HEIGHT = 58;
const CACTUS_BEAT_OFFSETS = [2.4, 5.2] as const;
const CACTUS_TRAVEL_PER_BEAT = 360;
const JUMP_VELOCITY = -1220;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAX_DELTA_SECONDS = 1 / 30;

const CHROME_DINO_IMAGES = {
  cactus: "/games/chrome-dino/images/cactus.png",
  dinosaur: "/games/chrome-dino/images/dinosaur.png",
  ground: "/games/chrome-dino/images/ground.gif",
} as const;

type Cactus = {
  passed: boolean;
  x: number;
};

type GameState = {
  cacti: Cactus[];
  dinoVelocityY: number;
  dinoY: number;
  hasCleared: boolean;
  hasDied: boolean;
  lastTimestamp: number | null;
};

type LoadedImages = Record<keyof typeof CHROME_DINO_IMAGES, HTMLImageElement>;
type GroundCache = {
  canvas: HTMLCanvasElement;
  width: number;
};

function createInitialGameState(width: number): GameState {
  const dinoX = width * 0.18;

  return {
    cacti: Array.from({ length: CACTUS_COUNT }, (_, index) => ({
      passed: false,
      x:
        dinoX +
        CACTUS_TRAVEL_PER_BEAT *
          (CACTUS_BEAT_OFFSETS[index] ?? CACTUS_BEAT_OFFSETS[0]),
    })),
    dinoVelocityY: 0,
    dinoY: 0,
    hasCleared: false,
    hasDied: false,
    lastTimestamp: null,
  };
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

function getCactusSpeed(beatDurationMs: number) {
  return CACTUS_TRAVEL_PER_BEAT / (beatDurationMs / 1000);
}

function intersects(first: DOMRectReadOnly, second: DOMRectReadOnly) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function playSound(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const audio = audioRef.current;

  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Browsers may reject audio before the page receives a trusted input.
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

async function preloadChromeDinoImages() {
  const [cactus, dinosaur, ground] = await Promise.all([
    preloadImage(CHROME_DINO_IMAGES.cactus),
    preloadImage(CHROME_DINO_IMAGES.dinosaur),
    preloadImage(CHROME_DINO_IMAGES.ground),
  ]);

  return { cactus, dinosaur, ground } satisfies LoadedImages;
}

function drawGround(
  context: CanvasRenderingContext2D,
  groundCache: GroundCache,
  canvasWidth: number,
  groundY: number,
) {
  const groundTop = groundY - 8;

  context.drawImage(groundCache.canvas, 0, groundTop);
}

function createGroundCache(
  image: HTMLImageElement,
  width: number,
): GroundCache {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const tileWidth = Math.max(image.naturalWidth, 1);
  const cacheWidth = Math.ceil(width + tileWidth);

  canvas.width = cacheWidth;
  canvas.height = GROUND_HEIGHT;

  if (context) {
    for (let x = 0; x < cacheWidth; x += tileWidth) {
      context.drawImage(image, x, 0, tileWidth, GROUND_HEIGHT);
    }
  }

  return { canvas, width };
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

export function ChromeDinoSpaceGame(
  { microgame }: Readonly<{ microgame: Microgame }>,
) {
  void microgame;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null);
  const dieAudioRef = useRef<HTMLAudioElement | null>(null);
  const groundCacheRef = useRef<GroundCache | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const stateRef = useRef<GameState>(
    createInitialGameState(MIN_CANVAS_WIDTH),
  );

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
    let isDisposed = false;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let beatDurationMs = DEFAULT_BEAT_DURATION_MS;
    let cactusSpeed = getCactusSpeed(DEFAULT_BEAT_DURATION_MS);
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      cactusSpeed = getCactusSpeed(beatDurationMs);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stateRef.current = createInitialGameState(canvasWidth);

      const images = imagesRef.current;

      if (images) {
        groundCacheRef.current = createGroundCache(images.ground, canvasWidth);
      }
    };

    const jump = () => {
      const state = stateRef.current;

      if (state.hasDied || state.dinoY < -1) {
        return;
      }

      state.dinoVelocityY = JUMP_VELOCITY;
      playSound(jumpAudioRef);
    };

    const handleSpace = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      jump();
    };

    const render = (timestamp: number) => {
      const images = imagesRef.current;
      const state = stateRef.current;
      const groundY = canvasHeight * GROUND_RATIO;
      const dinoX = canvasWidth * 0.18;
      const deltaSeconds =
        state.lastTimestamp === null
          ? 0
          : Math.min(
              (timestamp - state.lastTimestamp) / 1000,
              MAX_DELTA_SECONDS,
            );

      state.lastTimestamp = timestamp;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      if (!images) {
        drawCenteredText(
          context,
          "LOADING",
          canvasWidth / 2,
          canvasHeight * 0.34,
          34,
          "#2f2f2f",
        );
        animationFrame = window.requestAnimationFrame(render);
        return;
      }

      if (!state.hasDied) {
        state.dinoVelocityY += GRAVITY * deltaSeconds;
        state.dinoY = Math.min(
          state.dinoY + state.dinoVelocityY * deltaSeconds,
          0,
        );

        if (state.dinoY === 0 && state.dinoVelocityY > 0) {
          state.dinoVelocityY = 0;
        }

        const dinoBox = new DOMRect(
          dinoX + 20,
          groundY - DINO_HEIGHT + state.dinoY + 16,
          DINO_WIDTH - 38,
          DINO_HEIGHT - 24,
        );

        state.cacti = state.cacti.map((cactus) => {
          const nextCactus = {
            ...cactus,
            x: cactus.x - cactusSpeed * deltaSeconds,
          };
          const cactusBox = new DOMRect(
            nextCactus.x + 12,
            groundY - CACTUS_HEIGHT + 10,
            CACTUS_WIDTH - 22,
            CACTUS_HEIGHT - 12,
          );

          if (intersects(dinoBox, cactusBox)) {
            state.hasDied = true;
            playSound(dieAudioRef);
          }

          if (!nextCactus.passed && nextCactus.x + CACTUS_WIDTH < dinoX) {
            return { ...nextCactus, passed: true };
          }

          return nextCactus;
        });

        if (
          !state.hasDied &&
          state.cacti.every((cactus) => cactus.passed) &&
          !state.hasCleared
        ) {
          state.hasCleared = true;
          dispatchClear();
        }
      }

      const groundCache =
        groundCacheRef.current?.width === canvasWidth
          ? groundCacheRef.current
          : createGroundCache(images.ground, canvasWidth);

      groundCacheRef.current = groundCache;
      drawGround(context, groundCache, canvasWidth, groundY);
      state.cacti.forEach((cactus) => {
        context.drawImage(
          images.cactus,
          cactus.x,
          groundY - CACTUS_HEIGHT,
          CACTUS_WIDTH,
          CACTUS_HEIGHT,
        );
      });
      context.globalAlpha = state.hasDied ? 0.58 : 1;
      context.drawImage(
        images.dinosaur,
        dinoX,
        groundY - DINO_HEIGHT + state.dinoY,
        DINO_WIDTH,
        DINO_HEIGHT,
      );
      context.globalAlpha = 1;

      if (state.hasDied) {
        drawCenteredText(
          context,
          "GAME OVER",
          canvasWidth / 2,
          canvasHeight * 0.34,
          38,
          "#777777",
        );
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    preloadChromeDinoImages()
      .then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
          groundCacheRef.current = createGroundCache(
            images.ground,
            canvasWidth,
          );
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleSpace, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleSpace, { capture: true });
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="block h-screen w-screen bg-white" />
      <audio
        ref={jumpAudioRef}
        preload="auto"
        src="/games/chrome-dino/sounds/jump.mp3"
      />
      <audio
        ref={dieAudioRef}
        preload="auto"
        src="/games/chrome-dino/sounds/die.mp3"
      />
    </>
  );
}
