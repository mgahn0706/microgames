"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const GRID_COLUMNS = 11;
const GRID_ROWS = 3;
const SOURCE_CELL_SIZE = 52;
const SOURCE_GRID_X = 545;
const SOURCE_GRID_Y = 457;
const SPRITE_SIZE = 48;
const BABA_ASSETS = {
  baba: "/games/baba-is-you/images/baba.png",
  background: "/games/baba-is-you/images/background.webp",
  flag: "/games/baba-is-you/images/flag.png",
  rock: "/games/baba-is-you/images/rock.png",
} as const;
const BABA_SOUNDS = {
  clear: "/games/baba-is-you/sounds/clear.ogg",
  move: "/games/baba-is-you/sounds/move.ogg",
} as const;

type AssetKey = keyof typeof BABA_ASSETS;
type Direction = "down" | "left" | "right" | "up";

type Cell = Readonly<{
  column: number;
  row: number;
}>;

type BackgroundLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type GameState = {
  hasCleared: boolean;
  player: Cell;
  rocks: Cell[];
};

const KEY_TO_DIRECTION = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
} satisfies Record<string, Direction>;

const DIRECTION_OFFSET = {
  down: { column: 0, row: 1 },
  left: { column: -1, row: 0 },
  right: { column: 1, row: 0 },
  up: { column: 0, row: -1 },
} satisfies Record<Direction, Cell>;

const FLAG_CELL = { column: 9, row: 1 } satisfies Cell;

function isDirectionKey(key: string): key is keyof typeof KEY_TO_DIRECTION {
  return key in KEY_TO_DIRECTION;
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createInitialState() {
  return {
    hasCleared: false,
    player: { column: 1, row: 1 },
    rocks: [
      { column: 5, row: 0 },
      { column: 5, row: 1 },
      { column: 5, row: 2 },
    ],
  } satisfies GameState;
}

function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image;
}

function loadImages() {
  return Object.fromEntries(
    Object.entries(BABA_ASSETS).map(([key, src]) => [key, loadImage(src)]),
  ) as Record<AssetKey, HTMLImageElement>;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // A trusted arrow-key input unlocks audio in browsers that block autoplay.
  });
}

function getCoverLayout(width: number, height: number): BackgroundLayout {
  const scale = Math.max(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);

  return {
    height: BACKGROUND_HEIGHT * scale,
    scale,
    width: BACKGROUND_WIDTH * scale,
    x: (width - BACKGROUND_WIDTH * scale) / 2,
    y: (height - BACKGROUND_HEIGHT * scale) / 2,
  };
}

function isSameCell(first: Cell, second: Cell) {
  return first.column === second.column && first.row === second.row;
}

function isInsideBoard(cell: Cell) {
  return (
    cell.column >= 0 &&
    cell.column < GRID_COLUMNS &&
    cell.row >= 0 &&
    cell.row < GRID_ROWS
  );
}

function getOffsetCell(cell: Cell, direction: Direction) {
  const offset = DIRECTION_OFFSET[direction];

  return {
    column: cell.column + offset.column,
    row: cell.row + offset.row,
  } satisfies Cell;
}

function getRockIndex(rocks: readonly Cell[], cell: Cell) {
  return rocks.findIndex((rock) => isSameCell(rock, cell));
}

function movePlayer(state: GameState, direction: Direction) {
  if (state.hasCleared) {
    return false;
  }

  const target = getOffsetCell(state.player, direction);

  if (!isInsideBoard(target)) {
    return false;
  }

  const rockIndex = getRockIndex(state.rocks, target);

  if (rockIndex >= 0) {
    const pushedTarget = getOffsetCell(target, direction);

    if (
      !isInsideBoard(pushedTarget) ||
      getRockIndex(state.rocks, pushedTarget) >= 0
    ) {
      return false;
    }

    state.rocks = state.rocks.map((rock, index) =>
      index === rockIndex ? pushedTarget : rock,
    );
  }

  state.player = target;
  return true;
}

function getCellCenter(cell: Cell, layout: BackgroundLayout) {
  return {
    x:
      layout.x +
      (SOURCE_GRID_X + (cell.column + 0.5) * SOURCE_CELL_SIZE) * layout.scale,
    y:
      layout.y +
      (SOURCE_GRID_Y + (cell.row + 0.5) * SOURCE_CELL_SIZE) * layout.scale,
  };
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cell: Cell,
  layout: BackgroundLayout,
) {
  const center = getCellCenter(cell, layout);
  const size = SPRITE_SIZE * layout.scale;

  if (!image.complete || image.naturalWidth === 0) {
    return;
  }

  context.drawImage(
    image,
    center.x - size / 2,
    center.y - size / 2,
    size,
    size,
  );
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Record<AssetKey, HTMLImageElement>,
  layout: BackgroundLayout,
  width: number,
  height: number,
) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  if (images.background.complete && images.background.naturalWidth > 0) {
    context.drawImage(
      images.background,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  }

  drawSprite(context, images.flag, FLAG_CELL, layout);
  state.rocks.forEach((rock) => {
    drawSprite(context, images.rock, rock, layout);
  });
  drawSprite(context, images.baba, state.player, layout);
}

export function useBabaIsYouGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clearAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
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

    const images = loadImages();
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let canvasHeight = 360;
    let canvasWidth = 640;
    let layout = getCoverLayout(canvasWidth, canvasHeight);

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, 640);
      canvasHeight = Math.max(bounds.height, 360);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      layout = getCoverLayout(canvasWidth, canvasHeight);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDirectionKey(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      const state = stateRef.current;
      const direction = KEY_TO_DIRECTION[event.key];

      if (!movePlayer(state, direction)) {
        return;
      }

      playAudio(moveAudioRef.current);

      if (!state.hasCleared && isSameCell(state.player, FLAG_CELL)) {
        state.hasCleared = true;
        playAudio(clearAudioRef.current);
        dispatchClear();
      }
    };

    const render = () => {
      drawScene(
        context,
        stateRef.current,
        images,
        layout,
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    clearAudioRef.current = new Audio(BABA_SOUNDS.clear);
    moveAudioRef.current = new Audio(BABA_SOUNDS.move);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearAudioRef.current = null;
      moveAudioRef.current = null;
    };
  }, []);

  return canvasRef;
}
