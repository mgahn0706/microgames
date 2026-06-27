"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const ASSETS = {
  background: "/games/bubble-bobble/images/background.png",
  enemy: "/games/bubble-bobble/images/enemy.png",
  player: "/games/bubble-bobble/images/player.png",
} as const;
const SOUNDS = {
  bgm: "/games/bubble-bobble/sounds/bgm.mp3",
  bubbleShot: "/games/bubble-bobble/sounds/bubble-shot.mp3",
} as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAP_WIDTH = 1672;
const MAP_HEIGHT = 941;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const PLAYER_HEIGHT = 74;
const PLAYER_SPEED = 520;
const PLAYER_WIDTH = 72;
const BUBBLE_RADIUS = 27;
const BUBBLE_SPEED = 650;
const ENEMY_SIZE = 70;
const ENEMY_COUNT = 3;
const BUBBLE_COOLDOWN_SECONDS = 0.2;
const PLAYER_BOUNDS = {
  bottom: 826,
  left: 110,
  right: 1560,
  top: 145,
} as const;
const ENEMY_BASE_POINTS = [
  { x: 1040, y: 326 },
  { x: 1308, y: 522 },
  { x: 920, y: 718 },
] as const;

type Direction = -1 | 1;
type AssetKey = keyof typeof ASSETS;
type LoadedImages = Record<AssetKey, HTMLImageElement>;
type Bubble = {
  direction: Direction;
  id: number;
  x: number;
  y: number;
};
type Enemy = {
  captured: boolean;
  phase: number;
  x: number;
  y: number;
};
type GameState = {
  bubbles: Bubble[];
  bubbleCooldownSeconds: number;
  direction: Direction;
  enemies: Enemy[];
  hasCleared: boolean;
  keys: Set<string>;
  lastTimestamp: number | null;
  nextBubbleId: number;
  playerX: number;
  playerY: number;
  timeSeconds: number;
};
type MapLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

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

function getSpeedScale(beatDurationMs: number) {
  return DEFAULT_BEAT_DURATION_MS / beatDurationMs;
}

function getMapLayout(width: number, height: number) {
  const scale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
  const mapWidth = MAP_WIDTH * scale;
  const mapHeight = MAP_HEIGHT * scale;

  return {
    height: mapHeight,
    scale,
    width: mapWidth,
    x: (width - mapWidth) / 2,
    y: (height - mapHeight) / 2,
  } satisfies MapLayout;
}

function createEnemies() {
  return ENEMY_BASE_POINTS.map((point, index) => ({
    captured: false,
    phase: index * 1.8,
    x: point.x,
    y: point.y,
  })) satisfies Enemy[];
}

function createInitialState() {
  return {
    bubbles: [],
    bubbleCooldownSeconds: 0,
    direction: 1,
    enemies: createEnemies(),
    hasCleared: false,
    keys: new Set<string>(),
    lastTimestamp: null,
    nextBubbleId: 0,
    playerX: 282,
    playerY: 800,
    timeSeconds: 0,
  } satisfies GameState;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInputAxis(
  keys: Set<string>,
  positiveKey: string,
  negativeKey: string,
) {
  return Number(keys.has(positiveKey)) - Number(keys.has(negativeKey));
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
    Object.entries(ASSETS).map(async ([key, src]) => {
      const image = await preloadImage(src);

      return [key, image] as const;
    }),
  );

  return Object.fromEntries(entries) as LoadedImages;
}

function createAudio(src: string, volume: number, loop = false) {
  const audio = new Audio(src);

  audio.loop = loop;
  audio.preload = "auto";
  audio.volume = volume;

  return audio;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // User gesture timing can briefly block audio playback.
  });
}

function canShootBubble(state: GameState) {
  return state.bubbleCooldownSeconds === 0 && state.bubbles.length < 4;
}

function shootBubble(state: GameState) {
  if (!canShootBubble(state)) {
    return false;
  }

  state.bubbles.push({
    direction: state.direction,
    id: state.nextBubbleId,
    x: state.playerX + state.direction * (PLAYER_WIDTH * 0.52),
    y: state.playerY - PLAYER_HEIGHT * 0.2,
  });
  state.nextBubbleId += 1;
  state.bubbleCooldownSeconds = BUBBLE_COOLDOWN_SECONDS;

  return true;
}

function updateEnemies(enemies: Enemy[], timeSeconds: number) {
  enemies.forEach((enemy, index) => {
    if (enemy.captured) {
      return;
    }

    const basePoint = ENEMY_BASE_POINTS[index] ?? ENEMY_BASE_POINTS[0];

    enemy.x = basePoint.x + Math.sin(timeSeconds * 2.2 + enemy.phase) * 72;
    enemy.y = basePoint.y + Math.cos(timeSeconds * 1.9 + enemy.phase) * 26;
  });
}

function updateBubbles(
  state: GameState,
  deltaSeconds: number,
  speedScale: number,
) {
  state.bubbles = state.bubbles
    .map((bubble) => ({
      ...bubble,
      x: bubble.x + bubble.direction * BUBBLE_SPEED * speedScale * deltaSeconds,
      y: bubble.y - BUBBLE_SPEED * 0.18 * speedScale * deltaSeconds,
    }))
    .filter(
      (bubble) =>
        bubble.x > -BUBBLE_RADIUS &&
        bubble.x < MAP_WIDTH + BUBBLE_RADIUS &&
        bubble.y > -BUBBLE_RADIUS,
    );
}

function resolveBubbleHits(state: GameState) {
  const remainingBubbles: Bubble[] = [];

  state.bubbles.forEach((bubble) => {
    const target = state.enemies.find(
      (enemy) =>
        !enemy.captured &&
        Math.hypot(enemy.x - bubble.x, enemy.y - bubble.y) <=
          ENEMY_SIZE * 0.43 + BUBBLE_RADIUS,
    );

    if (target) {
      target.captured = true;
      return;
    }

    remainingBubbles.push(bubble);
  });

  state.bubbles = remainingBubbles;
}

function updatePlayer(
  state: GameState,
  deltaSeconds: number,
  speedScale: number,
) {
  const inputX = getInputAxis(state.keys, "ArrowRight", "ArrowLeft");
  const inputY = getInputAxis(state.keys, "ArrowDown", "ArrowUp");
  const inputLength = Math.hypot(inputX, inputY);

  if (inputX !== 0) {
    state.direction = inputX > 0 ? 1 : -1;
  }

  if (inputLength === 0) {
    return;
  }

  const distance = PLAYER_SPEED * speedScale * deltaSeconds;

  state.playerX = clamp(
    state.playerX + (inputX / inputLength) * distance,
    PLAYER_BOUNDS.left,
    PLAYER_BOUNDS.right,
  );
  state.playerY = clamp(
    state.playerY + (inputY / inputLength) * distance,
    PLAYER_BOUNDS.top,
    PLAYER_BOUNDS.bottom,
  );
}

function updateGame(
  state: GameState,
  deltaSeconds: number,
  speedScale: number,
) {
  state.timeSeconds += deltaSeconds;
  state.bubbleCooldownSeconds = Math.max(
    state.bubbleCooldownSeconds - deltaSeconds,
    0,
  );
  updatePlayer(state, deltaSeconds, speedScale);
  updateEnemies(state.enemies, state.timeSeconds);
  updateBubbles(state, deltaSeconds, speedScale);
  resolveBubbleHits(state);

  if (!state.hasCleared && state.enemies.every((enemy) => enemy.captured)) {
    state.hasCleared = true;
    state.keys.clear();
    dispatchClear();
  }
}

function drawBubble(context: CanvasRenderingContext2D, bubble: Bubble) {
  const gradient = context.createRadialGradient(
    bubble.x - BUBBLE_RADIUS * 0.35,
    bubble.y - BUBBLE_RADIUS * 0.45,
    BUBBLE_RADIUS * 0.2,
    bubble.x,
    bubble.y,
    BUBBLE_RADIUS,
  );

  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.42, "rgba(147,197,253,0.55)");
  gradient.addColorStop(1, "rgba(14,165,233,0.72)");

  context.fillStyle = gradient;
  context.strokeStyle = "rgba(224,242,254,0.92)";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(bubble.x, bubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  context.save();
  context.translate(state.playerX, state.playerY);
  context.scale(state.direction, 1);
  context.drawImage(
    image,
    -PLAYER_WIDTH / 2,
    -PLAYER_HEIGHT / 2,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
  );
  context.restore();
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  enemy: Enemy,
  timeSeconds: number,
) {
  if (enemy.captured) {
    context.save();
    context.globalAlpha = 0.36;
    drawBubble(context, {
      direction: 1,
      id: -1,
      x: enemy.x,
      y: enemy.y,
    });
    context.restore();
    return;
  }

  context.save();
  context.translate(enemy.x, enemy.y);
  context.rotate(Math.sin(timeSeconds * 4 + enemy.phase) * 0.12);
  context.drawImage(
    image,
    -ENEMY_SIZE / 2,
    -ENEMY_SIZE / 2,
    ENEMY_SIZE,
    ENEMY_SIZE,
  );
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages | null,
  width: number,
  height: number,
) {
  const layout = getMapLayout(width, height);

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  if (!images) {
    return;
  }

  context.drawImage(
    images.background,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
  );

  context.save();
  context.translate(layout.x, layout.y);
  context.scale(layout.scale, layout.scale);

  state.enemies.forEach((enemy) => {
    drawEnemy(context, images.enemy, enemy, state.timeSeconds);
  });
  state.bubbles.forEach((bubble) => {
    drawBubble(context, bubble);
  });
  drawPlayer(context, images.player, state);

  const capturedCount = state.enemies.filter((enemy) => enemy.captured).length;

  context.fillStyle = "#00ff4c";
  context.font = "900 42px 'Courier New', monospace";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(`${capturedCount}/${ENEMY_COUNT}`, 260, 64);
  context.restore();
}

export function useBubbleBobbleGameCanvas(gameBeatCount: number) {
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

    const bgmAudio = createAudio(SOUNDS.bgm, 0.58, true);
    const bubbleShotAudio = createAudio(SOUNDS.bubbleShot, 0.8);
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;

    const syncAudioSpeed = () => {
      const speedScale = getSpeedScale(beatDurationMs);

      bgmAudio.playbackRate = speedScale;
      bubbleShotAudio.playbackRate = speedScale;
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      beatDurationMs = getBeatDurationMs(canvas);
      syncAudioSpeed();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== " " &&
        event.code !== "Space" &&
        !event.key.startsWith("Arrow")
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === " " || event.code === "Space") {
        if (shootBubble(stateRef.current)) {
          playAudio(bubbleShotAudio);
        }
        return;
      }

      stateRef.current.keys.add(event.key);
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

      if (!state.hasCleared) {
        updateGame(state, deltaSeconds, getSpeedScale(beatDurationMs));
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
    bgmAudio.play().catch(() => {
      // The game remains playable if autoplay is unavailable.
    });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("resize", resizeCanvas);
      bgmAudio.pause();
      bubbleShotAudio.pause();
    };
  }, [gameBeatCount]);

  return canvasRef;
}
