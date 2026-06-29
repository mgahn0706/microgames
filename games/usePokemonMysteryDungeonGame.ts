"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

type Direction = "down" | "left" | "right" | "up";

type Point = Readonly<{
  x: number;
  y: number;
}>;

type BackgroundLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type KeyState = Readonly<{
  activeDirection: Direction | null;
  down: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
}>;

type GameState = {
  direction: Direction;
  hasCleared: boolean;
  lastTimestamp: number | null;
  player: Point;
  pulseMs: number;
  target: Point;
};

const BACKGROUND_HEIGHT = 1882;
const BACKGROUND_WIDTH = 3344;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAX_DELTA_MS = 48;
const PLAYER_BASE_SPEED = 760;
const RANDOM_ATTEMPT_COUNT = 28;
const ROUTE_MAX_DISTANCE = 2100;
const ROUTE_MIN_DISTANCE = 880;
const TARGET_RADIUS = 86;
const PLAY_BOUNDS = {
  bottom: 1640,
  left: 250,
  right: 3094,
  top: 232,
} as const;
const KEY_TO_DIRECTION = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
} satisfies Record<string, Direction>;
const ASSETS = {
  background: "/games/pokemon-mystery-dungeon/images/background.png",
  playerDown: "/games/pokemon-mystery-dungeon/images/player-down.png",
  playerLeft: "/games/pokemon-mystery-dungeon/images/player-left.png",
  playerRight: "/games/pokemon-mystery-dungeon/images/player-right.png",
  playerUp: "/games/pokemon-mystery-dungeon/images/player-up.png",
  target: "/games/pokemon-mystery-dungeon/images/target-stair-tile.png",
} as const;
const PLAYER_ASSET_BY_DIRECTION = {
  down: "playerDown",
  left: "playerLeft",
  right: "playerRight",
  up: "playerUp",
} as const satisfies Record<Direction, keyof typeof ASSETS>;

type AssetKey = keyof typeof ASSETS;

function getRandomNumber(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createRandomPoint() {
  return {
    x: getRandomNumber(PLAY_BOUNDS.left, PLAY_BOUNDS.right),
    y: getRandomNumber(PLAY_BOUNDS.top, PLAY_BOUNDS.bottom),
  } satisfies Point;
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function createRandomRoute() {
  const player = createRandomPoint();
  const targets = Array.from(
    { length: RANDOM_ATTEMPT_COUNT },
    createRandomPoint,
  );
  const fallbackTarget = {
    x: clamp(
      player.x + (player.x < BACKGROUND_WIDTH / 2 ? 1280 : -1280),
      PLAY_BOUNDS.left,
      PLAY_BOUNDS.right,
    ),
    y: clamp(
      player.y + (player.y < BACKGROUND_HEIGHT / 2 ? 460 : -460),
      PLAY_BOUNDS.top,
      PLAY_BOUNDS.bottom,
    ),
  } satisfies Point;
  const target =
    targets.find((candidate) => {
      const distance = getDistance(player, candidate);

      return distance >= ROUTE_MIN_DISTANCE && distance <= ROUTE_MAX_DISTANCE;
    }) ?? fallbackTarget;

  return { player, target } satisfies Pick<GameState, "player" | "target">;
}

function getInitialDirection(player: Point, target: Point): Direction {
  const xDistance = target.x - player.x;
  const yDistance = target.y - player.y;

  if (Math.abs(xDistance) > Math.abs(yDistance)) {
    return xDistance > 0 ? "right" : "left";
  }

  return yDistance > 0 ? "down" : "up";
}

function createInitialState() {
  const route = createRandomRoute();

  return {
    direction: getInitialDirection(route.player, route.target),
    hasCleared: false,
    lastTimestamp: null,
    player: route.player,
    pulseMs: 0,
    target: route.target,
  } satisfies GameState;
}

function createInitialKeyState() {
  return {
    activeDirection: null,
    down: false,
    left: false,
    right: false,
    up: false,
  } satisfies KeyState;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function getContainLayout(width: number, height: number) {
  const scale = Math.min(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);
  const drawWidth = BACKGROUND_WIDTH * scale;
  const drawHeight = BACKGROUND_HEIGHT * scale;

  return {
    height: drawHeight,
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies BackgroundLayout;
}

function getCanvasPoint(point: Point, layout: BackgroundLayout) {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale,
  } satisfies Point;
}

function drawFallbackBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, "#1d3350");
  gradient.addColorStop(0.5, "#2e817b");
  gradient.addColorStop(1, "#142742");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawTarget(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  layout: BackgroundLayout,
  pulseMs: number,
  target: Point,
) {
  const center = getCanvasPoint(target, layout);
  const pulse = 0.5 + 0.5 * Math.sin(pulseMs / 150);
  const radius = (82 + pulse * 12) * layout.scale;

  context.save();
  context.strokeStyle = `rgba(255, 239, 133, ${0.55 + pulse * 0.3})`;
  context.lineWidth = Math.max(3, 5 * layout.scale);
  context.shadowBlur = 18 * layout.scale;
  context.shadowColor = "rgba(255, 231, 92, 0.8)";
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  if (!isImageReady(image)) {
    context.save();
    context.fillStyle = "#d8d1bb";
    context.fillRect(
      center.x - 60 * layout.scale,
      center.y - 64 * layout.scale,
      120 * layout.scale,
      128 * layout.scale,
    );
    context.restore();
    return;
  }

  context.drawImage(
    image,
    center.x - (image.naturalWidth * layout.scale) / 2,
    center.y - (image.naturalHeight * layout.scale) / 2,
    image.naturalWidth * layout.scale,
    image.naturalHeight * layout.scale,
  );
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  player: Point,
  layout: BackgroundLayout,
) {
  const feet = getCanvasPoint(player, layout);

  if (!isImageReady(image)) {
    context.save();
    context.fillStyle = "#f9dc2f";
    context.beginPath();
    context.arc(
      feet.x,
      feet.y - 72 * layout.scale,
      52 * layout.scale,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    return;
  }

  context.save();
  context.shadowBlur = 10 * layout.scale;
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.drawImage(
    image,
    feet.x - (image.naturalWidth * layout.scale) / 2,
    feet.y - image.naturalHeight * layout.scale,
    image.naturalWidth * layout.scale,
    image.naturalHeight * layout.scale,
  );
  context.restore();
}

function clearCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  state: GameState,
  width: number,
  height: number,
) {
  const layout = getContainLayout(width, height);
  const backgroundImage = images.background;

  clearCanvas(context, width, height);

  if (isImageReady(backgroundImage)) {
    context.drawImage(
      backgroundImage,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  } else {
    drawFallbackBackground(context, width, height);
  }

  drawTarget(context, images.target, layout, state.pulseMs, state.target);
  drawPlayer(
    context,
    images[PLAYER_ASSET_BY_DIRECTION[state.direction]],
    state.player,
    layout,
  );
}

function getPressedFallbackDirection(keys: KeyState) {
  if (keys.up) {
    return "up";
  }

  if (keys.down) {
    return "down";
  }

  if (keys.left) {
    return "left";
  }

  if (keys.right) {
    return "right";
  }

  return null;
}

function getMoveDirection(keys: KeyState) {
  if (keys.activeDirection && keys[keys.activeDirection]) {
    return keys.activeDirection;
  }

  return getPressedFallbackDirection(keys);
}

function getMoveVector(direction: Direction | null) {
  if (direction === "up") {
    return { x: 0, y: -1 } satisfies Point;
  }

  if (direction === "down") {
    return { x: 0, y: 1 } satisfies Point;
  }

  if (direction === "left") {
    return { x: -1, y: 0 } satisfies Point;
  }

  if (direction === "right") {
    return { x: 1, y: 0 } satisfies Point;
  }

  return { x: 0, y: 0 } satisfies Point;
}

function stepState(
  state: GameState,
  keys: KeyState,
  deltaMs: number,
  beatDurationMs: number,
) {
  const moveDirection = getMoveDirection(keys);
  const vector = getMoveVector(moveDirection);
  const speedScale = DEFAULT_BEAT_DURATION_MS / beatDurationMs;
  const distance = PLAYER_BASE_SPEED * speedScale * (deltaMs / 1000);
  const nextPlayer = {
    x: clamp(
      state.player.x + vector.x * distance,
      PLAY_BOUNDS.left,
      PLAY_BOUNDS.right,
    ),
    y: clamp(
      state.player.y + vector.y * distance,
      PLAY_BOUNDS.top,
      PLAY_BOUNDS.bottom,
    ),
  } satisfies Point;

  state.direction = moveDirection ?? state.direction;
  state.player = nextPlayer;
  state.pulseMs += deltaMs;

  if (
    !state.hasCleared &&
    getDistance(nextPlayer, state.target) <= TARGET_RADIUS
  ) {
    state.hasCleared = true;
    dispatchClear();
  }
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.floor(bounds.width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(bounds.height * pixelRatio));

  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
}

function isDirectionKey(key: string): key is keyof typeof KEY_TO_DIRECTION {
  return key in KEY_TO_DIRECTION;
}

export function usePokemonMysteryDungeonGameCanvas({
  beatDurationMs,
  isActive,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
}>) {
  const beatDurationMsRef = useRef(beatDurationMs);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const keysRef = useRef<KeyState>(createInitialKeyState());
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    beatDurationMsRef.current = beatDurationMs;
  }, [beatDurationMs]);

  useEffect(() => {
    if (!isActive) {
      keysRef.current = createInitialKeyState();
    }
  }, [isActive]);

  useEffect(() => {
    imagesRef.current = loadImages();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDirectionKey(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!isActive || stateRef.current.hasCleared) {
        return;
      }

      const direction = KEY_TO_DIRECTION[event.key];

      keysRef.current = {
        ...keysRef.current,
        [direction]: true,
        activeDirection: direction,
      };
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isDirectionKey(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const direction = KEY_TO_DIRECTION[event.key];
      const nextKeys = {
        ...keysRef.current,
        [direction]: false,
      } satisfies KeyState;

      keysRef.current = {
        ...nextKeys,
        activeDirection:
          nextKeys.activeDirection === direction
            ? getPressedFallbackDirection(nextKeys)
            : nextKeys.activeDirection,
      };
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const render = (timestamp: number) => {
      resizeCanvas(canvas);

      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (isActive && !state.hasCleared) {
        stepState(state, keysRef.current, deltaMs, beatDurationMsRef.current);
      } else {
        state.pulseMs += deltaMs;
      }

      drawScene(context, imagesRef.current, state, canvas.width, canvas.height);

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isActive]);

  return canvasRef;
}
