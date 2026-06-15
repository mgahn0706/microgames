"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const BOARD_SIZE = 6;
const BOARD_SOURCE_INSET = 8;
const BOARD_SOURCE_SIZE = 592;
const CAPTURE_SOUND_SRC = "/games/chess/sounds/capture.mp3";
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const PIECE_SCALE = 0.78;
const CHESS_ASSETS = {
  bishop: "/games/chess/images/black_bishop.png",
  board: "/games/chess/images/chess_board.png",
  king: "/games/chess/images/white_king.png",
  knight: "/games/chess/images/black_knight.png",
  rook: "/games/chess/images/black_rook.png",
} as const;

type PieceType = "bishop" | "knight" | "rook";

type BoardPosition = Readonly<{
  column: number;
  row: number;
}>;

type Point = Readonly<{
  x: number;
  y: number;
}>;

type BoardLayout = Readonly<{
  cellSize: number;
  gridX: number;
  gridY: number;
  size: number;
  x: number;
  y: number;
}>;

type ChessPiece = Readonly<{
  id: PieceType;
  position: BoardPosition;
  type: PieceType;
}>;

type DragState = Readonly<{
  pieceId: PieceType;
  pointer: Point;
}>;

type GameState = {
  drag: DragState | null;
  hasCleared: boolean;
  kingPosition: BoardPosition;
  pieces: readonly ChessPiece[];
};

type ChessImages = Readonly<
  Record<keyof typeof CHESS_ASSETS, HTMLImageElement>
>;

const PIECE_TYPES = ["rook", "knight", "bishop"] as const;
const KNIGHT_OFFSETS = [
  { column: -2, row: -1 },
  { column: -2, row: 1 },
  { column: -1, row: -2 },
  { column: -1, row: 2 },
  { column: 1, row: -2 },
  { column: 1, row: 2 },
  { column: 2, row: -1 },
  { column: 2, row: 1 },
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = nextItems[index];
    const swapItem = nextItems[swapIndex];

    nextItems[index] = swapItem;
    nextItems[swapIndex] = currentItem;
  }

  return nextItems;
}

function isOnBoard(position: BoardPosition) {
  return (
    position.column >= 0 &&
    position.column < BOARD_SIZE &&
    position.row >= 0 &&
    position.row < BOARD_SIZE
  );
}

function getCaptureTargets(pieceType: PieceType, piecePosition: BoardPosition) {
  if (pieceType === "knight") {
    return KNIGHT_OFFSETS.map(({ column, row }) => ({
      column: piecePosition.column + column,
      row: piecePosition.row + row,
    })).filter(isOnBoard);
  }

  const directions =
    pieceType === "rook"
      ? [
          { column: -1, row: 0 },
          { column: 0, row: -1 },
          { column: 0, row: 1 },
          { column: 1, row: 0 },
        ]
      : [
          { column: -1, row: -1 },
          { column: -1, row: 1 },
          { column: 1, row: -1 },
          { column: 1, row: 1 },
        ];

  return directions.flatMap((direction) =>
    Array.from({ length: BOARD_SIZE - 1 }, (_, index) => ({
      column: piecePosition.column + direction.column * (index + 1),
      row: piecePosition.row + direction.row * (index + 1),
    })).filter(isOnBoard),
  );
}

function isSamePosition(first: BoardPosition, second: BoardPosition) {
  return first.column === second.column && first.row === second.row;
}

function canPieceCaptureKing(
  piece: ChessPiece,
  kingPosition: BoardPosition,
  pieces: readonly ChessPiece[],
) {
  const columnDelta = kingPosition.column - piece.position.column;
  const rowDelta = kingPosition.row - piece.position.row;

  if (piece.type === "knight") {
    return (
      (Math.abs(columnDelta) === 2 && Math.abs(rowDelta) === 1) ||
      (Math.abs(columnDelta) === 1 && Math.abs(rowDelta) === 2)
    );
  }

  const isValidLine =
    piece.type === "rook"
      ? columnDelta === 0 || rowDelta === 0
      : Math.abs(columnDelta) === Math.abs(rowDelta);

  if (!isValidLine) {
    return false;
  }

  const columnStep = Math.sign(columnDelta);
  const rowStep = Math.sign(rowDelta);
  const distance = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));

  return Array.from({ length: distance - 1 }, (_, index) => ({
    column: piece.position.column + columnStep * (index + 1),
    row: piece.position.row + rowStep * (index + 1),
  })).every((position) =>
    pieces.every(
      (candidate) =>
        candidate.id === piece.id ||
        !isSamePosition(candidate.position, position),
    ),
  );
}

function getAllBoardPositions() {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (__, column) => ({ column, row })),
  ).flat();
}

function createInitialState() {
  const targetType = getRandomItem(PIECE_TYPES);
  const targetPosition = getRandomItem(getAllBoardPositions());
  const targetPiece = {
    id: targetType,
    position: targetPosition,
    type: targetType,
  } satisfies ChessPiece;
  const decoyTypes = PIECE_TYPES.filter((type) => type !== targetType);
  const candidateKingPositions = shuffle(
    getCaptureTargets(targetType, targetPosition),
  );
  const candidatePiecePositions = shuffle(
    getAllBoardPositions().filter(
      (position) => !isSamePosition(position, targetPosition),
    ),
  );

  const generatedPosition = candidateKingPositions
    .map((kingPosition) => {
      const openPositions = candidatePiecePositions.filter(
        (position) => !isSamePosition(position, kingPosition),
      );

      return openPositions
        .map((firstDecoyPosition) => {
          const firstDecoy = {
            id: decoyTypes[0],
            position: firstDecoyPosition,
            type: decoyTypes[0],
          } satisfies ChessPiece;

          return openPositions
            .filter((position) => !isSamePosition(position, firstDecoyPosition))
            .map((secondDecoyPosition) => {
              const secondDecoy = {
                id: decoyTypes[1],
                position: secondDecoyPosition,
                type: decoyTypes[1],
              } satisfies ChessPiece;
              const pieces = [targetPiece, firstDecoy, secondDecoy];
              const capturingPieces = pieces.filter((piece) =>
                canPieceCaptureKing(piece, kingPosition, pieces),
              );

              return capturingPieces.length === 1 &&
                capturingPieces[0]?.id === targetPiece.id
                ? { kingPosition, pieces }
                : null;
            })
            .find((position) => position !== null);
        })
        .find((position) => position !== undefined);
    })
    .find((position) => position !== undefined);

  if (!generatedPosition) {
    return createInitialState();
  }

  return {
    drag: null,
    hasCleared: false,
    kingPosition: generatedPosition.kingPosition,
    pieces: shuffle(generatedPosition.pieces),
  } satisfies GameState;
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function loadImages() {
  return Object.fromEntries(
    Object.entries(CHESS_ASSETS).map(([key, src]) => [key, createImage(src)]),
  ) as ChessImages;
}

function isImageReady(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function getBoardLayout(width: number, height: number) {
  const size = Math.min(width * 0.78, height * 0.9);
  const inset = size * (BOARD_SOURCE_INSET / BOARD_SOURCE_SIZE);
  const gridSize = size - inset * 2;

  return {
    cellSize: gridSize / BOARD_SIZE,
    gridX: (width - size) / 2 + inset,
    gridY: (height - size) / 2 + inset,
    size,
    x: (width - size) / 2,
    y: (height - size) / 2,
  } satisfies BoardLayout;
}

function getCellCenter(position: BoardPosition, layout: BoardLayout) {
  return {
    x: layout.gridX + (position.column + 0.5) * layout.cellSize,
    y: layout.gridY + (position.row + 0.5) * layout.cellSize,
  };
}

function getBoardPosition(point: Point, layout: BoardLayout) {
  const position = {
    column: Math.floor((point.x - layout.gridX) / layout.cellSize),
    row: Math.floor((point.y - layout.gridY) / layout.cellSize),
  };

  return isOnBoard(position) ? position : null;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function isPointOverPiece(
  point: Point,
  position: BoardPosition,
  layout: BoardLayout,
) {
  const center = getCellCenter(position, layout);

  return (
    Math.hypot(point.x - center.x, point.y - center.y) <= layout.cellSize * 0.48
  );
}

function drawBoard(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  layout: BoardLayout,
) {
  if (isImageReady(image)) {
    context.drawImage(image, layout.x, layout.y, layout.size, layout.size);
    return;
  }

  Array.from({ length: BOARD_SIZE }).forEach((_, row) => {
    Array.from({ length: BOARD_SIZE }).forEach((__, column) => {
      context.fillStyle = (row + column) % 2 === 0 ? "#f3f4f6" : "#9ca3af";
      context.fillRect(
        layout.gridX + column * layout.cellSize,
        layout.gridY + row * layout.cellSize,
        layout.cellSize,
        layout.cellSize,
      );
    });
  });
}

function drawPiece(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  center: Point,
  cellSize: number,
  alpha = 1,
) {
  const size = cellSize * PIECE_SCALE;

  context.save();
  context.globalAlpha = alpha;
  context.shadowBlur = cellSize * 0.12;
  context.shadowColor = "rgba(0, 0, 0, 0.5)";

  if (isImageReady(image)) {
    context.drawImage(
      image,
      center.x - size / 2,
      center.y - size / 2,
      size,
      size,
    );
  } else {
    context.fillStyle = "#27272a";
    context.beginPath();
    context.arc(center.x, center.y, size * 0.36, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: ChessImages,
  state: GameState,
  width: number,
  height: number,
) {
  context.fillStyle = "#20242a";
  context.fillRect(0, 0, width, height);

  const layout = getBoardLayout(width, height);
  const kingCenter = getCellCenter(state.kingPosition, layout);
  const draggedPiece = state.drag
    ? state.pieces.find((piece) => piece.id === state.drag?.pieceId)
    : null;

  context.save();
  context.shadowBlur = 30;
  context.shadowColor = "rgba(255, 255, 255, 0.16)";
  drawBoard(context, images.board, layout);
  context.restore();

  if (!state.hasCleared) {
    drawPiece(context, images.king, kingCenter, layout.cellSize);
  }

  state.pieces.forEach((piece) => {
    const isDragged = piece.id === draggedPiece?.id;
    const center =
      state.hasCleared &&
      canPieceCaptureKing(piece, state.kingPosition, state.pieces)
        ? kingCenter
        : getCellCenter(piece.position, layout);

    drawPiece(
      context,
      images[piece.type],
      center,
      layout.cellSize,
      isDragged ? 0.3 : 1,
    );
  });

  if (state.drag && draggedPiece) {
    drawPiece(
      context,
      images[draggedPiece.type],
      state.drag.pointer,
      layout.cellSize,
    );
  }
}

function playCaptureSound(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Pointer interaction normally unlocks audio; ignore browser blocking.
  });
}

export function useChessGameCanvas() {
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

    const captureAudio = new Audio(CAPTURE_SOUND_SRC);
    const images = loadImages();
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;

    captureAudio.volume = 0.88;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared) {
        return;
      }

      const point = getPointerPoint(canvas, event);
      const layout = getBoardLayout(canvasWidth, canvasHeight);
      const selectedPiece = [...state.pieces]
        .reverse()
        .find((piece) => isPointOverPiece(point, piece.position, layout));

      if (!selectedPiece) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.drag = {
        pieceId: selectedPiece.id,
        pointer: point,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag) {
        return;
      }

      event.preventDefault();
      state.drag = {
        ...state.drag,
        pointer: getPointerPoint(canvas, event),
      };
    };

    const finishDrag = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag) {
        return;
      }

      event.preventDefault();
      const layout = getBoardLayout(canvasWidth, canvasHeight);
      const droppedPosition = getBoardPosition(
        getPointerPoint(canvas, event),
        layout,
      );
      const draggedPiece = state.pieces.find(
        (piece) => piece.id === state.drag?.pieceId,
      );

      state.drag = null;

      if (
        !draggedPiece ||
        !droppedPosition ||
        !isSamePosition(droppedPosition, state.kingPosition) ||
        !canPieceCaptureKing(draggedPiece, state.kingPosition, state.pieces)
      ) {
        return;
      }

      state.hasCleared = true;
      playCaptureSound(captureAudio);
      dispatchClear();
    };

    const render = () => {
      drawScene(context, images, stateRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", finishDrag);
    canvas.addEventListener("pointercancel", finishDrag);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishDrag);
      canvas.removeEventListener("pointercancel", finishDrag);
    };
  }, []);

  return canvasRef;
}
