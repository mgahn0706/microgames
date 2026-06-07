"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const BOARD_IMAGE_SRC = "/games/flicking-game/images/board.png";
const ENEMY_STONE_IMAGE_SRC = "/games/flicking-game/images/enemy-stone.png";
const FLICK_SOUND_SRC = "/games/flicking-game/sounds/stone_flicking.mp3";
const MY_STONE_IMAGE_SRC = "/games/flicking-game/images/my-stone.png";
const MAX_CANVAS_PIXEL_RATIO = 1.5;
const MAX_DELTA_MS = 34;
const MAX_DRAG_DISTANCE = 190;
const MAX_FLICK_SPEED = 1280;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const STOP_SPEED = 16;
const STONE_DECELERATION = 780;
const STONE_RESTITUTION = 0.94;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type BoardLayout = Readonly<{
  height: number;
  stoneRadius: number;
  width: number;
  x: number;
  y: number;
}>;

type Stone = {
  angle: number;
  angularVelocity: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type GameState = {
  board: BoardLayout;
  dragPoint: Point | null;
  enemyStone: Stone;
  hasCleared: boolean;
  isDragging: boolean;
  lastTimestamp: number | null;
  myStone: Stone;
  physicsActive: boolean;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;
  return image;
}

function createSound(src: string) {
  const audio = new Audio(src);

  audio.preload = "auto";
  audio.volume = 0.86;
  return audio;
}

function isImageReady(
  image: HTMLImageElement | null,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function getBoardLayout(width: number, height: number) {
  const boardSize = Math.min(width * 0.72, height * 0.74, 560);

  return {
    height: boardSize,
    stoneRadius: boardSize * 0.088,
    width: boardSize,
    x: width * 0.5 - boardSize / 2,
    y: height * 0.5 - boardSize / 2,
  } satisfies BoardLayout;
}

function createStone(x: number, y: number) {
  return {
    angle: 0,
    angularVelocity: 0,
    velocityX: 0,
    velocityY: 0,
    x,
    y,
  } satisfies Stone;
}

function createInitialState(width: number, height: number) {
  const board = getBoardLayout(width, height);
  const myStone = createStone(
    board.x + board.width * 0.28,
    board.y + board.height * 0.5,
  );
  const enemyStone = createStone(
    board.x + board.width * 0.72,
    board.y + board.height * 0.5,
  );

  return {
    board,
    dragPoint: null,
    enemyStone,
    hasCleared: false,
    isDragging: false,
    lastTimestamp: null,
    myStone,
    physicsActive: false,
  } satisfies GameState;
}

function resetState(state: GameState, width: number, height: number) {
  const nextState = createInitialState(width, height);

  state.board = nextState.board;
  state.dragPoint = null;
  state.enemyStone = nextState.enemyStone;
  state.hasCleared = false;
  state.isDragging = false;
  state.lastTimestamp = null;
  state.myStone = nextState.myStone;
  state.physicsActive = false;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  } satisfies Point;
}

function getDistance(firstPoint: Point, secondPoint: Point) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function getStonePoint(stone: Stone) {
  return {
    x: stone.x,
    y: stone.y,
  } satisfies Point;
}

function getStoneSpeed(stone: Stone) {
  return Math.hypot(stone.velocityX, stone.velocityY);
}

function isStoneSlow(stone: Stone) {
  return getStoneSpeed(stone) < STOP_SPEED;
}

function isPhysicsSettled(state: GameState) {
  return isStoneSlow(state.myStone) && isStoneSlow(state.enemyStone);
}

function isEnemyStoneOut(state: GameState) {
  const { board, enemyStone } = state;
  const radius = board.stoneRadius;

  return (
    enemyStone.x < board.x - radius ||
    enemyStone.x > board.x + board.width + radius ||
    enemyStone.y < board.y - radius ||
    enemyStone.y > board.y + board.height + radius
  );
}

function playFlickSound(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

function drawBoard(
  context: CanvasRenderingContext2D,
  state: GameState,
  boardImage: HTMLImageElement | null,
) {
  const { board } = state;

  context.save();
  context.shadowBlur = 12;
  context.shadowColor = "rgba(0, 0, 0, 0.36)";

  if (isImageReady(boardImage)) {
    context.drawImage(boardImage, board.x, board.y, board.width, board.height);
  } else {
    context.fillStyle = "#d8a14d";
    context.fillRect(board.x, board.y, board.width, board.height);
  }

  context.restore();
}

function drawStone(
  context: CanvasRenderingContext2D,
  stone: Stone,
  radius: number,
  image: HTMLImageElement | null,
  label: string,
  accentColor: string,
) {
  const size = radius * 2.32;
  const x = stone.x - size / 2;
  const y = stone.y - size / 2;

  context.save();
  context.translate(stone.x, stone.y);
  context.rotate(stone.angle);
  context.translate(-stone.x, -stone.y);
  context.shadowBlur = 8;
  context.shadowColor = "rgba(0, 0, 0, 0.34)";

  context.strokeStyle = accentColor;
  context.lineWidth = Math.max(3, radius * 0.08);
  context.beginPath();
  context.arc(stone.x, stone.y, radius * 1.26, 0, Math.PI * 2);
  context.stroke();

  if (isImageReady(image)) {
    context.drawImage(image, x, y, size, size);
  } else {
    context.beginPath();
    context.fillStyle = "#f8fafc";
    context.arc(stone.x, stone.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  context.save();
  context.font = `800 ${Math.max(14, Math.floor(radius * 0.44))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 5;
  context.strokeStyle = "rgba(0, 0, 0, 0.72)";
  context.fillStyle = "#ffffff";
  context.strokeText(label, stone.x, stone.y - radius * 1.72);
  context.fillText(label, stone.x, stone.y - radius * 1.72);
  context.restore();
}

function getDragVector(state: GameState) {
  if (!state.dragPoint) {
    return null;
  }

  const stonePoint = getStonePoint(state.myStone);
  const rawVector = {
    x: stonePoint.x - state.dragPoint.x,
    y: stonePoint.y - state.dragPoint.y,
  };
  const distance = Math.min(
    Math.hypot(rawVector.x, rawVector.y),
    MAX_DRAG_DISTANCE,
  );

  if (distance <= 0) {
    return null;
  }

  const scale = distance / Math.hypot(rawVector.x, rawVector.y);

  return {
    power: distance / MAX_DRAG_DISTANCE,
    x: rawVector.x * scale,
    y: rawVector.y * scale,
  };
}

function drawArrow(context: CanvasRenderingContext2D, state: GameState) {
  const vector = getDragVector(state);

  if (!vector) {
    return;
  }

  const start = getStonePoint(state.myStone);
  const end = {
    x: start.x + vector.x * 0.9,
    y: start.y + vector.y * 0.9,
  };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headSize = 18 + vector.power * 18;

  context.save();
  context.lineCap = "round";
  context.lineWidth = 8 + vector.power * 7;
  context.strokeStyle = `rgba(255, 245, 158, ${0.62 + vector.power * 0.32})`;
  context.shadowBlur = 10;
  context.shadowColor = "rgba(250, 204, 21, 0.82)";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.fillStyle = "#fff7ad";
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - Math.cos(angle - Math.PI / 6) * headSize,
    end.y - Math.sin(angle - Math.PI / 6) * headSize,
  );
  context.lineTo(
    end.x - Math.cos(angle + Math.PI / 6) * headSize,
    end.y - Math.sin(angle + Math.PI / 6) * headSize,
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawGauge(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  const vector = getDragVector(state);
  const power = vector?.power ?? 0;
  const gaugeWidth = Math.min(width * 0.44, 380);
  const gaugeHeight = 16;
  const gaugeX = width * 0.5 - gaugeWidth / 2;
  const gaugeY = height * 0.12;

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.strokeStyle = "rgba(255, 255, 255, 0.48)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, 8);
  context.fill();
  context.stroke();

  context.fillStyle =
    power > 0.72 ? "#f97316" : power > 0.42 ? "#facc15" : "#60a5fa";
  context.beginPath();
  context.roundRect(gaugeX, gaugeY, gaugeWidth * power, gaugeHeight, 8);
  context.fill();
  context.restore();
}

function stopStone(stone: Stone) {
  stone.angularVelocity = 0;
  stone.velocityX = 0;
  stone.velocityY = 0;
}

function applyDeceleration(stone: Stone, deltaSeconds: number) {
  const speed = getStoneSpeed(stone);

  if (speed <= 0) {
    stopStone(stone);
    return;
  }

  const nextSpeed = Math.max(speed - STONE_DECELERATION * deltaSeconds, 0);
  const scale = nextSpeed / speed;

  stone.velocityX *= scale;
  stone.velocityY *= scale;

  if (nextSpeed <= 0) {
    stopStone(stone);
  }
}

function moveStone(stone: Stone, radius: number, deltaSeconds: number) {
  stone.x += stone.velocityX * deltaSeconds;
  stone.y += stone.velocityY * deltaSeconds;
  stone.angularVelocity = stone.velocityX / Math.max(radius, 1);
  stone.angle += stone.angularVelocity * deltaSeconds;
}

function resolveStoneCollision(
  firstStone: Stone,
  secondStone: Stone,
  radius: number,
) {
  const deltaX = secondStone.x - firstStone.x;
  const deltaY = secondStone.y - firstStone.y;
  const distance = Math.hypot(deltaX, deltaY);
  const minimumDistance = radius * 2;

  if (distance <= 0 || distance >= minimumDistance) {
    return;
  }

  const normalX = deltaX / distance;
  const normalY = deltaY / distance;
  const overlap = minimumDistance - distance;

  firstStone.x -= (normalX * overlap) / 2;
  firstStone.y -= (normalY * overlap) / 2;
  secondStone.x += (normalX * overlap) / 2;
  secondStone.y += (normalY * overlap) / 2;

  const relativeVelocityX = firstStone.velocityX - secondStone.velocityX;
  const relativeVelocityY = firstStone.velocityY - secondStone.velocityY;
  const closingSpeed =
    relativeVelocityX * normalX + relativeVelocityY * normalY;

  if (closingSpeed <= 0) {
    return;
  }

  const impulse = ((1 + STONE_RESTITUTION) * closingSpeed) / 2;
  const impulseX = impulse * normalX;
  const impulseY = impulse * normalY;

  firstStone.velocityX -= impulseX;
  firstStone.velocityY -= impulseY;
  secondStone.velocityX += impulseX;
  secondStone.velocityY += impulseY;
}

function updatePhysics(state: GameState, deltaMs: number) {
  const deltaSeconds = deltaMs / 1000;
  const { enemyStone, myStone } = state;

  moveStone(myStone, state.board.stoneRadius, deltaSeconds);
  moveStone(enemyStone, state.board.stoneRadius, deltaSeconds);
  resolveStoneCollision(myStone, enemyStone, state.board.stoneRadius);
  applyDeceleration(myStone, deltaSeconds);
  applyDeceleration(enemyStone, deltaSeconds);
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Readonly<{
    board: HTMLImageElement | null;
    enemyStone: HTMLImageElement | null;
    myStone: HTMLImageElement | null;
  }>,
  width: number,
  height: number,
) {
  context.fillStyle = "#1b140b";
  context.fillRect(0, 0, width, height);

  drawBoard(context, state, images.board);
  drawArrow(context, state);
  drawStone(
    context,
    state.enemyStone,
    state.board.stoneRadius,
    images.enemyStone,
    "상대",
    "#ef4444",
  );
  drawStone(
    context,
    state.myStone,
    state.board.stoneRadius,
    images.myStone,
    "내 돌",
    "#38bdf8",
  );
  drawGauge(context, state, width, height);
}

export function useFlickingGameCanvas() {
  const boardImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const enemyStoneImageRef = useRef<HTMLImageElement | null>(null);
  const flickSoundRef = useRef<HTMLAudioElement | null>(null);
  const myStoneImageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<GameState>(
    createInitialState(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT),
  );

  useEffect(() => {
    boardImageRef.current = createImage(BOARD_IMAGE_SRC);
    enemyStoneImageRef.current = createImage(ENEMY_STONE_IMAGE_SRC);
    flickSoundRef.current = createSound(FLICK_SOUND_SRC);
    myStoneImageRef.current = createImage(MY_STONE_IMAGE_SRC);
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

    let animationFrame = 0;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_CANVAS_PIXEL_RATIO,
    );

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      resetState(stateRef.current, canvasWidth, canvasHeight);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;
      const pointerPoint = getPointerPoint(canvas, event);
      const myStonePoint = getStonePoint(state.myStone);

      if (
        state.hasCleared ||
        !isStoneSlow(state.myStone) ||
        getDistance(pointerPoint, myStonePoint) > state.board.stoneRadius * 1.5
      ) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.isDragging = true;
      state.dragPoint = pointerPoint;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.isDragging) {
        return;
      }

      event.preventDefault();
      state.dragPoint = getPointerPoint(canvas, event);
    };

    const stopDragging = () => {
      const state = stateRef.current;
      const vector = getDragVector(state);

      if (!state.isDragging || !vector) {
        state.isDragging = false;
        state.dragPoint = null;
        return;
      }

      state.myStone.velocityX =
        (vector.x / MAX_DRAG_DISTANCE) * MAX_FLICK_SPEED;
      state.myStone.velocityY =
        (vector.y / MAX_DRAG_DISTANCE) * MAX_FLICK_SPEED;
      playFlickSound(flickSoundRef.current ?? createSound(FLICK_SOUND_SRC));
      state.isDragging = false;
      state.dragPoint = null;
      state.physicsActive = true;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (state.physicsActive && !state.isDragging && !state.hasCleared) {
        updatePhysics(state, deltaMs);

        if (isPhysicsSettled(state)) {
          state.physicsActive = false;
          stopStone(state.myStone);
          stopStone(state.enemyStone);
        }
      }

      if (!state.hasCleared && isEnemyStoneOut(state)) {
        state.hasCleared = true;
        dispatchClear();
      }

      drawScene(
        context,
        state,
        {
          board: boardImageRef.current,
          enemyStone: enemyStoneImageRef.current,
          myStone: myStoneImageRef.current,
        },
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", stopDragging);
      canvas.removeEventListener("pointercancel", stopDragging);
    };
  }, []);

  return canvasRef;
}
