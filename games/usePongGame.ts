"use client";

import { useEffect, useRef } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const BALL_SIZE = 12;
const COURT_HEIGHT = 360;
const COURT_WIDTH = 640;
const DEFAULT_BEAT_DURATION_MS = 500;
const DEGREE_TO_RADIAN = Math.PI / 180;
const INITIAL_BALL_SPEED = Math.hypot(252, 84);
const MAX_INITIAL_ANGLE_DEGREE = 28;
const MIN_INITIAL_ANGLE_DEGREE = 12;
const MAX_DELTA_MS = 48;
const MAX_PHYSICS_STEP_MS = 8;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const OPPONENT_X = 28;
const PADDLE_HEIGHT = 78;
const PADDLE_SPEED = 292;
const PADDLE_WIDTH = 12;
const PLAYER_X = 604;

type GameState = {
  ballVX: number;
  ballVY: number;
  ballX: number;
  ballY: number;
  elapsedMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  lastTimestamp: number | null;
  opponentY: number;
  playerY: number;
};

type KeyState = {
  down: boolean;
  up: boolean;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getRandomInitialBallVelocity() {
  const angleDegree =
    MIN_INITIAL_ANGLE_DEGREE +
    Math.random() * (MAX_INITIAL_ANGLE_DEGREE - MIN_INITIAL_ANGLE_DEGREE);
  const direction = Math.random() < 0.5 ? -1 : 1;
  const angleRadian = angleDegree * direction * DEGREE_TO_RADIAN;

  return {
    ballVX: Math.cos(angleRadian) * INITIAL_BALL_SPEED,
    ballVY: Math.sin(angleRadian) * INITIAL_BALL_SPEED,
  };
}

function createInitialState() {
  const initialBallVelocity = getRandomInitialBallVelocity();

  return {
    ballVX: initialBallVelocity.ballVX,
    ballVY: initialBallVelocity.ballVY,
    ballX: 198,
    ballY: 112,
    elapsedMs: 0,
    hasCleared: false,
    hasFailed: false,
    lastTimestamp: null,
    opponentY: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    playerY: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  } satisfies GameState;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function getBeatSpeedScale(beatDurationMs: number) {
  return DEFAULT_BEAT_DURATION_MS / beatDurationMs;
}

function playHitSound() {
  bgmLibrary.playSoundEffect("pongHit").catch((error: unknown) => {
    console.error(error);
  });
}

function isBallOverPaddle(ballY: number, paddleY: number) {
  return ballY + BALL_SIZE >= paddleY && ballY <= paddleY + PADDLE_HEIGHT;
}

function movePaddles(
  state: GameState,
  keyState: KeyState,
  deltaSeconds: number,
  speedScale: number,
) {
  const playerDirection = Number(keyState.down) - Number(keyState.up);
  const targetOpponentY = state.ballY - PADDLE_HEIGHT / 2;
  const paddleSpeed = PADDLE_SPEED * speedScale;
  const opponentStep = paddleSpeed * 0.84 * deltaSeconds;
  const opponentDelta = clamp(
    targetOpponentY - state.opponentY,
    -opponentStep,
    opponentStep,
  );

  state.playerY = clamp(
    state.playerY + playerDirection * paddleSpeed * deltaSeconds,
    0,
    COURT_HEIGHT - PADDLE_HEIGHT,
  );
  state.opponentY = clamp(
    state.opponentY + opponentDelta,
    0,
    COURT_HEIGHT - PADDLE_HEIGHT,
  );
}

function bounceFromPaddle(
  state: GameState,
  paddleY: number,
  direction: "left" | "right",
) {
  const paddleCenterY = paddleY + PADDLE_HEIGHT / 2;
  const normalizedImpact = clamp(
    (state.ballY + BALL_SIZE / 2 - paddleCenterY) / (PADDLE_HEIGHT / 2),
    -1,
    1,
  );
  const speedX = Math.min(Math.abs(state.ballVX) + 22, 344);

  state.ballVX = direction === "right" ? speedX : -speedX;
  state.ballVY = normalizedImpact * 210;
  playHitSound();
}

function stepPhysics(
  state: GameState,
  keyState: KeyState,
  deltaMs: number,
  speedScale: number,
) {
  const deltaSeconds = deltaMs / 1000;

  movePaddles(state, keyState, deltaSeconds, speedScale);

  state.ballX += state.ballVX * speedScale * deltaSeconds;
  state.ballY += state.ballVY * speedScale * deltaSeconds;

  if (state.ballY <= 0) {
    state.ballY = 0;
    state.ballVY = Math.abs(state.ballVY);
    playHitSound();
  }

  if (state.ballY + BALL_SIZE >= COURT_HEIGHT) {
    state.ballY = COURT_HEIGHT - BALL_SIZE;
    state.ballVY = -Math.abs(state.ballVY);
    playHitSound();
  }

  if (
    state.ballVX > 0 &&
    state.ballX + BALL_SIZE >= PLAYER_X &&
    state.ballX <= PLAYER_X + PADDLE_WIDTH &&
    isBallOverPaddle(state.ballY, state.playerY)
  ) {
    state.ballX = PLAYER_X - BALL_SIZE;
    bounceFromPaddle(state, state.playerY, "left");
  }

  if (
    state.ballVX < 0 &&
    state.ballX <= OPPONENT_X + PADDLE_WIDTH &&
    state.ballX + BALL_SIZE >= OPPONENT_X &&
    isBallOverPaddle(state.ballY, state.opponentY)
  ) {
    state.ballX = OPPONENT_X + PADDLE_WIDTH;
    bounceFromPaddle(state, state.opponentY, "right");
  }

  if (state.ballX + BALL_SIZE < 0) {
    state.ballX = OPPONENT_X + PADDLE_WIDTH;
    bounceFromPaddle(state, state.opponentY, "right");
  }

  if (state.ballX > COURT_WIDTH) {
    state.hasFailed = true;
    dispatchFailure();
  }
}

function stepState(
  state: GameState,
  keyState: KeyState,
  deltaMs: number,
  beatDurationMs: number,
) {
  const speedScale = getBeatSpeedScale(beatDurationMs);
  const stepCount = Math.max(
    1,
    Math.ceil((deltaMs * speedScale) / MAX_PHYSICS_STEP_MS),
  );
  const stepDeltaMs = deltaMs / stepCount;

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    stepPhysics(state, keyState, stepDeltaMs, speedScale);

    if (state.hasFailed) {
      return;
    }
  }
}

function drawCourt(context: CanvasRenderingContext2D) {
  context.fillStyle = "#000";
  context.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);

  context.fillStyle = "#f8fafc";
  Array.from({ length: 12 }).forEach((_, index) => {
    context.fillRect(COURT_WIDTH / 2 - 3, index * 34 + 8, 6, 18);
  });

  context.font = "64px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("0", COURT_WIDTH / 2 - 78, 62);
  context.fillText("0", COURT_WIDTH / 2 + 78, 62);
}

function drawPlayerIndicator(
  context: CanvasRenderingContext2D,
  playerY: number,
) {
  const indicatorY = clamp(playerY + PADDLE_HEIGHT / 2, 36, COURT_HEIGHT - 36);

  context.save();
  context.fillStyle = "rgba(248, 250, 252, 0.9)";
  context.font = "700 16px monospace";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillText("YOU", PLAYER_X - 26, indicatorY);

  context.beginPath();
  context.moveTo(PLAYER_X - 7, indicatorY);
  context.lineTo(PLAYER_X - 15, indicatorY - 6);
  context.lineTo(PLAYER_X - 15, indicatorY + 6);
  context.closePath();
  context.fill();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  remainingMs: number,
  phaseDurationMs: number,
) {
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / COURT_WIDTH, height / COURT_HEIGHT);
  const offsetX = (width - COURT_WIDTH * scale) / 2;
  const offsetY = (height - COURT_HEIGHT * scale) / 2;

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);

  drawCourt(context);
  drawPlayerIndicator(context, state.playerY);

  context.fillStyle = "#f8fafc";
  context.fillRect(PLAYER_X, state.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  context.fillRect(OPPONENT_X, state.opponentY, PADDLE_WIDTH, PADDLE_HEIGHT);
  context.fillRect(state.ballX, state.ballY, BALL_SIZE, BALL_SIZE);

  context.fillStyle = "rgba(248, 250, 252, 0.7)";
  context.fillRect(
    0,
    COURT_HEIGHT - 5,
    COURT_WIDTH * clamp(remainingMs / phaseDurationMs, 0, 1),
    5,
  );

  if (state.hasFailed) {
    context.font = "48px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("MISS", COURT_WIDTH / 2, COURT_HEIGHT / 2);
  }

  context.restore();
}

export function usePongGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keyStateRef = useRef<KeyState>({ down: false, up: false });
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === "ArrowDown") {
        keyStateRef.current.down = true;
        return;
      }

      keyStateRef.current.up = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === "ArrowDown") {
        keyStateRef.current.down = false;
        return;
      }

      keyStateRef.current.up = false;
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
        state.elapsedMs += deltaMs;
        stepState(state, keyStateRef.current, deltaMs, beatDurationMs);

        if (!state.hasFailed && state.elapsedMs >= phaseDurationMs) {
          state.hasCleared = true;
          dispatchClear();
        }
      }

      drawScene(
        context,
        state,
        canvasWidth,
        canvasHeight,
        Math.max(phaseDurationMs - state.elapsedMs, 0),
        phaseDurationMs,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    keyStateRef.current = { down: false, up: false };
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
