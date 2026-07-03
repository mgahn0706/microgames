"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const GRID_SIZE = 3;
const NUMBER_COUNT = GRID_SIZE * GRID_SIZE;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;

type Puzzle = Readonly<{
  answer: number;
  cells: readonly (number | null)[];
  missingIndex: number;
}>;

type GameState = {
  hasAnswered: boolean;
  puzzle: Puzzle;
  selectedNumber: number | null;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function shuffleNumbers(numbers: readonly number[]) {
  const shuffledNumbers = [...numbers];

  for (let index = shuffledNumbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentNumber = shuffledNumbers[index];
    const swapNumber = shuffledNumbers[swapIndex];

    shuffledNumbers[index] = swapNumber;
    shuffledNumbers[swapIndex] = currentNumber;
  }

  return shuffledNumbers;
}

function createPuzzle() {
  const numbers = shuffleNumbers(
    Array.from({ length: NUMBER_COUNT }, (_, index) => index + 1),
  );
  const missingIndex = Math.floor(Math.random() * NUMBER_COUNT);
  const answer = numbers[missingIndex];

  if (!answer) {
    throw new Error("Sudoku puzzle must include a missing answer.");
  }

  return {
    answer,
    cells: numbers.map((number, index) =>
      index === missingIndex ? null : number,
    ),
    missingIndex,
  } satisfies Puzzle;
}

function createInitialState() {
  return {
    hasAnswered: false,
    puzzle: createPuzzle(),
    selectedNumber: null,
  } satisfies GameState;
}

function parseNumberKey(event: KeyboardEvent) {
  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key);
  }

  if (/^Numpad[1-9]$/.test(event.code)) {
    return Number(event.code.replace("Numpad", ""));
  }

  return null;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.42,
    Math.max(width, height) * 0.72,
  );

  gradient.addColorStop(0, "#312e81");
  gradient.addColorStop(0.52, "#172554");
  gradient.addColorStop(1, "#070b20");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.14;
  context.strokeStyle = "#a5f3fc";
  context.lineWidth = 1;

  const spacing = Math.max(34, Math.min(width, height) * 0.07);

  for (let x = -height; x < width + height; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + height, height);
    context.stroke();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) {
  drawBackground(context, width, height);

  const hasCorrectAnswer =
    state.hasAnswered && state.selectedNumber === state.puzzle.answer;

  const boardSize = Math.min(width * 0.58, height * 0.7, 620);
  const cellSize = boardSize / GRID_SIZE;
  const boardX = (width - boardSize) / 2;
  const boardY = (height - boardSize) / 2 + height * 0.035;
  const boardRadius = Math.max(18, boardSize * 0.035);

  context.save();
  context.shadowColor = "rgba(34, 211, 238, 0.42)";
  context.shadowBlur = 34;
  context.fillStyle = "rgba(8, 15, 48, 0.92)";
  drawRoundedRect(
    context,
    boardX - 12,
    boardY - 12,
    boardSize + 24,
    boardSize + 24,
    boardRadius,
  );
  context.fill();
  context.shadowBlur = 0;

  state.puzzle.cells.forEach((number, index) => {
    const column = index % GRID_SIZE;
    const row = Math.floor(index / GRID_SIZE);
    const x = boardX + column * cellSize;
    const y = boardY + row * cellSize;
    const isMissing = index === state.puzzle.missingIndex;
    const hasSelection = isMissing && state.selectedNumber !== null;

    if (isMissing) {
      const pulse = (Math.sin(performance.now() / 180) + 1) / 2;

      context.fillStyle = hasCorrectAnswer
        ? `rgba(52, 211, 153, ${0.28 + pulse * 0.26})`
        : `rgba(34, 211, 238, ${0.22 + pulse * 0.18})`;
      context.fillRect(x + 5, y + 5, cellSize - 10, cellSize - 10);

      if (hasCorrectAnswer) {
        context.save();
        context.strokeStyle = "rgba(167, 243, 208, 0.96)";
        context.lineWidth = Math.max(5, cellSize * 0.055);
        context.shadowColor = "rgba(52, 211, 153, 0.85)";
        context.shadowBlur = 24;
        context.strokeRect(x + 9, y + 9, cellSize - 18, cellSize - 18);
        context.restore();
      }
    } else {
      context.fillStyle =
        (row + column) % 2 === 0
          ? "rgba(255, 255, 255, 0.09)"
          : "rgba(125, 211, 252, 0.07)";
      context.fillRect(x + 5, y + 5, cellSize - 10, cellSize - 10);
    }

    if (number !== null || hasSelection) {
      const displayNumber = number ?? state.selectedNumber;

      context.fillStyle = "#f8fafc";
      context.font = `900 ${Math.floor(cellSize * 0.5)}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "rgba(34, 211, 238, 0.45)";
      context.shadowBlur = 12;
      context.fillText(
        String(displayNumber),
        x + cellSize / 2,
        y + cellSize / 2 + cellSize * 0.025,
      );
      context.shadowBlur = 0;
    } else {
      context.fillStyle = "#67e8f9";
      context.font = `900 ${Math.floor(cellSize * 0.42)}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("?", x + cellSize / 2, y + cellSize / 2);
    }
  });

  context.strokeStyle = "rgba(207, 250, 254, 0.82)";
  context.lineWidth = Math.max(3, boardSize * 0.008);
  drawRoundedRect(
    context,
    boardX,
    boardY,
    boardSize,
    boardSize,
    boardRadius * 0.55,
  );
  context.stroke();

  for (let line = 1; line < GRID_SIZE; line += 1) {
    context.beginPath();
    context.moveTo(boardX + line * cellSize, boardY);
    context.lineTo(boardX + line * cellSize, boardY + boardSize);
    context.moveTo(boardX, boardY + line * cellSize);
    context.lineTo(boardX + boardSize, boardY + line * cellSize);
    context.stroke();
  }

  context.restore();

  context.fillStyle = "#cffafe";
  context.font = `900 ${Math.max(22, Math.min(42, height * 0.052))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(34, 211, 238, 0.6)";
  context.shadowBlur = 18;
  context.fillText("1부터 9까지, 빠진 숫자는?", width / 2, height * 0.105);
  context.shadowBlur = 0;

  if (hasCorrectAnswer) {
    context.save();
    context.fillStyle = "#bbf7d0";
    context.font = `900 ${Math.max(30, Math.min(58, height * 0.075))}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(52, 211, 153, 0.86)";
    context.shadowBlur = 28;
    context.fillText("정답!", width / 2, height * 0.91);
    context.restore();
  }
}

export function useSudokuGameCanvas() {
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

    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const selectedNumber = parseNumberKey(event);

      if (!selectedNumber) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (state.hasAnswered) {
        return;
      }

      state.hasAnswered = true;
      state.selectedNumber = selectedNumber;

      if (selectedNumber === state.puzzle.answer) {
        dispatchClear();
      }
    };

    const render = () => {
      drawScene(context, stateRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return canvasRef;
}
