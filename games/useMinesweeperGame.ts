"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const MINESWEEPER_IMAGES = {
  empty: "/games/minesweeper/images/TileEmpty.png",
  exploded: "/games/minesweeper/images/TileExploded.png",
  mine: "/games/minesweeper/images/TileMine.png",
  one: "/games/minesweeper/images/Tile1.png",
  three: "/games/minesweeper/images/Tile3.png",
  two: "/games/minesweeper/images/Tile2.png",
  four: "/games/minesweeper/images/Tile4.png",
  unknown: "/games/minesweeper/images/TileUnknown.png",
} as const;

const BOARD_COLUMNS = 7;
const BOARD_ROWS = 5;
const CANVAS_HEIGHT = 941;
const CANVAS_WIDTH = 1672;
const DEFAULT_BEAT_DURATION_MS = 500;
const MAX_DELTA_MS = 48;
const MINE_INDEXES = new Set([2, 8, 12, 17, 22, 26, 30, 33]);
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const PANEL_RECT = {
  height: 560,
  width: 680,
  x: 496,
  y: 170,
} as const;
const TILE_SIZE = 74;

type MineTileImageKey = keyof typeof MINESWEEPER_IMAGES;
type MinesweeperImages = Record<MineTileImageKey, HTMLImageElement>;
type Cell = Readonly<{
  column: number;
  row: number;
}>;
type DrawLayout = Readonly<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type GameState = {
  clickedMineIndex: number | null;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  revealedIndexes: ReadonlySet<number>;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function createInitialState() {
  return {
    clickedMineIndex: null,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    revealedIndexes: new Set<number>(),
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

function getDrawLayout(width: number, height: number) {
  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);

  return {
    offsetX: (width - CANVAS_WIDTH * scale) / 2,
    offsetY: (height - CANVAS_HEIGHT * scale) / 2,
    scale,
  } satisfies DrawLayout;
}

function getBoardOrigin() {
  return {
    x: PANEL_RECT.x + (PANEL_RECT.width - BOARD_COLUMNS * TILE_SIZE) / 2,
    y: PANEL_RECT.y + 142,
  } satisfies Point;
}

function getIndex(row: number, column: number) {
  return row * BOARD_COLUMNS + column;
}

function getCellAtPoint(point: Point) {
  const origin = getBoardOrigin();
  const boardWidth = BOARD_COLUMNS * TILE_SIZE;
  const boardHeight = BOARD_ROWS * TILE_SIZE;

  if (
    point.x < origin.x ||
    point.x >= origin.x + boardWidth ||
    point.y < origin.y ||
    point.y >= origin.y + boardHeight
  ) {
    return null;
  }

  return {
    column: Math.floor((point.x - origin.x) / TILE_SIZE),
    row: Math.floor((point.y - origin.y) / TILE_SIZE),
  } satisfies Cell;
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

function getNeighborIndexes(row: number, column: number) {
  const indexes: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;

      if (
        neighborRow < 0 ||
        neighborRow >= BOARD_ROWS ||
        neighborColumn < 0 ||
        neighborColumn >= BOARD_COLUMNS
      ) {
        continue;
      }

      indexes.push(getIndex(neighborRow, neighborColumn));
    }
  }

  return indexes;
}

function getAdjacentMineCount(row: number, column: number) {
  return getNeighborIndexes(row, column).filter((index) =>
    MINE_INDEXES.has(index),
  ).length;
}

function getCellByIndex(index: number) {
  return {
    column: index % BOARD_COLUMNS,
    row: Math.floor(index / BOARD_COLUMNS),
  } satisfies Cell;
}

function collectSafeRevealIndexes(startIndex: number) {
  const revealIndexes = new Set<number>();
  const pendingIndexes = [startIndex];

  while (pendingIndexes.length > 0) {
    const index = pendingIndexes.pop();

    if (
      index === undefined ||
      revealIndexes.has(index) ||
      MINE_INDEXES.has(index)
    ) {
      continue;
    }

    const { column, row } = getCellByIndex(index);
    const neighborIndexes = getNeighborIndexes(row, column);

    revealIndexes.add(index);
    neighborIndexes.forEach((neighborIndex) => {
      if (!MINE_INDEXES.has(neighborIndex)) {
        revealIndexes.add(neighborIndex);
      }
    });

    if (getAdjacentMineCount(row, column) === 0) {
      neighborIndexes.forEach((neighborIndex) => {
        if (!MINE_INDEXES.has(neighborIndex)) {
          pendingIndexes.push(neighborIndex);
        }
      });
    }
  }

  return revealIndexes;
}

function getNumberImageKey(count: number) {
  if (count === 1) {
    return "one";
  }

  if (count === 2) {
    return "two";
  }

  if (count === 3) {
    return "three";
  }

  if (count >= 4) {
    return "four";
  }

  return "empty";
}

function playSoundEffect(
  track: "minesweeperClick" | "minesweeperExplosion" | "minesweeperStart",
) {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
}

function revealSafeTile(state: GameState, index: number) {
  if (MINE_INDEXES.has(index) || state.revealedIndexes.has(index)) {
    return;
  }

  state.revealedIndexes = new Set([
    ...state.revealedIndexes,
    ...collectSafeRevealIndexes(index),
  ]);
  playSoundEffect("minesweeperClick");
}

function clickCell(state: GameState, cell: Cell) {
  if (state.hasCleared) {
    return;
  }

  const index = getIndex(cell.row, cell.column);

  if (MINE_INDEXES.has(index)) {
    state.clickedMineIndex = index;
    state.hasCleared = true;
    state.revealedIndexes = new Set([
      ...state.revealedIndexes,
      ...MINE_INDEXES,
    ]);
    playSoundEffect("minesweeperExplosion");
    dispatchClear();
    return;
  }

  revealSafeTile(state, index);
}

function drawTileImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  if (image.complete && image.naturalWidth > 0) {
    context.imageSmoothingEnabled = false;
    context.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
    context.imageSmoothingEnabled = true;
    return;
  }

  context.fillStyle = "#c0c0c0";
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.strokeStyle = "#808080";
  context.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawPanel(context: CanvasRenderingContext2D, state: GameState) {
  context.fillStyle = "#008080";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.save();
  context.fillStyle = "#c0c0c0";
  context.fillRect(PANEL_RECT.x, PANEL_RECT.y, PANEL_RECT.width, PANEL_RECT.height);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 8;
  context.strokeRect(PANEL_RECT.x + 4, PANEL_RECT.y + 4, PANEL_RECT.width - 8, PANEL_RECT.height - 8);
  context.strokeStyle = "#808080";
  context.strokeRect(PANEL_RECT.x + 14, PANEL_RECT.y + 14, PANEL_RECT.width - 28, PANEL_RECT.height - 28);

  context.fillStyle = "#000000";
  context.fillRect(PANEL_RECT.x + 48, PANEL_RECT.y + 42, 128, 64);
  context.fillRect(PANEL_RECT.x + PANEL_RECT.width - 176, PANEL_RECT.y + 42, 128, 64);
  context.fillStyle = "#ff0000";
  context.font = "700 44px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    String(MINE_INDEXES.size).padStart(3, "0"),
    PANEL_RECT.x + 112,
    PANEL_RECT.y + 74,
  );
  context.fillText(
    String(Math.max(0, Math.ceil((4000 - state.elapsedMs) / 1000))).padStart(3, "0"),
    PANEL_RECT.x + PANEL_RECT.width - 112,
    PANEL_RECT.y + 74,
  );

  context.fillStyle = state.hasCleared ? "#ffef63" : "#f8d64f";
  context.strokeStyle = "#808080";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(PANEL_RECT.x + PANEL_RECT.width / 2, PANEL_RECT.y + 74, 36, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#000000";
  context.beginPath();
  context.arc(PANEL_RECT.x + PANEL_RECT.width / 2 - 12, PANEL_RECT.y + 66, 4, 0, Math.PI * 2);
  context.arc(PANEL_RECT.x + PANEL_RECT.width / 2 + 12, PANEL_RECT.y + 66, 4, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 4;
  context.beginPath();
  context.arc(PANEL_RECT.x + PANEL_RECT.width / 2, PANEL_RECT.y + 76, 16, 0.15 * Math.PI, 0.85 * Math.PI);
  context.stroke();
  context.restore();
}

function drawBoard(
  context: CanvasRenderingContext2D,
  images: MinesweeperImages,
  state: GameState,
) {
  const origin = getBoardOrigin();

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const index = getIndex(row, column);
      const x = origin.x + column * TILE_SIZE;
      const y = origin.y + row * TILE_SIZE;
      const isRevealed = state.revealedIndexes.has(index);
      const imageKey =
        state.clickedMineIndex === index
          ? "exploded"
          : isRevealed && MINE_INDEXES.has(index)
            ? "mine"
            : isRevealed
              ? getNumberImageKey(getAdjacentMineCount(row, column))
              : "unknown";

      drawTileImage(context, images[imageKey], x, y);
    }
  }
}

function drawRoundTimer(context: CanvasRenderingContext2D, remainingRatio: number) {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.24)";
  context.fillRect(514, 782, 644, 10);
  context.fillStyle = "#00ff66";
  context.fillRect(514, 782, 644 * remainingRatio, 10);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: MinesweeperImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#008080";
  context.fillRect(0, 0, width, height);

  const layout = getDrawLayout(width, height);

  context.save();
  context.translate(layout.offsetX, layout.offsetY);
  context.scale(layout.scale, layout.scale);
  drawPanel(context, state);
  drawBoard(context, images, state);
  drawRoundTimer(context, remainingRatio);
  context.restore();
}

export function useMinesweeperGameCanvas(gameBeatCount: number) {
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
      empty: createImage(MINESWEEPER_IMAGES.empty),
      exploded: createImage(MINESWEEPER_IMAGES.exploded),
      mine: createImage(MINESWEEPER_IMAGES.mine),
      one: createImage(MINESWEEPER_IMAGES.one),
      three: createImage(MINESWEEPER_IMAGES.three),
      two: createImage(MINESWEEPER_IMAGES.two),
      four: createImage(MINESWEEPER_IMAGES.four),
      unknown: createImage(MINESWEEPER_IMAGES.unknown),
    } satisfies MinesweeperImages;

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

      if (state.hasCleared) {
        return;
      }

      const cell = getCellAtPoint(getPointerPoint(canvas, event, layout));

      if (!cell) {
        return;
      }

      event.preventDefault();
      clickCell(state, cell);
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
    resizeCanvas();
    playSoundEffect("minesweeperStart");
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
