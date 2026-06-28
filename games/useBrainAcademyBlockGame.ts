"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_MS = 50;
const FEEDBACK_DURATION_MS = 360;
const BACKGROUND_IMAGE_SRC = "/games/brain-academy/images/background.webp";

type AnswerWord =
  | "eight"
  | "five"
  | "four"
  | "nine"
  | "one"
  | "seven"
  | "six"
  | "three"
  | "two";

type Puzzle = Readonly<{
  answer: number;
  src: string;
}>;

type GameState = {
  feedbackMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  lastTimestamp: number | null;
  puzzle: Puzzle;
};

type ImageKey = "background" | "puzzle";
type LoadedImages = Partial<Record<ImageKey, HTMLImageElement>>;

const ANSWER_WORD_VALUES = {
  eight: 8,
  five: 5,
  four: 4,
  nine: 9,
  one: 1,
  seven: 7,
  six: 6,
  three: 3,
  two: 2,
} satisfies Record<AnswerWord, number>;

const PUZZLE_IMAGE_PATHS = [
  "/games/brain-academy/images/eight_A.png",
  "/games/brain-academy/images/eight_B.png",
  "/games/brain-academy/images/five_A.png",
  "/games/brain-academy/images/five_B.png",
  "/games/brain-academy/images/four_A.png",
  "/games/brain-academy/images/four_B.png",
  "/games/brain-academy/images/nine_A.png",
  "/games/brain-academy/images/nine_B.png",
  "/games/brain-academy/images/one_A.png",
  "/games/brain-academy/images/seven_A.png",
  "/games/brain-academy/images/seven_B.png",
  "/games/brain-academy/images/six_A.png",
  "/games/brain-academy/images/six_B.png",
  "/games/brain-academy/images/three_A.png",
  "/games/brain-academy/images/three_B.png",
  "/games/brain-academy/images/two_A.png",
  "/games/brain-academy/images/two_B.png",
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getAnswerFromImagePath(src: string) {
  const fileName = src.split("/").at(-1) ?? "";
  const answerWord = fileName.split("_")[0] as AnswerWord;

  return ANSWER_WORD_VALUES[answerWord];
}

function getRandomPuzzle() {
  const src =
    PUZZLE_IMAGE_PATHS[Math.floor(Math.random() * PUZZLE_IMAGE_PATHS.length)];
  const answer = getAnswerFromImagePath(src);

  if (!answer) {
    throw new Error(`Invalid Brain Academy puzzle filename: ${src}`);
  }

  return { answer, src } satisfies Puzzle;
}

function createInitialState() {
  return {
    feedbackMs: 0,
    hasCleared: false,
    hasFailed: false,
    lastTimestamp: null,
    puzzle: getRandomPuzzle(),
  } satisfies GameState;
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );
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

function drawPuzzlePlaceholder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  context.fillStyle = "#e0f2fe";
  drawRoundedRect(context, x, y, size, size, 24);
  context.fill();
  context.strokeStyle = "#0284c7";
  context.lineWidth = 5;
  context.stroke();
  drawCenteredText(context, "?", x + size / 2, y + size / 2, 92, "#0369a1");
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: LoadedImages,
  width: number,
  height: number,
) {
  if (isImageReady(images.background)) {
    drawCoverImage(context, images.background, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#bae6fd");
    gradient.addColorStop(0.5, "#fef3c7");
    gradient.addColorStop(1, "#fef9c3");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = "rgba(255, 255, 255, 0.16)";
  context.fillRect(0, 0, width, height);

  const puzzleSize = Math.min(width * 0.52, height * 0.56, 470);
  const puzzleX = (width - puzzleSize) / 2;
  const puzzleY = height * 0.15;
  const shakeOffset = state.hasFailed
    ? Math.sin(state.feedbackMs * 0.12) * Math.min(12, width * 0.014)
    : 0;

  context.shadowColor = "rgba(15, 23, 42, 0.28)";
  context.shadowBlur = 24;
  context.shadowOffsetY = 14;
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  drawRoundedRect(
    context,
    puzzleX - 22 + shakeOffset,
    puzzleY - 22,
    puzzleSize + 44,
    puzzleSize + 44,
    28,
  );
  context.fill();
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  if (isImageReady(images.puzzle)) {
    context.drawImage(
      images.puzzle,
      puzzleX + shakeOffset,
      puzzleY,
      puzzleSize,
      puzzleSize,
    );
  } else {
    drawPuzzlePlaceholder(context, puzzleX + shakeOffset, puzzleY, puzzleSize);
  }

  if (state.hasFailed) {
    drawCenteredText(
      context,
      "틀렸습니다",
      width / 2,
      Math.min(height * 0.86, puzzleY + puzzleSize + 70),
      36,
      "#ef4444",
    );
  }
}

export function useBrainAcademyBlockGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages>({});
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    const background = new Image();
    const puzzle = new Image();

    background.src = BACKGROUND_IMAGE_SRC;
    puzzle.src = stateRef.current.puzzle.src;
    imagesRef.current = { background, puzzle };
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
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!/^[1-9]$/.test(event.key)) {
        return;
      }

      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      state.feedbackMs = FEEDBACK_DURATION_MS;

      if (Number(event.key) === state.puzzle.answer) {
        state.hasCleared = true;
        dispatchClear();
        return;
      }

      state.hasFailed = true;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.feedbackMs = Math.max(state.feedbackMs - deltaMs, 0);
      drawScene(context, state, imagesRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

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
