"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const DEFAULT_BEAT_DURATION_MS = 500;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_SECONDS = 1 / 30;
const CUBE_SIZE = 66;
const DEATH_SOUND = "/games/geometry-dash/sounds/death.mp3";
const EXPLOSION_DURATION_MS = 520;
const GRAVITY = 3600;
const GROUND_IMAGE_Y_RATIO = 0.825;
const JUMP_VELOCITY = -1160;
const ROTATION_SPEED = Math.PI * 3.25;
const SPIKE_HEIGHT = 76;
const SPIKE_WIDTH = 76;
const SPIKE_PAIR_GAP = 8;
const SPIKE_TRAVEL_PER_BEAT = 330;
const SPIKE_GROUPS = [
  { beatOffset: 2.2, canPair: false },
  { beatOffset: 4.7, canPair: true },
  { beatOffset: 7.2, canPair: true },
  { beatOffset: 9.5, canPair: false },
] as const;

const GEOMETRY_DASH_ASSETS = {
  background: "/games/geometry-dash/images/background.png",
  obstacle: "/games/geometry-dash/images/obstacle.png",
  player: "/games/geometry-dash/images/player.png",
} as const;

type Spike = {
  passed: boolean;
  x: number;
};

type GameState = {
  crashAtMs: number | null;
  crashPoint: Point | null;
  cubeRotation: number;
  cubeVelocityY: number;
  cubeY: number;
  elapsedMs: number;
  hasCleared: boolean;
  hasCrashed: boolean;
  lastTimestamp: number | null;
  spikes: Spike[];
};

type LoadedImages = Record<keyof typeof GEOMETRY_DASH_ASSETS, HTMLImageElement>;
type Point = {
  x: number;
  y: number;
};
type BackgroundLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

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

function createInitialState(width: number) {
  const cubeX = width * 0.2;
  const spikes = SPIKE_GROUPS.flatMap(({ beatOffset, canPair }) => {
    const spikeX = cubeX + SPIKE_TRAVEL_PER_BEAT * beatOffset;
    const shouldPair = canPair && Math.random() < 0.45;
    const firstSpike = {
      passed: false,
      x: spikeX,
    };

    if (!shouldPair) {
      return [firstSpike];
    }

    return [
      firstSpike,
      {
        passed: false,
        x: spikeX + SPIKE_WIDTH + SPIKE_PAIR_GAP,
      },
    ];
  });

  return {
    crashAtMs: null,
    crashPoint: null,
    cubeRotation: 0,
    cubeVelocityY: 0,
    cubeY: 0,
    elapsedMs: 0,
    hasCleared: false,
    hasCrashed: false,
    lastTimestamp: null,
    spikes,
  } satisfies GameState;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getSpikeSpeed(beatDurationMs: number) {
  return SPIKE_TRAVEL_PER_BEAT / (beatDurationMs / 1000);
}

function intersects(first: DOMRectReadOnly, second: DOMRectReadOnly) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadGeometryDashImages() {
  const [background, obstacle, player] = await Promise.all([
    preloadImage(GEOMETRY_DASH_ASSETS.background),
    preloadImage(GEOMETRY_DASH_ASSETS.obstacle),
    preloadImage(GEOMETRY_DASH_ASSETS.player),
  ]);

  return { background, obstacle, player } satisfies LoadedImages;
}

function getCoverImageRect(
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

function getGroundY(
  background: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!background) {
    return height * GROUND_IMAGE_Y_RATIO;
  }

  const layout = getCoverImageRect(background, width, height);

  return layout.y + layout.height * GROUND_IMAGE_Y_RATIO;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!image) {
    context.fillStyle = "#2563eb";
    context.fillRect(0, 0, width, height);
    return;
  }

  const layout = getCoverImageRect(image, width, height);

  context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
}

function drawSpike(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  groundY: number,
  isPassed: boolean,
) {
  context.globalAlpha = isPassed ? 0.45 : 1;

  if (image) {
    context.drawImage(
      image,
      x,
      groundY - SPIKE_HEIGHT,
      SPIKE_WIDTH,
      SPIKE_HEIGHT,
    );
  } else {
    context.fillStyle = "#f43f5e";
    context.beginPath();
    context.moveTo(x, groundY);
    context.lineTo(x + SPIKE_WIDTH / 2, groundY - SPIKE_HEIGHT);
    context.lineTo(x + SPIKE_WIDTH, groundY);
    context.closePath();
    context.fill();
  }

  context.globalAlpha = 1;
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  rotation: number,
  hasCrashed: boolean,
) {
  context.save();
  context.translate(x + CUBE_SIZE / 2, y + CUBE_SIZE / 2);
  context.rotate(rotation);
  context.globalAlpha = hasCrashed ? 0.55 : 1;

  if (image) {
    context.drawImage(
      image,
      -CUBE_SIZE / 2,
      -CUBE_SIZE / 2,
      CUBE_SIZE,
      CUBE_SIZE,
    );
  } else {
    context.fillStyle = "#facc15";
    context.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
  }

  context.restore();
  context.globalAlpha = 1;
}

function drawExplosion(
  context: CanvasRenderingContext2D,
  state: GameState,
) {
  if (!state.crashPoint || state.crashAtMs === null) {
    return;
  }

  const ageMs = state.elapsedMs - state.crashAtMs;
  const progress = Math.min(Math.max(ageMs / EXPLOSION_DURATION_MS, 0), 1);
  const particles = 16;

  if (progress >= 1) {
    return;
  }

  context.save();
  context.globalAlpha = 1 - progress;

  for (let index = 0; index < particles; index += 1) {
    const angle = (Math.PI * 2 * index) / particles;
    const distance = 18 + progress * 86;
    const size = 8 + (1 - progress) * 12;
    const x = state.crashPoint.x + Math.cos(angle) * distance;
    const y = state.crashPoint.y + Math.sin(angle) * distance;

    context.fillStyle = index % 2 === 0 ? "#facc15" : "#22d3ee";
    context.fillRect(x - size / 2, y - size / 2, size, size);
  }

  context.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
  context.lineWidth = 5;
  context.beginPath();
  context.arc(
    state.crashPoint.x,
    state.crashPoint.y,
    22 + progress * 72,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages | null,
  width: number,
  height: number,
) {
  const groundY = getGroundY(images?.background ?? null, width, height);
  const cubeX = width * 0.2;
  const cubeTop = groundY - CUBE_SIZE + state.cubeY;

  drawBackground(context, images?.background ?? null, width, height);
  state.spikes.forEach((spike) => {
    drawSpike(context, images?.obstacle ?? null, spike.x, groundY, spike.passed);
  });
  if (!state.hasCrashed) {
    drawPlayer(
      context,
      images?.player ?? null,
      cubeX,
      cubeTop,
      state.cubeRotation,
      state.hasCrashed,
    );
  }
  drawExplosion(context, state);
}

export function useGeometryDashGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deathAudioRef = useRef<HTMLAudioElement | null>(null);
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
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;
    let spikeSpeed = getSpikeSpeed(beatDurationMs);
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      spikeSpeed = getSpikeSpeed(beatDurationMs);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stateRef.current = createInitialState(canvasWidth);
    };

    const jump = () => {
      const state = stateRef.current;

      if (state.hasCrashed || state.hasCleared || state.cubeY < -1) {
        return;
      }

      state.cubeVelocityY = JUMP_VELOCITY;
    };

    const handleSpace = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      jump();
    };

    const playDeathSound = () => {
      const audio = deathAudioRef.current;

      if (!audio) {
        return;
      }

      audio.currentTime = 0;
      audio.play().catch(() => {
        // Audio may be blocked until a trusted input unlocks playback.
      });
    };

    const render = (timestamp: number) => {
      const images = imagesRef.current;
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const groundY = getGroundY(
        images?.background ?? null,
        canvasWidth,
        canvasHeight,
      );
      const cubeX = canvasWidth * 0.2;
      const deltaSeconds =
        state.lastTimestamp === null
          ? 0
          : Math.min(
              (timestamp - state.lastTimestamp) / 1000,
              MAX_DELTA_SECONDS,
            );

      state.lastTimestamp = timestamp;

      if (!state.hasCrashed && !state.hasCleared) {
        state.elapsedMs += deltaSeconds * 1000;
        state.cubeVelocityY += GRAVITY * deltaSeconds;
        state.cubeY = Math.min(
          state.cubeY + state.cubeVelocityY * deltaSeconds,
          0,
        );

        if (state.cubeY === 0 && state.cubeVelocityY > 0) {
          state.cubeVelocityY = 0;
          state.cubeRotation =
            Math.round(state.cubeRotation / (Math.PI / 2)) * (Math.PI / 2);
        }

        if (state.cubeY < 0) {
          state.cubeRotation += ROTATION_SPEED * deltaSeconds;
        }

        const cubeBox = new DOMRect(
          cubeX + 10,
          groundY - CUBE_SIZE + state.cubeY + 8,
          CUBE_SIZE - 20,
          CUBE_SIZE - 14,
        );

        state.spikes = state.spikes.map((spike) => {
          const nextSpike = {
            ...spike,
            x: spike.x - spikeSpeed * deltaSeconds,
          };
          const spikeBox = new DOMRect(
            nextSpike.x + 13,
            groundY - SPIKE_HEIGHT + 16,
            SPIKE_WIDTH - 26,
            SPIKE_HEIGHT - 16,
          );

          if (!state.hasCrashed && intersects(cubeBox, spikeBox)) {
            state.hasCrashed = true;
            state.crashAtMs = state.elapsedMs;
            state.crashPoint = {
              x: cubeX + CUBE_SIZE / 2,
              y: groundY - CUBE_SIZE / 2 + state.cubeY,
            };
            playDeathSound();
          }

          if (!nextSpike.passed && nextSpike.x + SPIKE_WIDTH < cubeX) {
            return { ...nextSpike, passed: true };
          }

          return nextSpike;
        });

        if (state.elapsedMs >= phaseDurationMs && !state.hasCleared) {
          state.hasCleared = true;
          dispatchClear();
        }
      }

      drawScene(context, state, images, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    deathAudioRef.current = new Audio(DEATH_SOUND);
    preloadGeometryDashImages()
      .then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
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
  }, [gameBeatCount]);

  return canvasRef;
}
