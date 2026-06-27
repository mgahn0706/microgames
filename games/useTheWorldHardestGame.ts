"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const ASSETS = {
  background: "/games/the-world-hardest-game/images/background.png",
  obstacle: "/games/the-world-hardest-game/images/obstacle.png",
  player: "/games/the-world-hardest-game/images/player.png",
} as const;
const SOUNDS = {
  death: "/games/the-world-hardest-game/sounds/02. Death.mp3",
  theme: "/games/the-world-hardest-game/sounds/03. Game Theme.mp3",
} as const;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAP_WIDTH = 1672;
const MAP_HEIGHT = 941;
const MAX_DELTA_SECONDS = 1 / 30;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const PLAYER_SIZE = 44;
const PLAYER_SPEED = 430;
const OBSTACLE_SIZE = 44;
const OBSTACLE_COLLISION_RADIUS = 20;
const OBSTACLE_SPEED = 315;
const RESPAWN_INVULNERABLE_SECONDS = 0.18;
const START_POINT = { x: 306, y: 462 } as const;
const FINISH_RECT = { height: 534, width: 238, x: 1241, y: 197 } as const;
const OBSTACLE_ROWS = [310, 385, 460, 535, 610] as const;
const OBSTACLE_RANGE = { left: 540, right: 1124 } as const;
const WALKABLE_RECTS = [
  { height: 534, width: 233, x: 193, y: 197 },
  { height: 82, width: 159, x: 425, y: 649 },
  { height: 458, width: 82, x: 503, y: 273 },
  { height: 376, width: 658, x: 503, y: 273 },
  { height: 77, width: 162, x: 1079, y: 197 },
  FINISH_RECT,
] as const;

type AssetKey = keyof typeof ASSETS;
type LoadedImages = Record<AssetKey, HTMLImageElement>;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type Rect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;
type MapLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;
type GameState = {
  elapsedSeconds: number;
  failCount: number;
  hasCleared: boolean;
  keys: Set<string>;
  lastTimestamp: number | null;
  respawnInvulnerableSeconds: number;
  x: number;
  y: number;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createInitialState() {
  return {
    elapsedSeconds: 0,
    failCount: 0,
    hasCleared: false,
    keys: new Set<string>(),
    lastTimestamp: null,
    respawnInvulnerableSeconds: RESPAWN_INVULNERABLE_SECONDS,
    x: START_POINT.x,
    y: START_POINT.y,
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

function mapRectContainsPoint(rect: Rect, point: Point) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function isWalkablePoint(point: Point) {
  return WALKABLE_RECTS.some((rect) => mapRectContainsPoint(rect, point));
}

function canPlacePlayer(x: number, y: number) {
  const halfSize = PLAYER_SIZE / 2;
  const samplePoints = [
    { x: x - halfSize, y: y - halfSize },
    { x: x + halfSize, y: y - halfSize },
    { x: x - halfSize, y: y + halfSize },
    { x: x + halfSize, y: y + halfSize },
    { x, y },
  ];

  return samplePoints.every(isWalkablePoint);
}

function isInFinish(point: Point) {
  return mapRectContainsPoint(FINISH_RECT, point);
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

function getObstacleX(
  rowIndex: number,
  elapsedSeconds: number,
  speedScale: number,
) {
  const range = OBSTACLE_RANGE.right - OBSTACLE_RANGE.left;
  const startsMovingRight = rowIndex % 2 === 0;
  const normalizedTravel =
    (elapsedSeconds * OBSTACLE_SPEED * speedScale) / range;
  const cycleTravel = normalizedTravel % 2;
  const bounceProgress =
    cycleTravel <= 1 ? cycleTravel : 2 - cycleTravel;
  const progress = startsMovingRight ? bounceProgress : 1 - bounceProgress;

  return OBSTACLE_RANGE.left + progress * range;
}

function getObstacles(elapsedSeconds: number, speedScale: number) {
  return OBSTACLE_ROWS.map((y, rowIndex) => ({
    x: getObstacleX(rowIndex, elapsedSeconds, speedScale),
    y,
  }));
}

function resetPlayer(state: GameState) {
  state.failCount += 1;
  state.keys.clear();
  state.respawnInvulnerableSeconds = RESPAWN_INVULNERABLE_SECONDS;
  state.x = START_POINT.x;
  state.y = START_POINT.y;
}

function updatePlayer(
  state: GameState,
  deltaSeconds: number,
  speedScale: number,
) {
  const inputX =
    Number(state.keys.has("ArrowRight")) - Number(state.keys.has("ArrowLeft"));
  const inputY =
    Number(state.keys.has("ArrowDown")) - Number(state.keys.has("ArrowUp"));
  const length = Math.hypot(inputX, inputY);

  if (length === 0) {
    return;
  }

  const moveDistance = PLAYER_SPEED * speedScale * deltaSeconds;
  const deltaX = (inputX / length) * moveDistance;
  const deltaY = (inputY / length) * moveDistance;
  const nextX = state.x + deltaX;
  const nextY = state.y + deltaY;

  if (canPlacePlayer(nextX, state.y)) {
    state.x = nextX;
  }

  if (canPlacePlayer(state.x, nextY)) {
    state.y = nextY;
  }
}

function hasObstacleCollision(
  state: GameState,
  elapsedSeconds: number,
  speedScale: number,
) {
  return getObstacles(elapsedSeconds, speedScale).some((obstacle) => {
    return (
      Math.hypot(obstacle.x - state.x, obstacle.y - state.y) <=
      OBSTACLE_COLLISION_RADIUS + PLAYER_SIZE * 0.42
    );
  });
}

function drawImageCentered(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  context.drawImage(image, x - size / 2, y - size / 2, size, size);
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages | null,
  width: number,
  height: number,
  beatDurationMs: number,
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

  const speedScale = getSpeedScale(beatDurationMs);
  getObstacles(state.elapsedSeconds, speedScale).forEach((obstacle) => {
    drawImageCentered(
      context,
      images.obstacle,
      obstacle.x,
      obstacle.y,
      OBSTACLE_SIZE,
    );
  });

  context.globalAlpha =
    state.respawnInvulnerableSeconds > 0
      ? 0.48 + Math.sin(state.elapsedSeconds * 40) * 0.18
      : 1;
  drawImageCentered(context, images.player, state.x, state.y, PLAYER_SIZE);
  context.globalAlpha = 1;
  context.restore();

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, Math.max(54, layout.y + 64 * layout.scale));
  context.fillRect(
    0,
    Math.min(height - 52, layout.y + layout.height - 72 * layout.scale),
    width,
    height,
  );
  context.fillStyle = "#ffffff";
  context.font = `900 ${Math.max(20, Math.min(36, height * 0.04))}px Arial, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("LEVEL: 1", 22, Math.max(28, layout.y + 26));
  context.textAlign = "right";
  context.fillText(`FAILS: ${state.failCount}`, width - 28, Math.max(28, layout.y + 26));
  context.textAlign = "left";
  context.fillText("PAUSE/MENU", 22, height - 28);
  context.textAlign = "right";
  context.fillText("MUTE", width - 28, height - 28);
}

export function useTheWorldHardestGameCanvas(gameBeatCount: number) {
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

    const themeAudio = createAudio(SOUNDS.theme, 0.5, true);
    const deathAudio = createAudio(SOUNDS.death, 0.75);
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let beatDurationMs = getBeatDurationMs(canvas);
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;

    const syncAudioSpeed = () => {
      themeAudio.playbackRate = getSpeedScale(beatDurationMs);
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
      if (!event.key.startsWith("Arrow")) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!stateRef.current.hasCleared) {
        stateRef.current.keys.add(event.key);
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
      const speedScale = getSpeedScale(beatDurationMs);

      state.lastTimestamp = timestamp;

      if (!state.hasCleared) {
        state.elapsedSeconds += deltaSeconds;
        state.respawnInvulnerableSeconds = Math.max(
          state.respawnInvulnerableSeconds - deltaSeconds,
          0,
        );
        updatePlayer(state, deltaSeconds, speedScale);

        if (isInFinish({ x: state.x, y: state.y })) {
          state.hasCleared = true;
          state.keys.clear();
          dispatchClear();
        } else if (
          state.respawnInvulnerableSeconds === 0 &&
          hasObstacleCollision(state, state.elapsedSeconds, speedScale)
        ) {
          resetPlayer(state);
          playAudio(deathAudio);
        }
      }

      drawScene(
        context,
        state,
        imagesRef.current,
        canvasWidth,
        canvasHeight,
        beatDurationMs,
      );
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
    themeAudio.play().catch(() => {
      // The game remains playable if autoplay is unavailable.
    });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("resize", resizeCanvas);
      themeAudio.pause();
      deathAudio.pause();
    };
  }, [gameBeatCount]);

  return canvasRef;
}
