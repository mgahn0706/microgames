"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const DEFAULT_BEAT_DURATION_MS = 500;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_SECONDS = 1 / 30;
const MARIO_WIDTH = 54;
const MARIO_HEIGHT = 76;
const JUMP_HEIGHT = 92;
const QUESTION_BLOCK_SIZE = 58;
const TARGET_MIN = 3;
const TARGET_MAX = 7;
const SUCCESS_WINDOW_MS = 120;
const MARIO_SOUND_EFFECT_VOLUME = 0.25;

const SUPER_MARIO_ASSETS = {
  background: "/games/supermario/images/background.png",
  block: "/games/supermario/images/block.png",
  coin: "/games/supermario/images/coin.png",
  mario: "/games/supermario/images/mario.png",
} as const;

const SUPER_MARIO_SOUNDS = {
  coin: "/games/supermario/sounds/coin-sound.mp3",
  jump: "/games/supermario/sounds/jump-sound.mp3",
} as const;

type GameState = {
  collectedCoins: number;
  elapsedMs: number;
  hasCleared: boolean;
  jumpAgeMs: number;
  lastTimestamp: number | null;
  targetCoins: number;
};

type LoadedImages = Record<keyof typeof SUPER_MARIO_ASSETS, HTMLImageElement>;

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

function createInitialState() {
  return {
    collectedCoins: 0,
    elapsedMs: 0,
    hasCleared: false,
    jumpAgeMs: Number.POSITIVE_INFINITY,
    lastTimestamp: null,
    targetCoins:
      TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)),
  } satisfies GameState;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadSuperMarioImages() {
  const [background, block, coin, mario] = await Promise.all([
    preloadImage(SUPER_MARIO_ASSETS.background),
    preloadImage(SUPER_MARIO_ASSETS.block),
    preloadImage(SUPER_MARIO_ASSETS.coin),
    preloadImage(SUPER_MARIO_ASSETS.mario),
  ]);

  return { background, block, coin, mario } satisfies LoadedImages;
}

function playAudio(audio: HTMLAudioElement | null, volume = 1) {
  if (!audio) {
    return;
  }

  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Audio can be blocked before a trusted input unlocks playback.
  });
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
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawCoin(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  isCollected: boolean,
) {
  const size = 42;

  context.globalAlpha = isCollected ? 0.35 : 1;
  context.drawImage(image, x - size / 2, y - size / 2, size, size);
  context.globalAlpha = 1;
}

function drawQuestionBlock(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  lift: number,
) {
  const blockY = y - lift;

  context.drawImage(image, x, blockY, QUESTION_BLOCK_SIZE, QUESTION_BLOCK_SIZE);
}

function drawMario(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  const aspectRatio =
    image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;
  const width = MARIO_HEIGHT * aspectRatio;

  context.drawImage(
    image,
    x + (MARIO_WIDTH - width) / 2,
    y,
    width,
    MARIO_HEIGHT,
  );
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages,
  width: number,
  height: number,
  remainingMs: number,
) {
  const groundY = height * 0.89;
  const marioX = width / 2 - MARIO_WIDTH / 2;
  const blockX = width / 2 - QUESTION_BLOCK_SIZE / 2;
  const blockY =
    groundY - MARIO_HEIGHT - JUMP_HEIGHT - QUESTION_BLOCK_SIZE + 20;
  const jumpProgress = Math.min(state.jumpAgeMs / 360, 1);
  const jumpOffset =
    jumpProgress < 1 ? Math.sin(jumpProgress * Math.PI) * JUMP_HEIGHT : 0;
  const marioY = groundY - MARIO_HEIGHT - jumpOffset;
  const progress = Math.min(Math.max(1 - state.jumpAgeMs / 440, 0), 1);
  const activeCoinY = blockY - 18 - progress * 46;
  const blockLift =
    state.jumpAgeMs < 180
      ? Math.sin((state.jumpAgeMs / 180) * Math.PI) * 10
      : 0;

  drawCoverImage(context, images.background, width, height);

  drawQuestionBlock(context, images.block, blockX, blockY, blockLift);
  drawMario(context, images.mario, marioX, marioY);

  Array.from({ length: state.targetCoins }, (_, index) => {
    const startX = width / 2 - (state.targetCoins - 1) * 21;
    drawCoin(
      context,
      images.coin,
      startX + index * 42,
      height * 0.27,
      index < state.collectedCoins,
    );
  });

  if (state.jumpAgeMs < 440) {
    drawCoin(context, images.coin, width / 2, activeCoinY, false);
  }

  context.fillStyle = "#111827";
  context.fillRect(width / 2 - 214, 20, 428, 118);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 5;
  context.strokeRect(width / 2 - 214, 20, 428, 118);
  drawCenteredText(
    context,
    `목표 코인 ${state.targetCoins}개`,
    width / 2,
    56,
    32,
    "#facc15",
  );
  drawCenteredText(
    context,
    `${state.collectedCoins} / ${state.targetCoins}`,
    width / 2,
    104,
    42,
    state.collectedCoins === state.targetCoins ? "#86efac" : "#ffffff",
  );

  if (state.collectedCoins > state.targetCoins) {
    drawCenteredText(
      context,
      "너무 많아요!",
      width / 2,
      height * 0.5,
      44,
      "#ef4444",
    );
  }
}

export function useSuperMarioCoinGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null);
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
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleSpace = (event: KeyboardEvent) => {
      const state = stateRef.current;

      if (event.code !== "Space" || state.hasCleared) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      state.collectedCoins += 1;
      state.jumpAgeMs = 0;
      playAudio(jumpAudioRef.current, MARIO_SOUND_EFFECT_VOLUME);
      playAudio(coinAudioRef.current, MARIO_SOUND_EFFECT_VOLUME);
    };

    const render = (timestamp: number) => {
      const images = imagesRef.current;
      const state = stateRef.current;
      const deltaSeconds =
        state.lastTimestamp === null
          ? 0
          : Math.min(
              (timestamp - state.lastTimestamp) / 1000,
              MAX_DELTA_SECONDS,
            );
      const phaseDurationMs = gameBeatCount * beatDurationMs;

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaSeconds * 1000;
      state.jumpAgeMs += deltaSeconds * 1000;

      const remainingMs = Math.max(phaseDurationMs - state.elapsedMs, 0);

      if (!images) {
        context.fillStyle = "#60a5fa";
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        drawCenteredText(
          context,
          "불러오는 중",
          canvasWidth / 2,
          canvasHeight / 2,
          32,
          "#ffffff",
        );
        animationFrame = window.requestAnimationFrame(render);
        return;
      }

      drawScene(context, state, images, canvasWidth, canvasHeight, remainingMs);

      if (
        !state.hasCleared &&
        state.lastTimestamp !== null &&
        remainingMs <= SUCCESS_WINDOW_MS &&
        state.collectedCoins === state.targetCoins
      ) {
        state.hasCleared = true;
        playAudio(coinAudioRef.current, MARIO_SOUND_EFFECT_VOLUME);
        dispatchClear();
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    coinAudioRef.current = new Audio(SUPER_MARIO_SOUNDS.coin);
    jumpAudioRef.current = new Audio(SUPER_MARIO_SOUNDS.jump);
    preloadSuperMarioImages()
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
