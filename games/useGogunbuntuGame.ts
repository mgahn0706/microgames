"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

type Point = Readonly<{
  x: number;
  y: number;
}>;

type CanvasSize = Readonly<{
  height: number;
  width: number;
}>;

type ImageLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type Coin = {
  arriveAtSeconds: number;
  collected: boolean;
  yOffset: number;
};

type Sparkle = {
  ageMs: number;
  x: number;
  y: number;
};

type GameState = {
  coins: Coin[];
  collectedCount: number;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  playerVelocityY: number;
  playerY: number;
  platformOffset: number;
  sparkles: Sparkle[];
};

const ASSETS = {
  background: "/games/gogunbuntu/images/background.png",
  coin: "/games/gogunbuntu/images/coin.png",
  jumpingPlayer: "/games/gogunbuntu/images/jumping-player.png",
  platform: "/games/gogunbuntu/images/platform.png",
  runningPlayer: "/games/gogunbuntu/images/running-player.png",
} as const;
const SOUNDS = {
  coin: "/games/gogunbuntu/sounds/coin.mp3",
  jump: "/games/gogunbuntu/sounds/jump.mp3",
} as const;

type AssetKey = keyof typeof ASSETS;

const COIN_COUNT_TO_CLEAR = 15;
const COIN_RADIUS = 28;
const DEFAULT_BEAT_DURATION_MS = RHYTHM_DURATION_MS;
const GRAVITY = 2850;
const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const GROUND_SOURCE_Y = 642;
const JUMP_VELOCITY = -1220;
const JUMP_ARC_START_SECONDS = [0.56, 1.42, 2.28, 3.14, 4.0] as const;
const JUMP_ARC_SAMPLE_SECONDS = [
  0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72,
] as const;
const MAX_DELTA_MS = 48;
const PLAYER_HEIGHT = 156;
const PLAYER_CENTER_Y_OFFSET = PLAYER_HEIGHT * 0.45;
const PLAYER_WIDTH = 174;
const PLAYER_SOURCE_X = 430;
const PLAYER_SOLE_OFFSET = 4;
const PLATFORM_BAND_SOURCE_HEIGHT = 132;
const PLATFORM_BAND_SOURCE_Y = 610;
const PLATFORM_SCROLL_PER_BEAT = 760;
const SPARKLE_DURATION_MS = 360;
const SPARKLE_COUNT = 8;
const WORLD_SCROLL_PER_BEAT = 430;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getJumpYAtTime(seconds: number) {
  return Math.min(0, JUMP_VELOCITY * seconds + 0.5 * GRAVITY * seconds ** 2);
}

function getCoinYOffsetForPlayerY(playerY: number) {
  return playerY - PLAYER_CENTER_Y_OFFSET + COIN_RADIUS + 18;
}

function getCoinPattern() {
  const arcCoins = JUMP_ARC_START_SECONDS.flatMap((jumpStartSeconds) =>
    JUMP_ARC_SAMPLE_SECONDS.map((secondsAfterJump) => ({
      arriveAtSeconds: jumpStartSeconds + secondsAfterJump,
      yOffset: getCoinYOffsetForPlayerY(getJumpYAtTime(secondsAfterJump)),
    })),
  );

  return arcCoins.sort((first, second) => {
    if (first.arriveAtSeconds !== second.arriveAtSeconds) {
      return first.arriveAtSeconds - second.arriveAtSeconds;
    }

    return first.yOffset - second.yOffset;
  });
}

function createInitialState() {
  return {
    coins: getCoinPattern().map(({ arriveAtSeconds, yOffset }) => ({
      arriveAtSeconds,
      collected: false,
      yOffset,
    })),
    collectedCount: 0,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    playerVelocityY: 0,
    playerY: 0,
    platformOffset: 0,
    sparkles: [],
  } satisfies GameState;
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
    // Browsers may reject SFX before the first trusted input unlocks audio.
  });
}

function loadImages() {
  return (Object.keys(ASSETS) as AssetKey[]).reduce<
    Partial<Record<AssetKey, HTMLImageElement>>
  >((images, assetKey) => {
    const image = new Image();

    image.src = ASSETS[assetKey];

    return {
      ...images,
      [assetKey]: image,
    };
  }, {});
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
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
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies ImageLayout;
}

function getFallbackLayout(width: number, height: number) {
  const scale = Math.max(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);
  const drawWidth = BACKGROUND_WIDTH * scale;
  const drawHeight = BACKGROUND_HEIGHT * scale;

  return {
    height: drawHeight,
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies ImageLayout;
}

function getBackgroundLayout(
  image: HTMLImageElement | undefined,
  width: number,
  height: number,
) {
  return isImageReady(image)
    ? getCoverLayout(image, width, height)
    : getFallbackLayout(width, height);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  width: number,
  height: number,
) {
  const layout = getBackgroundLayout(image, width, height);

  if (!isImageReady(image)) {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#07162f");
    gradient.addColorStop(0.62, "#074660");
    gradient.addColorStop(1, "#15202d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return layout;
  }

  context.drawImage(image, layout.x, layout.y, layout.width, layout.height);

  return layout;
}

function drawMovingPlatform(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  layout: ImageLayout,
  offset: number,
) {
  const platformHeight = PLATFORM_BAND_SOURCE_HEIGHT * layout.scale;
  const y = layout.y + PLATFORM_BAND_SOURCE_Y * layout.scale;

  if (!isImageReady(image)) {
    context.fillStyle = "#2f4858";
    context.fillRect(layout.x, y, layout.width, platformHeight);
    context.fillStyle = "#d5a52d";
    context.fillRect(layout.x, y, layout.width, 8);
    return;
  }

  const scale = layout.scale;
  const tileWidth = image.naturalWidth * scale;
  const startX = -(((offset % tileWidth) + tileWidth) % tileWidth);

  for (
    let x = layout.x + startX - tileWidth;
    x < layout.x + layout.width + tileWidth;
    x += tileWidth
  ) {
    context.drawImage(
      image,
      0,
      PLATFORM_BAND_SOURCE_Y,
      image.naturalWidth,
      PLATFORM_BAND_SOURCE_HEIGHT,
      x,
      y,
      tileWidth,
      platformHeight,
    );
  }
}

function getGroundY(layout: ImageLayout) {
  return layout.y + GROUND_SOURCE_Y * layout.scale;
}

function getPlayerPoint(layout: ImageLayout, groundY: number, playerY: number) {
  return {
    x: layout.x + PLAYER_SOURCE_X * layout.scale,
    y: groundY + playerY + PLAYER_SOLE_OFFSET * layout.scale,
  } satisfies Point;
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  layout: ImageLayout,
  groundY: number,
  state: GameState,
) {
  const playerPoint = getPlayerPoint(layout, groundY, state.playerY);
  const playerWidth = PLAYER_WIDTH * layout.scale;
  const playerHeight = PLAYER_HEIGHT * layout.scale;
  const image =
    Math.abs(state.playerY) > 2 ? images.jumpingPlayer : images.runningPlayer;
  const isAirborne = Math.abs(state.playerY) > 2;
  const runCycle = Math.sin(state.elapsedMs / 55);
  const squash = isAirborne ? 1 : 1 + Math.abs(runCycle) * 0.035;
  const stretch = isAirborne ? 1 : 1 - Math.abs(runCycle) * 0.025;
  const rotation = isAirborne
    ? Math.max(-0.2, Math.min(0.16, state.playerVelocityY / 6200))
    : runCycle * 0.035;

  context.save();
  context.translate(playerPoint.x, playerPoint.y);
  context.rotate(rotation);
  context.scale(squash, stretch);
  context.shadowBlur = 18;
  context.shadowColor = "rgba(15, 23, 42, 0.55)";

  if (isImageReady(image)) {
    context.drawImage(
      image,
      -playerWidth / 2,
      -playerHeight,
      playerWidth,
      playerHeight,
    );
  } else {
    context.fillStyle = "#f59e0b";
    context.fillRect(
      -playerWidth / 2,
      -playerHeight,
      playerWidth,
      playerHeight,
    );
  }

  context.restore();
}

function getCoinPoint(
  coin: Coin,
  elapsedSeconds: number,
  groundY: number,
  layout: ImageLayout,
  worldSpeed: number,
) {
  const playerX = layout.x + PLAYER_SOURCE_X * layout.scale;

  return {
    x: playerX + (coin.arriveAtSeconds - elapsedSeconds) * worldSpeed,
    y: groundY - COIN_RADIUS - 18 + coin.yOffset,
  } satisfies Point;
}

function drawCoin(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  point: Point,
  elapsedMs: number,
) {
  const bob = Math.sin(elapsedMs / 95 + point.x * 0.02) * 5;
  const spin =
    0.72 + Math.abs(Math.sin(elapsedMs / 120 + point.x * 0.01)) * 0.28;
  const size = COIN_RADIUS * 2;

  context.save();
  context.translate(point.x, point.y + bob);
  context.scale(spin, 1);
  context.shadowBlur = 16;
  context.shadowColor = "rgba(250, 204, 21, 0.72)";

  if (isImageReady(image)) {
    context.drawImage(image, -size / 2, -size / 2, size, size);
  } else {
    context.fillStyle = "#facc15";
    context.beginPath();
    context.arc(0, 0, COIN_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawSparkles(
  context: CanvasRenderingContext2D,
  sparkles: readonly Sparkle[],
) {
  sparkles.forEach((sparkle, index) => {
    const progress = sparkle.ageMs / SPARKLE_DURATION_MS;
    const angle = (Math.PI * 2 * index) / SPARKLE_COUNT;
    const distance = 10 + progress * 34;
    const alpha = Math.max(0, 1 - progress);
    const x = sparkle.x + Math.cos(angle) * distance;
    const y = sparkle.y + Math.sin(angle) * distance - progress * 10;
    const size = 8 * (1 - progress * 0.45);

    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = "#fff7ad";
    context.lineWidth = 2.5;
    context.shadowBlur = 12;
    context.shadowColor = "rgba(250, 204, 21, 0.9)";
    context.beginPath();
    context.moveTo(x - size, y);
    context.lineTo(x + size, y);
    context.moveTo(x, y - size);
    context.lineTo(x, y + size);
    context.stroke();
    context.restore();
  });
}

function drawCounter(
  context: CanvasRenderingContext2D,
  count: number,
  width: number,
) {
  const x = width - 138;
  const y = 52;

  context.save();
  context.fillStyle = "rgba(3, 7, 18, 0.68)";
  context.strokeStyle = "rgba(250, 204, 21, 0.92)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x - 92, y - 30, 184, 60, 12);
  context.fill();
  context.stroke();
  context.fillStyle = "#fde68a";
  context.font = "900 28px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${count}/${COIN_COUNT_TO_CLEAR}`, x, y + 1);
  context.restore();
}

function collectCoins(
  state: GameState,
  playerPoint: Point,
  elapsedSeconds: number,
  groundY: number,
  coinAudio: HTMLAudioElement | null,
  worldSpeed: number,
  layout: ImageLayout,
) {
  state.coins.forEach((coin) => {
    if (coin.collected) {
      return;
    }

    const coinPoint = getCoinPoint(
      coin,
      elapsedSeconds,
      groundY,
      layout,
      worldSpeed,
    );
    const xDistance = Math.abs(playerPoint.x - coinPoint.x);
    const yDistance = Math.abs(
      playerPoint.y - PLAYER_CENTER_Y_OFFSET - coinPoint.y,
    );

    if (xDistance > 58 || yDistance > 64) {
      return;
    }

    coin.collected = true;
    state.collectedCount += 1;
    state.sparkles = [
      ...state.sparkles,
      ...Array.from({ length: SPARKLE_COUNT }, () => ({
        ageMs: 0,
        x: coinPoint.x,
        y: coinPoint.y,
      })),
    ];
    playAudio(coinAudio);

    if (!state.hasCleared && state.collectedCount >= COIN_COUNT_TO_CLEAR) {
      state.hasCleared = true;
      dispatchClear();
    }
  });
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): CanvasSize {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const nextWidth = Math.max(1, Math.floor(bounds.width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(bounds.height * pixelRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { height, width };
}

export function useGogunbuntuGameCanvas({
  isActive,
}: Readonly<{ isActive: boolean }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const isActiveRef = useRef(isActive);
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    imagesRef.current = loadImages();
    jumpAudioRef.current = createAudio(SOUNDS.jump);
    coinAudioRef.current = createAudio(SOUNDS.coin);
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

    const jump = () => {
      const state = stateRef.current;

      if (!isActiveRef.current || state.playerY < -2) {
        return;
      }

      state.playerVelocityY = JUMP_VELOCITY;
      playAudio(jumpAudioRef.current);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.repeat) {
        return;
      }

      jump();
    };
    const render = (timestamp: number) => {
      const { height, width } = resizeCanvas(canvas, context);

      const beatDurationMs = getBeatDurationMs(canvas);
      const worldSpeed = WORLD_SCROLL_PER_BEAT / (beatDurationMs / 1000);
      const platformSpeed = PLATFORM_SCROLL_PER_BEAT / (beatDurationMs / 1000);
      const backgroundLayout = getBackgroundLayout(
        imagesRef.current.background,
        width,
        height,
      );
      const groundY = getGroundY(backgroundLayout);
      if (stateRef.current.lastTimestamp === null) {
        stateRef.current = createInitialState();
      }

      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);
      const deltaSeconds = deltaMs / 1000;

      state.lastTimestamp = timestamp;

      if (isActiveRef.current) {
        state.elapsedMs += deltaMs;
        state.platformOffset += platformSpeed * deltaSeconds;
        state.sparkles = state.sparkles
          .map((sparkle) => ({
            ...sparkle,
            ageMs: sparkle.ageMs + deltaMs,
          }))
          .filter((sparkle) => sparkle.ageMs < SPARKLE_DURATION_MS);
      }

      if (isActiveRef.current) {
        state.playerVelocityY += GRAVITY * deltaSeconds;
        state.playerY = Math.min(
          0,
          state.playerY + state.playerVelocityY * deltaSeconds,
        );

        if (state.playerY === 0) {
          state.playerVelocityY = 0;
        }
      }

      const elapsedSeconds = state.elapsedMs * 0.001;
      const playerPoint = getPlayerPoint(
        backgroundLayout,
        groundY,
        state.playerY,
      );

      if (isActiveRef.current) {
        collectCoins(
          state,
          playerPoint,
          elapsedSeconds,
          groundY,
          coinAudioRef.current,
          worldSpeed,
          backgroundLayout,
        );
      }

      context.clearRect(0, 0, width, height);
      drawBackground(context, imagesRef.current.background, width, height);
      drawMovingPlatform(
        context,
        imagesRef.current.platform,
        backgroundLayout,
        state.platformOffset,
      );
      state.coins.forEach((coin) => {
        if (coin.collected) {
          return;
        }

        const coinPoint = getCoinPoint(
          coin,
          elapsedSeconds,
          groundY,
          backgroundLayout,
          worldSpeed,
        );

        if (coinPoint.x < -80 || coinPoint.x > width + 80) {
          return;
        }

        drawCoin(context, imagesRef.current.coin, coinPoint, state.elapsedMs);
      });
      drawSparkles(context, state.sparkles);
      drawPlayer(context, imagesRef.current, backgroundLayout, groundY, state);
      drawCounter(context, state.collectedCount, width);

      frameRef.current = window.requestAnimationFrame(render);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });

      if (frameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  return canvasRef;
}
