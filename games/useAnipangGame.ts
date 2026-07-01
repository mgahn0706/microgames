"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const ANIPANG_IMAGES = {
  background: "/games/anipang/images/background.png",
  cat: "/games/anipang/images/cat.png",
  dog: "/games/anipang/images/dog.png",
  monkey: "/games/anipang/images/monkey.png",
  mouse: "/games/anipang/images/mouse.png",
  pig: "/games/anipang/images/pig.png",
  rabbit: "/games/anipang/images/rabbit.png",
} as const;

const ANIMALS = ["cat", "dog", "monkey", "mouse", "pig", "rabbit"] as const;
const BOARD_COLUMNS = 7;
const BOARD_ROWS = 6;
const CANVAS_HEIGHT = 941;
const CANVAS_WIDTH = 1672;
const DEFAULT_BEAT_DURATION_MS = 500;
const DRAG_SWAP_THRESHOLD_RATIO = 0.34;
const MAX_DELTA_MS = 48;
const MATCH_FLASH_MS = 380;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const SWAP_ANIMATION_MS = 180;
const TILE_DRAW_SCALE = 0.82;
const BOARD_RECT = {
  height: 510,
  width: 606,
  x: 532,
  y: 238,
} as const;

type Animal = (typeof ANIMALS)[number];
type AnipangImages = Record<keyof typeof ANIPANG_IMAGES, HTMLImageElement>;
type Cell = Readonly<{
  column: number;
  row: number;
}>;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type DrawLayout = Readonly<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
type DragState = Readonly<{
  pointerId: number;
  start: Point;
  startCell: Cell;
}>;
type SwapAnimation = Readonly<{
  fromCell: Cell;
  matchedCells: readonly number[];
  startedAtMs: number;
  swappedBoard: readonly (Animal | null)[];
  toCell: Cell;
}>;
type GameState = {
  board: (Animal | null)[];
  drag: DragState | null;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  matchedAtMs: number | null;
  matchedCells: number[];
  swapAnimation: SwapAnimation | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function getRandomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)] ?? ANIMALS[0];
}

function getIndex(row: number, column: number) {
  return row * BOARD_COLUMNS + column;
}

function getCellCenter({ column, row }: Cell) {
  const cellWidth = BOARD_RECT.width / BOARD_COLUMNS;
  const cellHeight = BOARD_RECT.height / BOARD_ROWS;

  return {
    x: BOARD_RECT.x + cellWidth * (column + 0.5),
    y: BOARD_RECT.y + cellHeight * (row + 0.5),
  } satisfies Point;
}

function isAdjacent(first: Cell, second: Cell) {
  return (
    Math.abs(first.column - second.column) + Math.abs(first.row - second.row) ===
    1
  );
}

function getCellAtPoint(point: Point): Cell | null {
  if (
    point.x < BOARD_RECT.x ||
    point.x >= BOARD_RECT.x + BOARD_RECT.width ||
    point.y < BOARD_RECT.y ||
    point.y >= BOARD_RECT.y + BOARD_RECT.height
  ) {
    return null;
  }

  return {
    column: Math.floor(
      ((point.x - BOARD_RECT.x) / BOARD_RECT.width) * BOARD_COLUMNS,
    ),
    row: Math.floor(((point.y - BOARD_RECT.y) / BOARD_RECT.height) * BOARD_ROWS),
  } satisfies Cell;
}

function getSwapTargetFromDrag(drag: DragState, releasePoint: Point) {
  const releaseCell = getCellAtPoint(releasePoint);

  if (releaseCell && isAdjacent(drag.startCell, releaseCell)) {
    return releaseCell;
  }

  const cellWidth = BOARD_RECT.width / BOARD_COLUMNS;
  const cellHeight = BOARD_RECT.height / BOARD_ROWS;
  const deltaX = releasePoint.x - drag.start.x;
  const deltaY = releasePoint.y - drag.start.y;

  if (
    Math.abs(deltaX) < cellWidth * DRAG_SWAP_THRESHOLD_RATIO &&
    Math.abs(deltaY) < cellHeight * DRAG_SWAP_THRESHOLD_RATIO
  ) {
    return null;
  }

  const target =
    Math.abs(deltaX) > Math.abs(deltaY)
      ? {
          column: drag.startCell.column + Math.sign(deltaX),
          row: drag.startCell.row,
        }
      : {
          column: drag.startCell.column,
          row: drag.startCell.row + Math.sign(deltaY),
        };

  if (
    target.column < 0 ||
    target.column >= BOARD_COLUMNS ||
    target.row < 0 ||
    target.row >= BOARD_ROWS
  ) {
    return null;
  }

  return target satisfies Cell;
}

function swapCells(board: readonly (Animal | null)[], first: Cell, second: Cell) {
  const nextBoard = [...board];
  const firstIndex = getIndex(first.row, first.column);
  const secondIndex = getIndex(second.row, second.column);
  const firstAnimal = nextBoard[firstIndex];

  nextBoard[firstIndex] = nextBoard[secondIndex] ?? null;
  nextBoard[secondIndex] = firstAnimal ?? null;

  return nextBoard;
}

function collectRunMatches(run: number[], matchedIndexes: Set<number>) {
  if (run.length < 3) {
    return;
  }

  run.forEach((index) => {
    matchedIndexes.add(index);
  });
}

function getMatchedIndexes(board: readonly (Animal | null)[]) {
  const matchedIndexes = new Set<number>();

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    let runAnimal: Animal | null = null;
    let run: number[] = [];

    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const index = getIndex(row, column);
      const animal = board[index];

      if (animal && animal === runAnimal) {
        run = [...run, index];
      } else {
        collectRunMatches(run, matchedIndexes);
        runAnimal = animal;
        run = animal ? [index] : [];
      }
    }

    collectRunMatches(run, matchedIndexes);
  }

  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    let runAnimal: Animal | null = null;
    let run: number[] = [];

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const index = getIndex(row, column);
      const animal = board[index];

      if (animal && animal === runAnimal) {
        run = [...run, index];
      } else {
        collectRunMatches(run, matchedIndexes);
        runAnimal = animal;
        run = animal ? [index] : [];
      }
    }

    collectRunMatches(run, matchedIndexes);
  }

  return [...matchedIndexes];
}

function hasAnySolvingMove(board: readonly (Animal | null)[]) {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const cell = { column, row };
      const targets = [
        { column: column + 1, row },
        { column, row: row + 1 },
      ];

      if (
        targets.some(
          (target) =>
            target.column < BOARD_COLUMNS &&
            target.row < BOARD_ROWS &&
            getMatchedIndexes(swapCells(board, cell, target)).length > 0,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function createCandidateBoard() {
  const board: Animal[] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const blockedAnimals = new Set<Animal>();
      const leftFirst = board[getIndex(row, column - 1)];
      const leftSecond = board[getIndex(row, column - 2)];
      const topFirst = board[getIndex(row - 1, column)];
      const topSecond = board[getIndex(row - 2, column)];

      if (leftFirst && leftFirst === leftSecond) {
        blockedAnimals.add(leftFirst);
      }

      if (topFirst && topFirst === topSecond) {
        blockedAnimals.add(topFirst);
      }

      const candidates = ANIMALS.filter((animal) => !blockedAnimals.has(animal));
      const animal =
        candidates[Math.floor(Math.random() * candidates.length)] ??
        getRandomAnimal();

      board.push(animal);
    }
  }

  return board;
}

function createSolvableBoard() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const board = createCandidateBoard();

    if (getMatchedIndexes(board).length === 0 && hasAnySolvingMove(board)) {
      return board;
    }
  }

  return [
    "cat",
    "dog",
    "cat",
    "pig",
    "rabbit",
    "mouse",
    "monkey",
    "dog",
    "cat",
    "pig",
    "dog",
    "mouse",
    "monkey",
    "rabbit",
    "pig",
    "monkey",
    "dog",
    "cat",
    "rabbit",
    "pig",
    "mouse",
    "rabbit",
    "mouse",
    "monkey",
    "rabbit",
    "dog",
    "cat",
    "pig",
    "mouse",
    "pig",
    "rabbit",
    "mouse",
    "cat",
    "dog",
    "monkey",
    "monkey",
    "rabbit",
    "mouse",
    "monkey",
    "pig",
    "rabbit",
    "cat",
  ] satisfies Animal[];
}

function createInitialState() {
  return {
    board: createSolvableBoard(),
    drag: null,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    matchedAtMs: null,
    matchedCells: [],
    swapAnimation: null,
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

function getDrawLayout(width: number, height: number) {
  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);

  return {
    offsetX: (width - CANVAS_WIDTH * scale) / 2,
    offsetY: (height - CANVAS_HEIGHT * scale) / 2,
    scale,
  } satisfies DrawLayout;
}

function getPointerPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  layout: DrawLayout,
) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - bounds.left - layout.offsetX) / layout.scale,
    y: (event.clientY - bounds.top - layout.offsetY) / layout.scale,
  } satisfies Point;
}

function playSoundEffect(track: "anipangMatch" | "anipangSwipe") {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
}

function beginSwapAnimation(state: GameState, targetCell: Cell | null) {
  const drag = state.drag;

  if (!drag || !targetCell || state.hasCleared || state.swapAnimation) {
    return;
  }

  state.drag = null;

  const swappedBoard = swapCells(state.board, drag.startCell, targetCell);
  const matchedCells = getMatchedIndexes(swappedBoard);

  state.swapAnimation = {
    fromCell: drag.startCell,
    matchedCells,
    startedAtMs: state.elapsedMs,
    swappedBoard,
    toCell: targetCell,
  };
  playSoundEffect("anipangSwipe");
}

function completeSwapAnimation(state: GameState) {
  const animation = state.swapAnimation;

  if (!animation) {
    return;
  }

  const progress = (state.elapsedMs - animation.startedAtMs) / SWAP_ANIMATION_MS;

  if (progress < 1) {
    return;
  }

  state.swapAnimation = null;

  if (animation.matchedCells.length === 0) {
    return;
  }

  state.board = animation.swappedBoard.map((animal, index) =>
    animation.matchedCells.includes(index) ? null : animal,
  );
  state.hasCleared = true;
  state.matchedAtMs = state.elapsedMs;
  state.matchedCells = [...animation.matchedCells];
  playSoundEffect("anipangMatch");
  dispatchClear();
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement,
) {
  if (background.complete && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  context.fillStyle = "#42c9f3";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawAnimalTile(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  center: Point,
  size: number,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.shadowBlur = 12;
  context.shadowColor = "rgba(255, 255, 255, 0.72)";

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, center.x - size / 2, center.y - size / 2, size, size);
  } else {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(center.x, center.y, size / 2, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawMatchedSparkle(context: CanvasRenderingContext2D, center: Point) {
  context.save();
  context.strokeStyle = "rgba(255, 246, 104, 0.95)";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(center.x, center.y, 34, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.beginPath();
  context.arc(center.x, center.y, 7, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function interpolatePoint(from: Point, to: Point, progress: number) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  } satisfies Point;
}

function getSwapProgress(state: GameState) {
  if (!state.swapAnimation) {
    return 0;
  }

  return Math.min(
    (state.elapsedMs - state.swapAnimation.startedAtMs) / SWAP_ANIMATION_MS,
    1,
  );
}

function drawBoard(
  context: CanvasRenderingContext2D,
  images: AnipangImages,
  state: GameState,
) {
  const cellWidth = BOARD_RECT.width / BOARD_COLUMNS;
  const cellHeight = BOARD_RECT.height / BOARD_ROWS;
  const tileSize = Math.min(cellWidth, cellHeight) * TILE_DRAW_SCALE;
  const swapFromIndex = state.swapAnimation
    ? getIndex(
        state.swapAnimation.fromCell.row,
        state.swapAnimation.fromCell.column,
      )
    : -1;
  const swapToIndex = state.swapAnimation
    ? getIndex(state.swapAnimation.toCell.row, state.swapAnimation.toCell.column)
    : -1;
  const matchedCellSet = new Set(state.matchedCells);
  const matchedProgress =
    state.matchedAtMs === null
      ? 0
      : Math.min((state.elapsedMs - state.matchedAtMs) / MATCH_FLASH_MS, 1);

  state.board.forEach((animal, index) => {
    if (!animal || index === swapFromIndex || index === swapToIndex) {
      return;
    }

    const row = Math.floor(index / BOARD_COLUMNS);
    const column = index % BOARD_COLUMNS;
    const alpha = matchedCellSet.has(index) ? 1 - matchedProgress : 1;

    drawAnimalTile(
      context,
      images[animal],
      getCellCenter({ column, row }),
      tileSize,
      alpha,
    );
  });

  if (state.matchedCells.length > 0 && matchedProgress < 1) {
    state.matchedCells.forEach((index) => {
      const row = Math.floor(index / BOARD_COLUMNS);
      const column = index % BOARD_COLUMNS;

      drawMatchedSparkle(context, getCellCenter({ column, row }));
    });
  }

  if (state.swapAnimation) {
    const fromAnimal = state.board[swapFromIndex];
    const toAnimal = state.board[swapToIndex];
    const fromCenter = getCellCenter(state.swapAnimation.fromCell);
    const toCenter = getCellCenter(state.swapAnimation.toCell);
    const progress = getSwapProgress(state);
    const easedProgress = 1 - (1 - progress) ** 3;

    if (fromAnimal) {
      drawAnimalTile(
        context,
        images[fromAnimal],
        interpolatePoint(fromCenter, toCenter, easedProgress),
        tileSize,
        0.96,
      );
    }

    if (toAnimal) {
      drawAnimalTile(
        context,
        images[toAnimal],
        interpolatePoint(toCenter, fromCenter, easedProgress),
        tileSize,
        0.96,
      );
    }
  }
}

function drawProgressBar(
  context: CanvasRenderingContext2D,
  remainingRatio: number,
) {
  context.save();
  context.fillStyle = "rgba(154, 230, 0, 0.92)";
  context.strokeStyle = "rgba(255, 255, 255, 0.72)";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(543, 802, 585 * remainingRatio, 35, 17);
  context.fill();
  context.stroke();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: AnipangImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#42c9f3";
  context.fillRect(0, 0, width, height);

  const layout = getDrawLayout(width, height);

  context.save();
  context.translate(layout.offsetX, layout.offsetY);
  context.scale(layout.scale, layout.scale);

  drawBackground(context, images.background);
  drawBoard(context, images, state);
  drawProgressBar(context, remainingRatio);

  context.restore();
}

export function useAnipangGameCanvas(gameBeatCount: number) {
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
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let layout = getDrawLayout(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT);
    const pixelRatio = window.devicePixelRatio || 1;
    const images = {
      background: createImage(ANIPANG_IMAGES.background),
      cat: createImage(ANIPANG_IMAGES.cat),
      dog: createImage(ANIPANG_IMAGES.dog),
      monkey: createImage(ANIPANG_IMAGES.monkey),
      mouse: createImage(ANIPANG_IMAGES.mouse),
      pig: createImage(ANIPANG_IMAGES.pig),
      rabbit: createImage(ANIPANG_IMAGES.rabbit),
    } satisfies AnipangImages;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      beatDurationMs = getBeatDurationMs(canvas);
      layout = getDrawLayout(canvasWidth, canvasHeight);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared || state.swapAnimation) {
        return;
      }

      const point = getPointerPoint(canvas, event, layout);
      const cell = getCellAtPoint(point);

      if (!cell || !state.board[getIndex(cell.row, cell.column)]) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.drag = {
        pointerId: event.pointerId,
        start: point,
        startCell: cell,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const targetCell = getSwapTargetFromDrag(
        state.drag,
        getPointerPoint(canvas, event, layout),
      );

      if (targetCell) {
        beginSwapAnimation(state, targetCell);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      beginSwapAnimation(
        state,
        getSwapTargetFromDrag(
          state.drag,
          getPointerPoint(canvas, event, layout),
        ),
      );
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.drag?.pointerId === event.pointerId) {
        state.drag = null;
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const phaseDurationMs = gameBeatCount * beatDurationMs;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.elapsedMs += deltaMs;
      completeSwapAnimation(state);

      drawScene(
        context,
        images,
        state,
        canvasWidth,
        canvasHeight,
        Math.max(Math.min((phaseDurationMs - state.elapsedMs) / phaseDurationMs, 1), 0),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
