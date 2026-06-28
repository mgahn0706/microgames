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
const PLAYER_HALF_FOOT_WIDTH = 25;
const GRAVITY = 2200;
const JUMP_VELOCITY = -980;
const MAX_FALL_SPEED = 1220;
const BUBBLE_RADIUS = 31;
const BUBBLE_SPEED = 820;
const BUBBLE_FORWARD_SECONDS = 1.05;
const BUBBLE_DRIFT_SPEED = 150;
const BUBBLE_RISE_SPEED = 210;
const BUBBLE_WOBBLE_AMPLITUDE = 10;
const BUBBLE_WOBBLE_FREQUENCY = 11;
const ENEMY_SIZE = 70;
const ENEMY_COUNT = 2;
const ENEMY_PATROL_DISTANCE = 72;
const BUBBLE_COOLDOWN_SECONDS = 0.2;
const PLAYER_LEFT_BOUND = 78;
const PLAYER_RIGHT_BOUND = 1594;
const PLATFORM_SNAP_DISTANCE = 5;
const PLATFORM_DROP_THROUGH_DISTANCE = 10;
const PLATFORMS = [
  { left: 42, right: 128, top: 374 },
  { left: 240, right: 1426, top: 374 },
  { left: 1538, right: 1626, top: 374 },
  { left: 42, right: 128, top: 537 },
  { left: 240, right: 1426, top: 537 },
  { left: 1538, right: 1626, top: 537 },
  { left: 42, right: 128, top: 701 },
  { left: 240, right: 1426, top: 701 },
  { left: 1538, right: 1626, top: 701 },
  { left: 42, right: 1626, top: 888 },
] as const;
const LOWEST_PLATFORM_TOP = 888;
const ENEMY_BASE_POINTS = [
  { x: 1040, y: 337 },
  { x: 1308, y: 500 },
] as const;

type Direction = -1 | 1;
type AssetKey = keyof typeof ASSETS;
type LoadedImages = Record<AssetKey, HTMLImageElement>;
type Bubble = {
  ageSeconds: number;
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
type Platform = (typeof PLATFORMS)[number];
type GameState = {
  bubbles: Bubble[];
  bubbleCooldownSeconds: number;
  direction: Direction;
  dropRequested: boolean;
  enemies: Enemy[];
  hasCleared: boolean;
  isGrounded: boolean;
  jumpRequested: boolean;
  keys: Set<string>;
  lastTimestamp: number | null;
  nextBubbleId: number;
  playerX: number;
  playerY: number;
  timeSeconds: number;
  velocityY: number;
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
    dropRequested: false,
    enemies: createEnemies(),
    hasCleared: false,
    isGrounded: true,
    jumpRequested: false,
    keys: new Set<string>(),
    lastTimestamp: null,
    nextBubbleId: 0,
    playerX: 282,
    playerY: 888 - PLAYER_HEIGHT / 2,
    timeSeconds: 0,
    velocityY: 0,
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

function overlapsPlatform(x: number, platform: Platform) {
  return (
    x + PLAYER_HALF_FOOT_WIDTH >= platform.left &&
    x - PLAYER_HALF_FOOT_WIDTH <= platform.right
  );
}

function getSupportedPlatform(state: GameState) {
  const playerFeetY = state.playerY + PLAYER_HEIGHT / 2;

  return PLATFORMS.find(
    (platform) =>
      overlapsPlatform(state.playerX, platform) &&
      Math.abs(playerFeetY - platform.top) <= PLATFORM_SNAP_DISTANCE,
  );
}

function canDropThroughPlatform(platform: Platform | undefined) {
  return Boolean(platform && platform.top < LOWEST_PLATFORM_TOP);
}

function resolvePlatformLanding(state: GameState, previousY: number) {
  const previousFeetY = previousY + PLAYER_HEIGHT / 2;
  const playerFeetY = state.playerY + PLAYER_HEIGHT / 2;
  const landedPlatform = PLATFORMS.find(
    (platform) =>
      overlapsPlatform(state.playerX, platform) &&
      previousFeetY <= platform.top + PLATFORM_SNAP_DISTANCE &&
      playerFeetY >= platform.top,
  );

  if (!landedPlatform) {
    state.isGrounded = false;
    return;
  }

  state.playerY = landedPlatform.top - PLAYER_HEIGHT / 2;
  state.velocityY = 0;
  state.isGrounded = true;
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
    ageSeconds: 0,
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

    enemy.x =
      basePoint.x +
      Math.sin(timeSeconds * 2.2 + enemy.phase) * ENEMY_PATROL_DISTANCE;
    enemy.y = basePoint.y;
  });
}

function updateBubbles(
  state: GameState,
  deltaSeconds: number,
  speedScale: number,
) {
  const scaledDeltaSeconds = deltaSeconds * speedScale;

  state.bubbles = state.bubbles
    .map((bubble) => {
      const nextAgeSeconds = bubble.ageSeconds + scaledDeltaSeconds;
      const forwardRatio = Math.max(
        0,
        1 - nextAgeSeconds / BUBBLE_FORWARD_SECONDS,
      );
      const horizontalSpeed =
        BUBBLE_DRIFT_SPEED +
        (BUBBLE_SPEED - BUBBLE_DRIFT_SPEED) * forwardRatio;
      const riseSpeed =
        BUBBLE_RISE_SPEED * (0.35 + (1 - forwardRatio) * 0.85);
      const currentWave = Math.sin(
        bubble.ageSeconds * BUBBLE_WOBBLE_FREQUENCY + bubble.id,
      );
      const nextWave = Math.sin(
        nextAgeSeconds * BUBBLE_WOBBLE_FREQUENCY + bubble.id,
      );

      return {
        ...bubble,
        ageSeconds: nextAgeSeconds,
        x:
          bubble.x +
          bubble.direction * horizontalSpeed * scaledDeltaSeconds +
          (nextWave - currentWave) * BUBBLE_WOBBLE_AMPLITUDE,
        y: bubble.y - riseSpeed * scaledDeltaSeconds,
      };
    })
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

  if (inputX !== 0) {
    state.direction = inputX > 0 ? 1 : -1;
  }

  state.playerX = clamp(
    state.playerX + inputX * PLAYER_SPEED * speedScale * deltaSeconds,
    PLAYER_LEFT_BOUND,
    PLAYER_RIGHT_BOUND,
  );

  if (state.isGrounded && !getSupportedPlatform(state)) {
    state.isGrounded = false;
  }

  if (state.dropRequested && state.isGrounded) {
    const supportedPlatform = getSupportedPlatform(state);

    if (canDropThroughPlatform(supportedPlatform)) {
      state.playerY += PLATFORM_DROP_THROUGH_DISTANCE;
      state.velocityY = 0;
      state.isGrounded = false;
    }
  }

  state.dropRequested = false;

  if (state.jumpRequested && state.isGrounded) {
    state.velocityY = JUMP_VELOCITY * speedScale;
    state.isGrounded = false;
  }

  state.jumpRequested = false;

  if (state.isGrounded) {
    state.velocityY = 0;
    return;
  }

  const previousY = state.playerY;

  state.velocityY = Math.min(
    state.velocityY + GRAVITY * speedScale * deltaSeconds,
    MAX_FALL_SPEED * speedScale,
  );
  state.playerY += state.velocityY * deltaSeconds;
  resolvePlatformLanding(state, previousY);
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
  context.scale(-state.direction, 1);
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
) {
  if (enemy.captured) {
    context.save();
    context.globalAlpha = 0.36;
    drawBubble(context, {
      ageSeconds: 0,
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
    drawEnemy(context, images.enemy, enemy);
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

      if (event.key === "ArrowUp" && !event.repeat) {
        stateRef.current.jumpRequested = true;
      }
      if (event.key === "ArrowDown" && !event.repeat) {
        stateRef.current.dropRequested = true;
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
