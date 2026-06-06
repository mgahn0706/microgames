"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const BOARD_COLUMNS = 10;
const BOARD_ROWS = 16;
const CLEAR_ROWS = 4;
const DEFAULT_BEAT_DURATION_MS = 500;
const GRAVITY_DROP_MS = 320;
const MAX_DELTA_MS = 50;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const FILLED_CELL_COLORS = [
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#22c55e",
  "#eab308",
  "#3b82f6",
] as const;
const TETRIS_PIECE_COLOR = "#22d3ee";
const TETRIS_SOUNDS = {
  clear: "/games/tetris/sounds/clear.mp3",
  lateralMove: "/games/tetris/sounds/lateralmove.mp3",
  rotate: "/games/tetris/sounds/rotate.mp3",
} as const;

type BoardCell = string | null;

type PieceOrientation = "horizontal" | "vertical";

type Piece = {
  column: number;
  orientation: PieceOrientation;
  row: number;
};

type GameState = {
  board: BoardCell[][];
  clearFlashMs: number;
  dropAccumulatorMs: number;
  elapsedMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  holeColumn: number;
  lastTimestamp: number | null;
  piece: Piece;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createBoard(holeColumn: number) {
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      const isClearRow = row >= BOARD_ROWS - CLEAR_ROWS;

      if (!isClearRow || column === holeColumn) {
        return null;
      }

      return FILLED_CELL_COLORS[(row + column) % FILLED_CELL_COLORS.length];
    }),
  );
}

function createInitialState() {
  const holeColumn = 3 + Math.floor(Math.random() * 4);

  return {
    board: createBoard(holeColumn),
    clearFlashMs: 0,
    dropAccumulatorMs: 0,
    elapsedMs: 0,
    hasCleared: false,
    hasFailed: false,
    holeColumn,
    lastTimestamp: null,
    piece: {
      column: Math.max(0, holeColumn - 1),
      orientation: "horizontal",
      row: 0,
    },
  } satisfies GameState;
}

function getPieceCells(piece: Piece) {
  return Array.from({ length: 4 }, (_, index) => ({
    column:
      piece.orientation === "horizontal" ? piece.column + index : piece.column,
    row: piece.orientation === "horizontal" ? piece.row : piece.row + index,
  }));
}

function canPlacePiece(board: readonly BoardCell[][], piece: Piece) {
  return getPieceCells(piece).every(({ column, row }) => {
    if (column < 0 || column >= BOARD_COLUMNS || row < 0 || row >= BOARD_ROWS) {
      return false;
    }

    return board[row]?.[column] === null;
  });
}

function movePiece(state: GameState, columnOffset: number, rowOffset: number) {
  const nextPiece = {
    ...state.piece,
    column: state.piece.column + columnOffset,
    row: state.piece.row + rowOffset,
  };

  if (!canPlacePiece(state.board, nextPiece)) {
    return false;
  }

  state.piece = nextPiece;
  return true;
}

function rotatePiece(state: GameState) {
  const nextOrientation =
    state.piece.orientation === "horizontal" ? "vertical" : "horizontal";
  const nextPiece: Piece = {
    ...state.piece,
    orientation: nextOrientation,
  };

  if (canPlacePiece(state.board, nextPiece)) {
    state.piece = nextPiece;
    return true;
  }

  const kicks = [-1, 1, -2, 2];
  const kickedPiece = kicks
    .map((columnOffset) => ({
      ...nextPiece,
      column: nextPiece.column + columnOffset,
    }))
    .find((candidate) => canPlacePiece(state.board, candidate));

  if (kickedPiece) {
    state.piece = kickedPiece;
    return true;
  }

  return false;
}

function getCompletedRows(board: readonly BoardCell[][]) {
  return board
    .map((row, index) => (row.every((cell) => cell !== null) ? index : -1))
    .filter((index) => index >= 0);
}

function lockPiece(state: GameState) {
  const nextBoard = state.board.map((row) => [...row]);

  getPieceCells(state.piece).forEach(({ column, row }) => {
    if (nextBoard[row]) {
      nextBoard[row][column] = TETRIS_PIECE_COLOR;
    }
  });

  state.board = nextBoard;
  const completedRows = getCompletedRows(nextBoard);

  if (completedRows.length >= CLEAR_ROWS) {
    state.clearFlashMs = 520;
    state.hasCleared = true;
    completedRows.forEach((row) => {
      state.board[row] = Array.from({ length: BOARD_COLUMNS }, () => null);
    });
    dispatchClear();
    return "clear";
  }

  state.hasFailed = true;
  return "failed";
}

function stepPieceDown(state: GameState) {
  if (!movePiece(state, 0, 1)) {
    return lockPiece(state);
  }

  return "moved";
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

function drawCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  color: string,
) {
  context.fillStyle = color;
  context.fillRect(x, y, cellSize, cellSize);
  context.fillStyle = "rgba(255, 255, 255, 0.22)";
  context.fillRect(x + 4, y + 4, cellSize - 8, Math.max(3, cellSize * 0.16));
  context.strokeStyle = "rgba(15, 23, 42, 0.72)";
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  remainingMs: number,
) {
  const cellSize = Math.floor(Math.min(width * 0.046, height * 0.052));
  const boardWidth = BOARD_COLUMNS * cellSize;
  const boardHeight = BOARD_ROWS * cellSize;
  const boardX = (width - boardWidth) / 2;
  const boardY = (height - boardHeight) / 2 + 22;

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.2)");
  gradient.addColorStop(0.52, "rgba(168, 85, 247, 0.18)");
  gradient.addColorStop(1, "rgba(250, 204, 21, 0.16)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  drawCenteredText(context, "4줄 없애라!", width / 2, 54, 38, "#f8fafc");
  drawCenteredText(
    context,
    `${Math.ceil(remainingMs / 1000)}초`,
    width / 2,
    102,
    24,
    "#bae6fd",
  );

  context.fillStyle = "#020617";
  context.fillRect(boardX - 12, boardY - 12, boardWidth + 24, boardHeight + 24);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 4;
  context.strokeRect(
    boardX - 12,
    boardY - 12,
    boardWidth + 24,
    boardHeight + 24,
  );

  state.board.forEach((row, rowIndex) => {
    row.forEach((cellColor, columnIndex) => {
      const x = boardX + columnIndex * cellSize;
      const y = boardY + rowIndex * cellSize;

      drawCell(context, x, y, cellSize, cellColor ?? "#111827");
    });
  });

  if (!state.hasCleared) {
    context.fillStyle = "rgba(250, 204, 21, 0.22)";
    context.fillRect(
      boardX + state.holeColumn * cellSize,
      boardY + (BOARD_ROWS - CLEAR_ROWS) * cellSize,
      cellSize,
      CLEAR_ROWS * cellSize,
    );

    getPieceCells(state.piece).forEach(({ column, row }) => {
      drawCell(
        context,
        boardX + column * cellSize,
        boardY + row * cellSize,
        cellSize,
        state.hasFailed ? "#64748b" : TETRIS_PIECE_COLOR,
      );
    });
  }

  if (state.clearFlashMs > 0) {
    context.fillStyle = `rgba(134, 239, 172, ${Math.min(
      state.clearFlashMs / 520,
      1,
    )})`;
    context.fillRect(boardX, boardY, boardWidth, boardHeight);
  }

  if (state.hasFailed) {
    drawCenteredText(context, "MISS", width / 2, height * 0.5, 54, "#fca5a5");
  }
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Browsers can block playback before a trusted key input unlocks audio.
  });
}

export function useTetrisLineClearGameCanvas(gameBeatCount: number) {
  const clearAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lateralMoveAudioRef = useRef<HTMLAudioElement | null>(null);
  const rotateAudioRef = useRef<HTMLAudioElement | null>(null);
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
      stateRef.current = createInitialState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      if (
        !["ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.code === "ArrowLeft") {
        if (movePiece(state, -1, 0)) {
          playAudio(lateralMoveAudioRef.current);
        }
        return;
      }

      if (event.code === "ArrowRight") {
        if (movePiece(state, 1, 0)) {
          playAudio(lateralMoveAudioRef.current);
        }
        return;
      }

      if (event.code === "ArrowDown") {
        const dropResult = stepPieceDown(state);

        if (dropResult === "moved") {
          playAudio(lateralMoveAudioRef.current);
        }

        if (dropResult === "clear") {
          playAudio(clearAudioRef.current);
        }

        state.dropAccumulatorMs = 0;
        return;
      }

      if (rotatePiece(state)) {
        playAudio(rotateAudioRef.current);
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

      if (!state.hasCleared && !state.hasFailed) {
        state.elapsedMs += deltaMs;
        state.dropAccumulatorMs += deltaMs;

        while (
          state.dropAccumulatorMs >= GRAVITY_DROP_MS &&
          !state.hasCleared &&
          !state.hasFailed
        ) {
          state.dropAccumulatorMs -= GRAVITY_DROP_MS;
          const dropResult = stepPieceDown(state);

          if (dropResult === "clear") {
            playAudio(clearAudioRef.current);
          }
        }
      }

      if (state.clearFlashMs > 0) {
        state.clearFlashMs = Math.max(state.clearFlashMs - deltaMs, 0);
      }

      drawScene(
        context,
        state,
        canvasWidth,
        canvasHeight,
        Math.max(phaseDurationMs - state.elapsedMs, 0),
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    clearAudioRef.current = new Audio(TETRIS_SOUNDS.clear);
    lateralMoveAudioRef.current = new Audio(TETRIS_SOUNDS.lateralMove);
    rotateAudioRef.current = new Audio(TETRIS_SOUNDS.rotate);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [gameBeatCount]);

  return canvasRef;
}
