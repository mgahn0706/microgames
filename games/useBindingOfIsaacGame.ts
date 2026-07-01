"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

type Direction = "down" | "left" | "right" | "up";

type Point = Readonly<{
  x: number;
  y: number;
}>;

type RoomLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type KeyState = {
  down: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
};

type Fly = {
  hitFlashMs: number;
  hp: number;
  id: string;
  isRed: boolean;
  point: Point;
  seed: number;
};

type Tear = {
  direction: Direction;
  distance: number;
  point: Point;
  previousPoint: Point;
};

type HitEffect = {
  ageMs: number;
  point: Point;
};

type GameState = {
  direction: Direction;
  elapsedMs: number;
  fireCooldownMs: number;
  flies: Fly[];
  hasCleared: boolean;
  hitEffects: HitEffect[];
  lastTimestamp: number | null;
  player: Point;
  tears: Tear[];
};

const ASSETS = {
  background: "/games/the-binding-of-isaac/images/background.png",
  fly: "/games/the-binding-of-isaac/images/fly.png",
  playerDown: "/games/the-binding-of-isaac/images/player-down.png",
  playerLeft: "/games/the-binding-of-isaac/images/player-left.png",
  playerRight: "/games/the-binding-of-isaac/images/player-right.png",
  playerUp: "/games/the-binding-of-isaac/images/player-up.png",
  redFly: "/games/the-binding-of-isaac/images/red-fly.png",
  tear: "/games/the-binding-of-isaac/images/tear-projectile.png",
} as const;
const SOUNDS = {
  impact: "/games/the-binding-of-isaac/sounds/tear-impacts.mp3",
  tear: "/games/the-binding-of-isaac/sounds/tear-fire.mp3",
} as const;

type AssetKey = keyof typeof ASSETS;

const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const FIRE_COOLDOWN_MS = 170;
const FLY_DRAW_SIZE = 42;
const FLY_HIT_RADIUS = 38;
const FLY_SPEED_BLACK = 118;
const FLY_SPEED_RED = 146;
const HIT_EFFECT_DURATION_MS = 260;
const MAX_DELTA_MS = 48;
const PLAYER_DRAW_HEIGHT = 118;
const PLAYER_DRAW_WIDTH = 104;
const PLAYER_RADIUS = 40;
const PLAYER_SPEED = 600;
const ROOM_BOUNDS = {
  bottom: 794,
  left: 155,
  right: 1517,
  top: 128,
} as const;
const TEAR_DRAW_SIZE = 34;
const TEAR_HIT_RADIUS = 12;
const TEAR_MAX_DISTANCE = 760;
const TEAR_SPEED = 780;
const PLAYER_IMAGE_BY_DIRECTION = {
  down: "playerDown",
  left: "playerLeft",
  right: "playerRight",
  up: "playerUp",
} as const satisfies Record<Direction, AssetKey>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createInitialKeyState() {
  return {
    down: false,
    left: false,
    right: false,
    up: false,
  } satisfies KeyState;
}

function createInitialState() {
  return {
    direction: "right",
    elapsedMs: 0,
    fireCooldownMs: 0,
    flies: [
      {
        hitFlashMs: 0,
        hp: 1,
        id: "black-left",
        isRed: false,
        point: { x: 575, y: 320 },
        seed: 0.7,
      },
      {
        hitFlashMs: 0,
        hp: 1,
        id: "black-right",
        isRed: false,
        point: { x: 1110, y: 610 },
        seed: 2.1,
      },
      {
        hitFlashMs: 0,
        hp: 2,
        id: "red",
        isRed: true,
        point: { x: 1185, y: 300 },
        seed: 4.5,
      },
    ],
    hasCleared: false,
    hitEffects: [],
    lastTimestamp: null,
    player: { x: 836, y: 520 },
    tears: [],
  } satisfies GameState;
}

function createAudio(src: string) {
  const audio = new Audio(src);

  audio.preload = "auto";
  audio.volume = 0.8;

  return audio;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Browsers may reject SFX before user-initiated audio unlock.
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDistanceToSegment(
  point: Point,
  segmentStart: Point,
  segmentEnd: Point,
) {
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }

  const segmentProgress = clamp(
    ((point.x - segmentStart.x) * segmentX +
      (point.y - segmentStart.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestPoint = {
    x: segmentStart.x + segmentX * segmentProgress,
    y: segmentStart.y + segmentY * segmentProgress,
  };

  return Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y);
}

function getRoomLayout(width: number, height: number) {
  const scale = Math.min(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);
  const drawWidth = BACKGROUND_WIDTH * scale;
  const drawHeight = BACKGROUND_HEIGHT * scale;

  return {
    height: drawHeight,
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies RoomLayout;
}

function getCanvasPoint(point: Point, layout: RoomLayout) {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale,
  } satisfies Point;
}

function getDirectionVector(direction: Direction) {
  if (direction === "left") {
    return { x: -1, y: 0 } satisfies Point;
  }

  if (direction === "right") {
    return { x: 1, y: 0 } satisfies Point;
  }

  if (direction === "up") {
    return { x: 0, y: -1 } satisfies Point;
  }

  return { x: 0, y: 1 } satisfies Point;
}

function getMoveVector(keys: KeyState) {
  const x = Number(keys.right) - Number(keys.left);
  const y = Number(keys.down) - Number(keys.up);
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 } satisfies Point;
  }

  return {
    x: x / length,
    y: y / length,
  } satisfies Point;
}

function getDirectionFromKeys(keys: KeyState, current: Direction) {
  if (keys.left) {
    return "left";
  }

  if (keys.right) {
    return "right";
  }

  if (keys.up) {
    return "up";
  }

  if (keys.down) {
    return "down";
  }

  return current;
}

function fireTear(state: GameState, tearAudio: HTMLAudioElement | null) {
  if (state.fireCooldownMs > 0 || state.hasCleared) {
    return;
  }

  const directionVector = getDirectionVector(state.direction);
  const origin = {
    x: state.player.x,
    y: state.player.y - 12,
  };

  state.tears = [
    ...state.tears,
    {
      direction: state.direction,
      distance: 0,
      point: {
        x: state.player.x + directionVector.x * 48,
        y: state.player.y + directionVector.y * 48 - 12,
      },
      previousPoint: origin,
    },
  ];
  state.fireCooldownMs = FIRE_COOLDOWN_MS;
  playAudio(tearAudio);
}

function movePlayer(state: GameState, keys: KeyState, deltaSeconds: number) {
  const moveVector = getMoveVector(keys);

  state.direction = getDirectionFromKeys(keys, state.direction);
  state.player = {
    x: clamp(
      state.player.x + moveVector.x * PLAYER_SPEED * deltaSeconds,
      ROOM_BOUNDS.left + PLAYER_RADIUS,
      ROOM_BOUNDS.right - PLAYER_RADIUS,
    ),
    y: clamp(
      state.player.y + moveVector.y * PLAYER_SPEED * deltaSeconds,
      ROOM_BOUNDS.top + PLAYER_RADIUS,
      ROOM_BOUNDS.bottom - PLAYER_RADIUS,
    ),
  };
}

function moveTears(state: GameState, deltaSeconds: number) {
  state.tears = state.tears
    .map((tear) => {
      const directionVector = getDirectionVector(tear.direction);
      const distance = tear.distance + TEAR_SPEED * deltaSeconds;

      return {
        ...tear,
        distance,
        previousPoint: tear.point,
        point: {
          x: tear.point.x + directionVector.x * TEAR_SPEED * deltaSeconds,
          y: tear.point.y + directionVector.y * TEAR_SPEED * deltaSeconds,
        },
      };
    })
    .filter(
      (tear) =>
        tear.distance < TEAR_MAX_DISTANCE &&
        tear.point.x > ROOM_BOUNDS.left &&
        tear.point.x < ROOM_BOUNDS.right &&
        tear.point.y > ROOM_BOUNDS.top &&
        tear.point.y < ROOM_BOUNDS.bottom,
    );
}

function moveFlies(state: GameState, deltaSeconds: number) {
  state.flies = state.flies.map((fly) => {
    const playerDistanceX = state.player.x - fly.point.x;
    const playerDistanceY = state.player.y - fly.point.y;
    const distance = Math.max(1, Math.hypot(playerDistanceX, playerDistanceY));
    const speed = fly.isRed ? FLY_SPEED_RED : FLY_SPEED_BLACK;
    const chaseX = playerDistanceX / distance;
    const chaseY = playerDistanceY / distance;
    const curvePhase = state.elapsedMs / (fly.isRed ? 118 : 135) + fly.seed;
    const broadPhase = state.elapsedMs / (fly.isRed ? 310 : 350) + fly.seed * 2;
    const perpendicularX = -chaseY;
    const perpendicularY = chaseX;
    const curveSpeed = fly.isRed ? 108 : 88;
    const driftSpeed = fly.isRed ? 54 : 44;
    const curveWave = Math.sin(curvePhase);
    const driftWave = Math.cos(broadPhase);

    return {
      ...fly,
      hitFlashMs: Math.max(0, fly.hitFlashMs - deltaSeconds * 1000),
      point: {
        x: clamp(
          fly.point.x +
            (chaseX * speed +
              perpendicularX * curveWave * curveSpeed +
              Math.cos(broadPhase) * driftSpeed) *
              deltaSeconds,
          ROOM_BOUNDS.left + FLY_HIT_RADIUS,
          ROOM_BOUNDS.right - FLY_HIT_RADIUS,
        ),
        y: clamp(
          fly.point.y +
            (chaseY * speed +
              perpendicularY * curveWave * curveSpeed +
              driftWave * driftSpeed * 0.75) *
              deltaSeconds,
          ROOM_BOUNDS.top + FLY_HIT_RADIUS,
          ROOM_BOUNDS.bottom - FLY_HIT_RADIUS,
        ),
      },
    };
  });
}

function resolveTearHits(
  state: GameState,
  impactAudio: HTMLAudioElement | null,
) {
  const hitTearIndexes = new Set<number>();
  const nextFlies = state.flies
    .map((fly) => {
      const hitTearIndex = state.tears.findIndex((tear, tearIndex) => {
        if (hitTearIndexes.has(tearIndex)) {
          return false;
        }

        return (
          getDistanceToSegment(fly.point, tear.previousPoint, tear.point) <
          FLY_HIT_RADIUS + TEAR_HIT_RADIUS
        );
      });

      if (hitTearIndex < 0) {
        return fly;
      }

      hitTearIndexes.add(hitTearIndex);
      state.hitEffects = [
        ...state.hitEffects,
        {
          ageMs: 0,
          point: fly.point,
        },
      ];
      playAudio(impactAudio);

      return {
        ...fly,
        hitFlashMs: 120,
        hp: fly.hp - 1,
      };
    })
    .filter((fly) => fly.hp > 0);

  if (hitTearIndexes.size > 0) {
    state.tears = state.tears.filter((_, index) => !hitTearIndexes.has(index));
  }

  state.flies = nextFlies;

  if (!state.hasCleared && state.flies.length === 0) {
    state.hasCleared = true;
    dispatchClear();
  }
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  layout: RoomLayout,
  width: number,
  height: number,
) {
  context.fillStyle = "#050403";
  context.fillRect(0, 0, width, height);

  if (isImageReady(image)) {
    context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
    return;
  }

  context.fillStyle = "#3e1f18";
  context.fillRect(layout.x, layout.y, layout.width, layout.height);
  context.strokeStyle = "#1c0e0b";
  context.lineWidth = 22 * layout.scale;
  context.strokeRect(layout.x, layout.y, layout.width, layout.height);
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  state: GameState,
  layout: RoomLayout,
) {
  const image = images[PLAYER_IMAGE_BY_DIRECTION[state.direction]];
  const point = getCanvasPoint(state.player, layout);
  const bounce = Math.sin(state.elapsedMs / 120) * 3 * layout.scale;
  const width = PLAYER_DRAW_WIDTH * layout.scale;
  const height = PLAYER_DRAW_HEIGHT * layout.scale;

  context.save();
  context.translate(point.x, point.y + bounce);
  context.shadowBlur = 12 * layout.scale;
  context.shadowColor = "rgba(0, 0, 0, 0.55)";

  if (isImageReady(image)) {
    context.drawImage(image, -width / 2, -height * 0.74, width, height);
  } else {
    context.fillStyle = "#f5c6c8";
    context.beginPath();
    context.arc(0, -height * 0.38, width * 0.36, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawFlies(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  flies: readonly Fly[],
  elapsedMs: number,
  layout: RoomLayout,
) {
  flies.forEach((fly) => {
    const image = fly.isRed ? images.redFly : images.fly;
    const point = getCanvasPoint(fly.point, layout);
    const flutter = 1 + Math.sin(elapsedMs / 48 + fly.seed) * 0.14;
    const size = FLY_DRAW_SIZE * layout.scale * (fly.isRed ? 1.16 : 1);

    context.save();
    context.translate(point.x, point.y);
    context.rotate(Math.sin(elapsedMs / 95 + fly.seed) * 0.28);
    context.scale(flutter, 1);
    context.globalAlpha = fly.hitFlashMs > 0 ? 0.62 : 1;
    context.shadowBlur = 10 * layout.scale;
    context.shadowColor = fly.isRed
      ? "rgba(239, 68, 68, 0.72)"
      : "rgba(0, 0, 0, 0.72)";

    if (isImageReady(image)) {
      context.drawImage(image, -size / 2, -size / 2, size, size * 0.82);
    } else {
      context.fillStyle = fly.isRed ? "#dc2626" : "#111827";
      context.beginPath();
      context.arc(0, 0, size / 3, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  });
}

function drawTears(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  tears: readonly Tear[],
  layout: RoomLayout,
) {
  tears.forEach((tear) => {
    const point = getCanvasPoint(tear.point, layout);
    const size = TEAR_DRAW_SIZE * layout.scale;

    context.save();
    context.translate(point.x, point.y);
    context.shadowBlur = 12 * layout.scale;
    context.shadowColor = "rgba(125, 211, 252, 0.9)";

    if (isImageReady(image)) {
      context.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      context.fillStyle = "#93c5fd";
      context.beginPath();
      context.arc(0, 0, size / 2, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  });
}

function drawHitEffects(
  context: CanvasRenderingContext2D,
  effects: readonly HitEffect[],
  layout: RoomLayout,
) {
  effects.forEach((effect) => {
    const progress = effect.ageMs / HIT_EFFECT_DURATION_MS;
    const point = getCanvasPoint(effect.point, layout);
    const radius = (18 + progress * 42) * layout.scale;

    context.save();
    context.globalAlpha = Math.max(0, 1 - progress);
    context.strokeStyle = progress < 0.45 ? "#e0f2fe" : "#7dd3fc";
    context.lineWidth = 5 * layout.scale;
    context.shadowBlur = 18 * layout.scale;
    context.shadowColor = "rgba(125, 211, 252, 0.85)";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  });
}

function drawCounter(
  context: CanvasRenderingContext2D,
  remaining: number,
  layout: RoomLayout,
) {
  const x = layout.x + layout.width - 112 * layout.scale;
  const y = layout.y + 82 * layout.scale;

  context.save();
  context.fillStyle = "rgba(20, 10, 8, 0.78)";
  context.strokeStyle = "#7f1d1d";
  context.lineWidth = 3 * layout.scale;
  context.beginPath();
  context.roundRect(
    x - 76 * layout.scale,
    y - 32 * layout.scale,
    152 * layout.scale,
    64 * layout.scale,
    10 * layout.scale,
  );
  context.fill();
  context.stroke();
  context.fillStyle = "#fecaca";
  context.font = `900 ${28 * layout.scale}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`FLY ${remaining}`, x, y + 1 * layout.scale);
  context.restore();
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const nextWidth = Math.max(1, Math.floor(width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(height * pixelRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { height, width };
}

export function useBindingOfIsaacGameCanvas({
  isActive,
}: Readonly<{ isActive: boolean }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const impactAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(isActive);
  const keysRef = useRef<KeyState>(createInitialKeyState());
  const stateRef = useRef<GameState>(createInitialState());
  const tearAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    imagesRef.current = loadImages();
    impactAudioRef.current = createAudio(SOUNDS.impact);
    tearAudioRef.current = createAudio(SOUNDS.tear);
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== "ArrowLeft" &&
        event.code !== "ArrowRight" &&
        event.code !== "ArrowUp" &&
        event.code !== "ArrowDown" &&
        event.code !== "Space"
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.code === "Space") {
        if (!event.repeat && isActiveRef.current) {
          fireTear(stateRef.current, tearAudioRef.current);
        }
        return;
      }

      if (event.code === "ArrowLeft") {
        keysRef.current.left = true;
      }
      if (event.code === "ArrowRight") {
        keysRef.current.right = true;
      }
      if (event.code === "ArrowUp") {
        keysRef.current.up = true;
      }
      if (event.code === "ArrowDown") {
        keysRef.current.down = true;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        keysRef.current.left = false;
      }
      if (event.code === "ArrowRight") {
        keysRef.current.right = false;
      }
      if (event.code === "ArrowUp") {
        keysRef.current.up = false;
      }
      if (event.code === "ArrowDown") {
        keysRef.current.down = false;
      }
    };
    const render = (timestamp: number) => {
      const { height, width } = resizeCanvas(canvas, context);
      const layout = getRoomLayout(width, height);

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

      if (isActiveRef.current && !state.hasCleared) {
        state.elapsedMs += deltaMs;
        state.fireCooldownMs = Math.max(0, state.fireCooldownMs - deltaMs);
        state.hitEffects = state.hitEffects
          .map((effect) => ({
            ...effect,
            ageMs: effect.ageMs + deltaMs,
          }))
          .filter((effect) => effect.ageMs < HIT_EFFECT_DURATION_MS);
        movePlayer(state, keysRef.current, deltaSeconds);
        moveTears(state, deltaSeconds);
        moveFlies(state, deltaSeconds);
        resolveTearHits(state, impactAudioRef.current);
      }

      context.clearRect(0, 0, width, height);
      drawBackground(
        context,
        imagesRef.current.background,
        layout,
        width,
        height,
      );
      drawTears(context, imagesRef.current.tear, state.tears, layout);
      drawFlies(
        context,
        imagesRef.current,
        state.flies,
        state.elapsedMs,
        layout,
      );
      drawHitEffects(context, state.hitEffects, layout);
      drawPlayer(context, imagesRef.current, state, layout);
      drawCounter(context, state.flies.length, layout);

      frameRef.current = window.requestAnimationFrame(render);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });

      if (frameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  return canvasRef;
}
