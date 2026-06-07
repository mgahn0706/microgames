"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const { Bodies, Body, Composite, Engine, Vector } = Matter;

const BOARD_IMAGE_SRC = "/games/flicking-game/images/board.png";
const ENEMY_STONE_IMAGE_SRC = "/games/flicking-game/images/enemy-stone.png";
const FLICK_SOUND_SRC = "/games/flicking-game/sounds/stone_flicking.mp3";
const MY_STONE_IMAGE_SRC = "/games/flicking-game/images/my-stone.png";
const MAX_DELTA_MS = 34;
const MAX_DRAG_DISTANCE = 190;
const MAX_FLICK_SPEED = 21;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const STONE_DENSITY = 0.0032;
const STONE_FRICTION_AIR = 0.018;
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

type GameState = {
  board: BoardLayout;
  dragPoint: Point | null;
  engine: Matter.Engine;
  enemyStone: Matter.Body;
  hasCleared: boolean;
  isDragging: boolean;
  lastTimestamp: number | null;
  myStone: Matter.Body;
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

function createStone(x: number, y: number, radius: number) {
  const stone = Bodies.circle(x, y, radius, {
    density: STONE_DENSITY,
    frictionAir: STONE_FRICTION_AIR,
    frictionStatic: 0,
    inertia: Infinity,
    restitution: STONE_RESTITUTION,
  });

  Body.setMass(stone, 1);
  return stone;
}

function createInitialState(width: number, height: number) {
  const board = getBoardLayout(width, height);
  const engine = Engine.create();

  engine.gravity.y = 0;

  const myStone = createStone(
    board.x + board.width * 0.28,
    board.y + board.height * 0.5,
    board.stoneRadius,
  );
  const enemyStone = createStone(
    board.x + board.width * 0.72,
    board.y + board.height * 0.5,
    board.stoneRadius,
  );

  Composite.add(engine.world, [myStone, enemyStone]);

  return {
    board,
    dragPoint: null,
    engine,
    enemyStone,
    hasCleared: false,
    isDragging: false,
    lastTimestamp: null,
    myStone,
  } satisfies GameState;
}

function resetState(state: GameState, width: number, height: number) {
  const nextState = createInitialState(width, height);

  state.board = nextState.board;
  state.dragPoint = null;
  state.engine = nextState.engine;
  state.enemyStone = nextState.enemyStone;
  state.hasCleared = false;
  state.isDragging = false;
  state.lastTimestamp = null;
  state.myStone = nextState.myStone;
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

function getStonePoint(stone: Matter.Body) {
  return {
    x: stone.position.x,
    y: stone.position.y,
  } satisfies Point;
}

function isStoneSlow(stone: Matter.Body) {
  return Vector.magnitude(stone.velocity) < 0.28;
}

function isEnemyStoneOut(state: GameState) {
  const { board, enemyStone } = state;
  const radius = board.stoneRadius;

  return (
    enemyStone.position.x < board.x - radius ||
    enemyStone.position.x > board.x + board.width + radius ||
    enemyStone.position.y < board.y - radius ||
    enemyStone.position.y > board.y + board.height + radius
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
  context.shadowBlur = 24;
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
  stone: Matter.Body,
  radius: number,
  image: HTMLImageElement | null,
) {
  const size = radius * 2.32;
  const x = stone.position.x - size / 2;
  const y = stone.position.y - size / 2;

  context.save();
  context.translate(stone.position.x, stone.position.y);
  context.rotate(stone.angle);
  context.translate(-stone.position.x, -stone.position.y);
  context.shadowBlur = 18;
  context.shadowColor = "rgba(0, 0, 0, 0.34)";

  if (isImageReady(image)) {
    context.drawImage(image, x, y, size, size);
  } else {
    context.beginPath();
    context.fillStyle = "#f8fafc";
    context.arc(stone.position.x, stone.position.y, radius, 0, Math.PI * 2);
    context.fill();
  }

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
  context.shadowBlur = 18;
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

  const gradient = context.createLinearGradient(
    gaugeX,
    gaugeY,
    gaugeX + gaugeWidth,
    gaugeY,
  );

  gradient.addColorStop(0, "#60a5fa");
  gradient.addColorStop(0.62, "#facc15");
  gradient.addColorStop(1, "#f97316");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(gaugeX, gaugeY, gaugeWidth * power, gaugeHeight, 8);
  context.fill();
  context.restore();
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
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.5,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72,
  );

  gradient.addColorStop(0, "#3b2a15");
  gradient.addColorStop(1, "#120c06");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  drawBoard(context, state, images.board);
  drawArrow(context, state);
  drawStone(
    context,
    state.enemyStone,
    state.board.stoneRadius,
    images.enemyStone,
  );
  drawStone(context, state.myStone, state.board.stoneRadius, images.myStone);
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
    const pixelRatio = window.devicePixelRatio || 1;

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

      Body.setVelocity(state.myStone, {
        x: (vector.x / MAX_DRAG_DISTANCE) * MAX_FLICK_SPEED,
        y: (vector.y / MAX_DRAG_DISTANCE) * MAX_FLICK_SPEED,
      });
      playFlickSound(flickSoundRef.current ?? createSound(FLICK_SOUND_SRC));
      state.isDragging = false;
      state.dragPoint = null;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (!state.isDragging && !state.hasCleared) {
        Engine.update(state.engine, deltaMs);
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
