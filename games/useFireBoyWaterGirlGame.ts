"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const ASSETS = {
  background: "/games/fire-boy-and-water-girl/images/background.webp",
  fireIdle: "/games/fire-boy-and-water-girl/images/fire-boy-idle.png",
  fireRun: "/games/fire-boy-and-water-girl/images/fire-boy-run.png",
  waterIdle: "/games/fire-boy-and-water-girl/images/water-girl-idle.png",
  waterRun: "/games/fire-boy-and-water-girl/images/water-girl-run.png",
} as const;
const BGM_SRC = "/games/fire-boy-and-water-girl/sounds/level-bgm.mp3";
const DEATH_SOUND_SRC = "/games/fire-boy-and-water-girl/sounds/death.mp3";
const JUMP_SOUND_SRCS = {
  fire: "/games/fire-boy-and-water-girl/sounds/fireboy-jump.mp3",
  water: "/games/fire-boy-and-water-girl/sounds/watergirl-jump.mp3",
} as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const DEFAULT_GRAVITY_HEIGHTS_PER_SECOND = 1.8;
const DEFAULT_JUMP_VELOCITY_HEIGHTS_PER_SECOND = -0.78;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MOVE_RATIO_PER_BEAT = 0.115;
const PLAYER_HEIGHT_RATIO = 0.072;
const START_X_RATIO = 0.39;
const FLOOR_Y_RATIO = 0.965;
const LAVA_LEFT_RATIO = 0.49;
const LAVA_RIGHT_RATIO = 0.57;
const LAVA_EDGE_BLEND_RATIO = 0.018;
const LAVA_SINK_RATIO = 0.01;
const WATER_LEFT_RATIO = 0.7;
const WATER_RIGHT_RATIO = 0.77;
const POOL_TOP_RATIO = 0.958;
const GOAL_X_RATIO = 0.87;

type LoadedImages = Record<keyof typeof ASSETS, HTMLImageElement>;
type PlayerCharacter = keyof typeof JUMP_SOUND_SRCS;

type GameState = {
  character: PlayerCharacter;
  direction: -1 | 1;
  hasCleared: boolean;
  hasFailed: boolean;
  isJumping: boolean;
  keys: Set<string>;
  lastTimestamp: number | null;
  velocityY: number;
  x: number;
  yOffset: number;
};

type ImageLayout = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

function createInitialState() {
  return {
    character: Math.random() < 0.5 ? "fire" : "water",
    direction: 1,
    hasCleared: false,
    hasFailed: false,
    isJumping: false,
    keys: new Set<string>(),
    lastTimestamp: null,
    velocityY: 0,
    x: START_X_RATIO,
    yOffset: 0,
  } satisfies GameState;
}

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
    : DEFAULT_BEAT_DURATION_MS;
}

function getTempoScale(beatDurationMs: number) {
  return DEFAULT_BEAT_DURATION_MS / beatDurationMs;
}

function getCoverImageLayout(
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
  } satisfies ImageLayout;
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
  const [background, fireIdle, fireRun, waterIdle, waterRun] =
    await Promise.all([
      preloadImage(ASSETS.background),
      preloadImage(ASSETS.fireIdle),
      preloadImage(ASSETS.fireRun),
      preloadImage(ASSETS.waterIdle),
      preloadImage(ASSETS.waterRun),
    ]);

  return {
    background,
    fireIdle,
    fireRun,
    waterIdle,
    waterRun,
  } satisfies LoadedImages;
}

function playSound(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // The browser may cancel a short effect during a phase transition.
  });
}

function getPoolSinkProgress(x: number, left: number, right: number) {
  if (x <= left || x >= right) {
    return 0;
  }

  const enterProgress = Math.min((x - left) / LAVA_EDGE_BLEND_RATIO, 1);
  const exitProgress = Math.min((right - x) / LAVA_EDGE_BLEND_RATIO, 1);

  return Math.min(enterProgress, exitProgress);
}

function drawGoal(
  context: CanvasRenderingContext2D,
  layout: ImageLayout,
  pulse: number,
) {
  const x = layout.x + layout.width * GOAL_X_RATIO;
  const floorY = layout.y + layout.height * FLOOR_Y_RATIO;
  const y = floorY - layout.height * 0.115;
  const fontSize = Math.max(20, Math.min(42, layout.height * 0.035));

  context.save();
  context.translate(x, y - pulse * layout.height * 0.008);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  context.lineJoin = "round";
  context.lineWidth = Math.max(4, fontSize * 0.14);
  context.strokeStyle = "rgba(30, 18, 5, 0.9)";
  context.fillStyle = "#fef08a";
  context.shadowBlur = 14 + pulse * 10;
  context.shadowColor = "#fde047";
  context.strokeText("GOAL", 0, 0);
  context.fillText("GOAL", 0, 0);

  context.shadowBlur = 8 + pulse * 6;
  context.beginPath();
  context.moveTo(-fontSize * 0.22, fontSize * 0.72);
  context.lineTo(fontSize * 0.22, fontSize * 0.72);
  context.lineTo(0, fontSize * 1.15);
  context.closePath();
  context.fill();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages | null,
  width: number,
  height: number,
) {
  if (!images) {
    context.fillStyle = "#24250f";
    context.fillRect(0, 0, width, height);
    return;
  }

  const layout = getCoverImageLayout(images.background, width, height);
  const playerHeight = layout.height * PLAYER_HEIGHT_RATIO;
  const playerCenterX = layout.x + layout.width * state.x;
  const safePool =
    state.character === "fire"
      ? { left: LAVA_LEFT_RATIO, right: LAVA_RIGHT_RATIO }
      : { left: WATER_LEFT_RATIO, right: WATER_RIGHT_RATIO };
  const safePoolSinkOffset = state.isJumping
    ? 0
    : layout.height *
      LAVA_SINK_RATIO *
      getPoolSinkProgress(state.x, safePool.left, safePool.right);
  const playerBottom =
    layout.y +
    layout.height * FLOOR_Y_RATIO +
    state.yOffset +
    safePoolSinkOffset;
  const isRunning = state.keys.has("ArrowLeft") || state.keys.has("ArrowRight");
  const playerImage =
    state.character === "fire"
      ? isRunning
        ? images.fireRun
        : images.fireIdle
      : isRunning
        ? images.waterRun
        : images.waterIdle;
  const playerWidth =
    playerHeight * (playerImage.naturalWidth / playerImage.naturalHeight);

  context.drawImage(
    images.background,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
  );
  drawGoal(context, layout, (Math.sin(performance.now() / 220) + 1) / 2);

  context.save();
  context.translate(playerCenterX, playerBottom);
  context.scale(state.direction, 1);
  context.drawImage(
    playerImage,
    -playerWidth / 2,
    -playerHeight,
    playerWidth,
    playerHeight,
  );
  context.restore();
}

export function useFireBoyWaterGirlGameCanvas(gameBeatCount: number) {
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

    const bgm = new Audio(BGM_SRC);
    const deathAudio = new Audio(DEATH_SOUND_SRC);
    const jumpAudios = {
      fire: new Audio(JUMP_SOUND_SRCS.fire),
      water: new Audio(JUMP_SOUND_SRCS.water),
    } satisfies Record<PlayerCharacter, HTMLAudioElement>;
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;

    bgm.loop = true;
    bgm.volume = 0.55;
    deathAudio.volume = 0.9;
    jumpAudios.fire.volume = 0.82;
    jumpAudios.water.volume = 0.82;

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
      if (!event.key.startsWith("Arrow")) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      state.keys.add(event.key);

      if (event.key === "ArrowUp" && !event.repeat && !state.isJumping) {
        const background = imagesRef.current?.background;
        const layoutHeight = background
          ? getCoverImageLayout(background, canvasWidth, canvasHeight).height
          : canvasHeight;
        const tempoScale = getTempoScale(beatDurationMs);

        state.isJumping = true;
        state.velocityY =
          DEFAULT_JUMP_VELOCITY_HEIGHTS_PER_SECOND * tempoScale * layoutHeight;
        playSound(jumpAudios[state.character]);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.key.startsWith("Arrow")) {
        return;
      }

      event.preventDefault();
      stateRef.current.keys.delete(event.key);
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

      if (!state.hasCleared && !state.hasFailed) {
        const horizontalInput =
          Number(state.keys.has("ArrowRight")) -
          Number(state.keys.has("ArrowLeft"));
        const moveSpeed = MOVE_RATIO_PER_BEAT / (beatDurationMs / 1000);

        if (horizontalInput !== 0) {
          state.direction = horizontalInput < 0 ? -1 : 1;
          state.x = Math.min(
            Math.max(
              state.x + horizontalInput * moveSpeed * deltaSeconds,
              0.34,
            ),
            0.92,
          );
        }

        if (state.isJumping) {
          const background = imagesRef.current?.background;
          const layoutHeight = background
            ? getCoverImageLayout(background, canvasWidth, canvasHeight).height
            : canvasHeight;
          const tempoScale = getTempoScale(beatDurationMs);

          state.velocityY +=
            DEFAULT_GRAVITY_HEIGHTS_PER_SECOND *
            tempoScale *
            tempoScale *
            layoutHeight *
            deltaSeconds;
          state.yOffset += state.velocityY * deltaSeconds;

          if (state.yOffset >= 0) {
            state.yOffset = 0;
            state.velocityY = 0;
            state.isJumping = false;
          }
        }

        const isOverLava =
          state.x >= LAVA_LEFT_RATIO && state.x <= LAVA_RIGHT_RATIO;
        const isOverWater =
          state.x >= WATER_LEFT_RATIO && state.x <= WATER_RIGHT_RATIO;
        const background = imagesRef.current?.background;
        const layoutHeight = background
          ? getCoverImageLayout(background, canvasWidth, canvasHeight).height
          : canvasHeight;
        const playerFeetRatio =
          FLOOR_Y_RATIO + state.yOffset / Math.max(layoutHeight, 1);

        const isOverFatalPool =
          state.character === "fire" ? isOverWater : isOverLava;

        if (isOverFatalPool && playerFeetRatio >= POOL_TOP_RATIO) {
          state.hasFailed = true;
          state.keys.clear();
          bgm.pause();
          playSound(deathAudio);
        } else if (state.x >= GOAL_X_RATIO) {
          state.hasCleared = true;
          state.keys.clear();
          dispatchClear();
        }
      }

      drawScene(context, state, imagesRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("resize", resizeCanvas);

    preloadImages()
      .then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    bgm.play().catch(() => {
      // The game can still be played when autoplay is unavailable.
    });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("resize", resizeCanvas);
      bgm.pause();
      deathAudio.pause();
      jumpAudios.fire.pause();
      jumpAudios.water.pause();
    };
  }, [gameBeatCount]);

  return canvasRef;
}
