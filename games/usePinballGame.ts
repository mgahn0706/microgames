"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const PINBALL_IMAGES = {
  background: "/games/pinball/images/background.png",
  bumpLeft: "/games/pinball/images/bump-activated-left.png",
  bumpRight: "/games/pinball/images/bump-activated-right.png",
  flipperLeft: "/games/pinball/images/hand-left.png",
  flipperRight: "/games/pinball/images/hand-right.png",
} as const;

const BALL_RADIUS = 11;
const BUMPER_FLASH_MS = 150;
const CANVAS_HEIGHT = 540;
const CANVAS_WIDTH = 962;
const DEFAULT_BEAT_DURATION_MS = 500;
const DRAIN_LEFT = 438;
const DRAIN_RIGHT = 524;
const DRAIN_Y = 407;
const FLIPPER_HEIGHT = 42;
const FLIPPER_LENGTH = 118;
const FLIPPER_MIN_COLLISION_LIFT = 0.18;
const GRAVITY = 610;
const MAX_BALL_SPEED = 740;
const MAX_DELTA_MS = 44;
const MAX_PHYSICS_STEP_MS = 7;
const PLAYFIELD_BOTTOM_Y = 422;
const PLAYFIELD_TOP_Y = 54;
const WALL_LEFT = 66;
const WALL_RIGHT = 896;

const LEFT_FLIPPER = {
  activeAngle: -23,
  pivotX: 333,
  pivotY: 374,
  restAngle: 15,
} as const;
const RIGHT_FLIPPER = {
  activeAngle: 203,
  pivotX: 629,
  pivotY: 374,
  restAngle: 165,
} as const;
const ROUND_BUMPERS = [
  { radius: 22, side: "left", x: 307, y: 322 },
  { radius: 22, side: "right", x: 657, y: 322 },
  { radius: 20, side: "center", x: 482, y: 336 },
  { radius: 17, side: "center", x: 482, y: 382 },
] as const;
const RAIL_SEGMENTS = [
  { end: { x: 331, y: 377 }, start: { x: 151, y: 252 } },
  { end: { x: 631, y: 377 }, start: { x: 811, y: 252 } },
  { end: { x: 416, y: 418 }, start: { x: 269, y: 369 } },
  { end: { x: 546, y: 418 }, start: { x: 693, y: 369 } },
] as const;

type BumperSide = (typeof ROUND_BUMPERS)[number]["side"];
type Point = Readonly<{
  x: number;
  y: number;
}>;
type LineSegment = Readonly<{
  end: Point;
  start: Point;
}>;
type Segment = LineSegment &
  Readonly<{
    side: "left" | "right";
  }>;
type GameState = {
  ballVX: number;
  ballVY: number;
  ballX: number;
  ballY: number;
  elapsedMs: number;
  flipperLift: number;
  flipperPressed: boolean;
  hasCleared: boolean;
  hasFailed: boolean;
  lastTimestamp: number | null;
  leftBumperFlashUntil: number;
  rightBumperFlashUntil: number;
};
type PinballImages = Record<keyof typeof PINBALL_IMAGES, HTMLImageElement>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function createInitialState() {
  const startsOnLeft = Math.random() < 0.5;

  return {
    ballVX: startsOnLeft ? 92 : -92,
    ballVY: 138,
    ballX: startsOnLeft ? 432 : 530,
    ballY: 205,
    elapsedMs: 0,
    flipperLift: 0,
    flipperPressed: false,
    hasCleared: false,
    hasFailed: false,
    lastTimestamp: null,
    leftBumperFlashUntil: 0,
    rightBumperFlashUntil: 0,
  } satisfies GameState;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
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

function playSoundEffect(
  track: "pinballBounce" | "pinballFlipper" | "pinballGameOver" | "pinballStart",
) {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
}

function getSpeedScale(beatDurationMs: number) {
  return DEFAULT_BEAT_DURATION_MS / beatDurationMs;
}

function getFlipperSegment(side: "left" | "right", lift: number): Segment {
  const flipper = side === "left" ? LEFT_FLIPPER : RIGHT_FLIPPER;
  const angle =
    flipper.restAngle + (flipper.activeAngle - flipper.restAngle) * lift;
  const radians = degreesToRadians(angle);
  const end = {
    x: flipper.pivotX + Math.cos(radians) * FLIPPER_LENGTH,
    y: flipper.pivotY + Math.sin(radians) * FLIPPER_LENGTH,
  };

  return {
    end,
    side,
    start: {
      x: flipper.pivotX,
      y: flipper.pivotY,
    },
  };
}

function getClosestPointOnSegment(point: Point, segment: LineSegment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT =
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
    lengthSquared;
  const t = clamp(rawT, 0, 1);

  return {
    t,
    x: segment.start.x + dx * t,
    y: segment.start.y + dy * t,
  };
}

function handleFlipperCollision(state: GameState, segment: Segment) {
  if (state.flipperLift < FLIPPER_MIN_COLLISION_LIFT) {
    return;
  }

  const closestPoint = getClosestPointOnSegment(
    { x: state.ballX, y: state.ballY },
    segment,
  );
  const distance = Math.hypot(
    state.ballX - closestPoint.x,
    state.ballY - closestPoint.y,
  );

  if (distance > BALL_RADIUS + 12 || state.ballVY < -80) {
    return;
  }

  const liftBoost = 0.62 + state.flipperLift * 0.72;
  const edgeBoost = closestPoint.t;
  const lateralSpeed = 190 + edgeBoost * 190 + state.flipperLift * 90;

  state.ballY = closestPoint.y - BALL_RADIUS - 8;
  state.ballVX = segment.side === "left" ? lateralSpeed : -lateralSpeed;
  state.ballVY = -340 - 210 * liftBoost;
  playSoundEffect("pinballBounce");
}

function handleCircleCollision(
  state: GameState,
  circle: Readonly<{ radius: number; side: BumperSide; x: number; y: number }>,
) {
  const dx = state.ballX - circle.x;
  const dy = state.ballY - circle.y;
  const distance = Math.hypot(dx, dy);
  const collisionDistance = circle.radius + BALL_RADIUS;

  if (distance <= 0 || distance > collisionDistance) {
    return;
  }

  const normalX = dx / distance;
  const normalY = dy / distance;
  const speed = clamp(Math.hypot(state.ballVX, state.ballVY) + 86, 330, 620);

  state.ballX = circle.x + normalX * collisionDistance;
  state.ballY = circle.y + normalY * collisionDistance;
  state.ballVX = normalX * speed;
  state.ballVY = normalY * speed - 70;

  if (circle.side === "left") {
    state.leftBumperFlashUntil = state.elapsedMs + BUMPER_FLASH_MS;
  } else if (circle.side === "right") {
    state.rightBumperFlashUntil = state.elapsedMs + BUMPER_FLASH_MS;
  }

  playSoundEffect("pinballBounce");
}

function handleRailCollision(state: GameState, segment: LineSegment) {
  const closestPoint = getClosestPointOnSegment(
    { x: state.ballX, y: state.ballY },
    segment,
  );
  const dx = state.ballX - closestPoint.x;
  const dy = state.ballY - closestPoint.y;
  const distance = Math.hypot(dx, dy);
  const collisionDistance = BALL_RADIUS + 5;

  if (distance <= 0 || distance > collisionDistance) {
    return;
  }

  const normalX = dx / distance;
  const normalY = dy / distance;
  const velocityIntoRail = state.ballVX * normalX + state.ballVY * normalY;

  if (velocityIntoRail >= 0) {
    return;
  }

  state.ballX = closestPoint.x + normalX * collisionDistance;
  state.ballY = closestPoint.y + normalY * collisionDistance;
  state.ballVX = (state.ballVX - 1.82 * velocityIntoRail * normalX) * 0.95;
  state.ballVY = (state.ballVY - 1.82 * velocityIntoRail * normalY) * 0.95;
  playSoundEffect("pinballBounce");
}

function bounceOffWalls(state: GameState) {
  if (state.ballX - BALL_RADIUS <= WALL_LEFT) {
    state.ballX = WALL_LEFT + BALL_RADIUS;
    state.ballVX = Math.abs(state.ballVX) * 0.92 + 28;
    playSoundEffect("pinballBounce");
  }

  if (state.ballX + BALL_RADIUS >= WALL_RIGHT) {
    state.ballX = WALL_RIGHT - BALL_RADIUS;
    state.ballVX = -Math.abs(state.ballVX) * 0.92 - 28;
    playSoundEffect("pinballBounce");
  }

  if (state.ballY - BALL_RADIUS <= PLAYFIELD_TOP_Y) {
    state.ballY = PLAYFIELD_TOP_Y + BALL_RADIUS;
    state.ballVY = Math.abs(state.ballVY) * 0.86 + 32;
    playSoundEffect("pinballBounce");
  }

  if (
    state.ballY + BALL_RADIUS >= PLAYFIELD_BOTTOM_Y &&
    (state.ballX < DRAIN_LEFT || state.ballX > DRAIN_RIGHT)
  ) {
    state.ballY = PLAYFIELD_BOTTOM_Y - BALL_RADIUS;
    state.ballVY = -Math.abs(state.ballVY) * 0.5;
    state.ballVX *= 0.86;
  }
}

function checkDrainFailure(state: GameState) {
  const isInDrain =
    state.ballY + BALL_RADIUS >= DRAIN_Y &&
    state.ballX >= DRAIN_LEFT &&
    state.ballX <= DRAIN_RIGHT;

  if (isInDrain || state.ballY - BALL_RADIUS > CANVAS_HEIGHT) {
    state.hasFailed = true;
    playSoundEffect("pinballGameOver");
    dispatchFailure();
  }
}

function stepPhysics(state: GameState, deltaMs: number, speedScale: number) {
  const deltaSeconds = (deltaMs / 1000) * speedScale;
  const targetLift = state.flipperPressed ? 1 : 0;
  const liftStep = deltaSeconds * (state.flipperPressed ? 12 : 8);

  state.elapsedMs += deltaMs;
  state.flipperLift =
    state.flipperLift < targetLift
      ? Math.min(state.flipperLift + liftStep, targetLift)
      : Math.max(state.flipperLift - liftStep, targetLift);
  state.ballVY += GRAVITY * deltaSeconds;
  state.ballX += state.ballVX * deltaSeconds;
  state.ballY += state.ballVY * deltaSeconds;

  ROUND_BUMPERS.forEach((bumper) => {
    handleCircleCollision(state, bumper);
  });
  RAIL_SEGMENTS.forEach((rail) => {
    handleRailCollision(state, rail);
  });
  handleFlipperCollision(state, getFlipperSegment("left", state.flipperLift));
  handleFlipperCollision(state, getFlipperSegment("right", state.flipperLift));
  bounceOffWalls(state);

  const speed = Math.hypot(state.ballVX, state.ballVY);

  if (speed > MAX_BALL_SPEED) {
    const ratio = MAX_BALL_SPEED / speed;

    state.ballVX *= ratio;
    state.ballVY *= ratio;
  }

  checkDrainFailure(state);
}

function stepState(
  state: GameState,
  deltaMs: number,
  beatDurationMs: number,
) {
  const speedScale = getSpeedScale(beatDurationMs);
  const stepCount = Math.max(
    1,
    Math.ceil((deltaMs * speedScale) / MAX_PHYSICS_STEP_MS),
  );
  const stepDeltaMs = deltaMs / stepCount;

  for (let index = 0; index < stepCount; index += 1) {
    stepPhysics(state, stepDeltaMs, speedScale);

    if (state.hasFailed) {
      return;
    }
  }
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement,
) {
  if (background.complete && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  context.fillStyle = "#05070f";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawBumperFlash(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, x, y, 84, 176);
  }
}

function drawFlipper(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  segment: Segment,
) {
  const angle = Math.atan2(
    segment.end.y - segment.start.y,
    segment.end.x - segment.start.x,
  );

  context.save();
  context.translate(segment.start.x, segment.start.y);
  context.rotate(angle);

  if (image.complete && image.naturalWidth > 0) {
    if (segment.side === "right") {
      context.translate(FLIPPER_LENGTH, 0);
      context.scale(-1, 1);
    }

    context.drawImage(
      image,
      0,
      -FLIPPER_HEIGHT / 2,
      FLIPPER_LENGTH,
      FLIPPER_HEIGHT,
    );
  } else {
    context.fillStyle = "#d7d5ce";
    context.fillRect(0, -FLIPPER_HEIGHT / 2, FLIPPER_LENGTH, FLIPPER_HEIGHT);
  }

  context.restore();
}

function drawBall(context: CanvasRenderingContext2D, state: GameState) {
  const highlightX = state.ballX - BALL_RADIUS * 0.35;
  const highlightY = state.ballY - BALL_RADIUS * 0.4;
  const gradient = context.createRadialGradient(
    highlightX,
    highlightY,
    1,
    state.ballX,
    state.ballY,
    BALL_RADIUS,
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#d7dde6");
  gradient.addColorStop(0.72, "#718096");
  gradient.addColorStop(1, "#1d2430");

  context.save();
  context.shadowBlur = 10;
  context.shadowColor = "rgba(174, 230, 255, 0.55)";
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: PinballImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#05070f";
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
  const offsetX = (width - CANVAS_WIDTH * scale) / 2;
  const offsetY = (height - CANVAS_HEIGHT * scale) / 2;

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);

  drawBackground(context, images.background);

  if (state.leftBumperFlashUntil > state.elapsedMs) {
    drawBumperFlash(context, images.bumpLeft, 249, 52);
  }

  if (state.rightBumperFlashUntil > state.elapsedMs) {
    drawBumperFlash(context, images.bumpRight, 629, 52);
  }

  drawFlipper(
    context,
    images.flipperLeft,
    getFlipperSegment("left", state.flipperLift),
  );
  drawFlipper(
    context,
    images.flipperRight,
    getFlipperSegment("right", state.flipperLift),
  );
  drawBall(context, state);

  context.fillStyle = "rgba(225, 241, 255, 0.78)";
  context.fillRect(78, 523, 806 * remainingRatio, 5);

  if (state.hasFailed) {
    context.font = "700 42px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f4f7ff";
    context.strokeStyle = "rgba(16, 18, 32, 0.86)";
    context.lineWidth = 8;
    context.strokeText("DRAIN", CANVAS_WIDTH / 2, 260);
    context.fillText("DRAIN", CANVAS_WIDTH / 2, 260);
  }

  context.restore();
}

export function usePinballGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    let canvasHeight = CANVAS_HEIGHT;
    let canvasWidth = CANVAS_WIDTH;
    const pixelRatio = window.devicePixelRatio || 1;
    const images = {
      background: createImage(PINBALL_IMAGES.background),
      bumpLeft: createImage(PINBALL_IMAGES.bumpLeft),
      bumpRight: createImage(PINBALL_IMAGES.bumpRight),
      flipperLeft: createImage(PINBALL_IMAGES.flipperLeft),
      flipperRight: createImage(PINBALL_IMAGES.flipperRight),
    } satisfies PinballImages;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!stateRef.current.flipperPressed) {
        playSoundEffect("pinballFlipper");
      }

      stateRef.current.flipperPressed = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      stateRef.current.flipperPressed = false;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (!state.hasCleared && !state.hasFailed) {
        stepState(state, deltaMs, beatDurationMs);

        if (!state.hasFailed && state.elapsedMs >= phaseDurationMs) {
          state.hasCleared = true;
          dispatchClear();
        }
      }

      drawScene(
        context,
        images,
        state,
        canvasWidth,
        canvasHeight,
        clamp((phaseDurationMs - state.elapsedMs) / phaseDurationMs, 0, 1),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    playSoundEffect("pinballStart");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [gameBeatCount]);

  return canvasRef;
}
