"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

type Operation = "+" | "-" | "×" | "÷";

type MathQuestion = Readonly<{
  answer: number;
  left: number;
  operation: Operation;
  right: number;
}>;

type SourceRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type SourceLayout = Readonly<{
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}>;

type GameState = {
  currentIndex: number;
  displayHoldMs: number;
  displayInput: string;
  feedbackMs: number;
  hasCleared: boolean;
  input: string;
  lastTimestamp: number | null;
  questions: readonly MathQuestion[];
};

const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const BACKGROUND_ZOOM = 1.16;
const BACKGROUND_SRC = "/games/brain-age/images/background.png";
const KEY_SOUND_SRC = "/games/brain-age/sounds/key-input.wav";
const MAX_DELTA_MS = 50;
const QUESTION_COUNT = 3;
const FEEDBACK_DURATION_MS = 280;
const DISPLAY_HOLD_MS = 320;
const LEFT_SCREEN = {
  height: 430,
  width: 456,
  x: 322,
  y: 270,
} satisfies SourceRect;
const RIGHT_SCREEN = {
  height: 360,
  width: 372,
  x: 913,
  y: 311,
} satisfies SourceRect;
const OPERATIONS = ["+", "-", "×", "÷"] as const;
const MULTIPLY_LARGE_SIDE_MAX = 9;
const MULTIPLY_SMALL_SIDE_MAX = 5;
const PLUS_MAX_ANSWER = 20;
const DIVIDE_MAX_ANSWER = 5;
const DIVIDE_MAX_RIGHT = 9;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createQuestion(): MathQuestion {
  const operation = OPERATIONS[getRandomInt(0, OPERATIONS.length - 1)];

  if (operation === "+") {
    const left = getRandomInt(0, PLUS_MAX_ANSWER);
    const right = getRandomInt(0, PLUS_MAX_ANSWER - left);

    return { answer: left + right, left, operation, right };
  }

  if (operation === "-") {
    const first = getRandomInt(0, 15);
    const second = getRandomInt(0, 15);
    const left = Math.max(first, second);
    const right = Math.min(first, second);

    return { answer: left - right, left, operation, right };
  }

  if (operation === "×") {
    const largeSide = getRandomInt(0, MULTIPLY_LARGE_SIDE_MAX);
    const smallSide = getRandomInt(0, MULTIPLY_SMALL_SIDE_MAX);
    const shouldSwap = Math.random() < 0.5;
    const left = shouldSwap ? smallSide : largeSide;
    const right = shouldSwap ? largeSide : smallSide;

    return { answer: left * right, left, operation, right };
  }

  const answer = getRandomInt(0, DIVIDE_MAX_ANSWER);
  const maxRight = answer === 0 ? DIVIDE_MAX_RIGHT : Math.floor(15 / answer);
  const right = getRandomInt(1, Math.min(DIVIDE_MAX_RIGHT, maxRight));
  const left = right * answer;

  return { answer, left, operation, right };
}

function createQuestions() {
  return Array.from({ length: QUESTION_COUNT }, createQuestion);
}

function createInitialState() {
  return {
    currentIndex: 0,
    displayHoldMs: 0,
    displayInput: "",
    feedbackMs: 0,
    hasCleared: false,
    input: "",
    lastTimestamp: null,
    questions: createQuestions(),
  } satisfies GameState;
}

function createAudio(src: string) {
  const audio = new Audio(src);

  audio.preload = "auto";

  return audio;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // The browser may reject SFX before user activation unlocks audio.
  });
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function getCoverLayout(width: number, height: number) {
  const scale =
    Math.max(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT) *
    BACKGROUND_ZOOM;
  const drawWidth = BACKGROUND_WIDTH * scale;
  const drawHeight = BACKGROUND_HEIGHT * scale;

  return {
    height: drawHeight,
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies SourceLayout;
}

function getCanvasRect(rect: SourceRect, layout: SourceLayout) {
  return {
    height: rect.height * layout.scale,
    width: rect.width * layout.scale,
    x: layout.x + rect.x * layout.scale,
    y: layout.y + rect.y * layout.scale,
  } satisfies SourceRect;
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

function fitFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  initialSize: number,
  maxWidth: number,
) {
  let fontSize = initialSize;

  while (fontSize > 10) {
    context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;

    if (context.measureText(text).width <= maxWidth) {
      return fontSize;
    }

    fontSize -= 2;
  }

  return fontSize;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  layout: SourceLayout,
  width: number,
  height: number,
) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (isImageReady(image)) {
    context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
  }
}

function drawQuestionScreen(
  context: CanvasRenderingContext2D,
  rect: SourceRect,
  state: GameState,
) {
  context.save();
  context.fillStyle = "rgba(245, 248, 248, 0.82)";
  context.fillRect(rect.x + 8, rect.y + 8, rect.width - 16, rect.height - 16);
  context.fillStyle = "#334155";
  context.font = `900 ${Math.max(16, rect.width * 0.052)}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "계산 x 3",
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.13,
  );

  state.questions.forEach((question, index) => {
    const y = rect.y + rect.height * (0.33 + index * 0.21);
    const text = `${question.left} ${question.operation} ${question.right} =`;
    const isCurrent = index === state.currentIndex;
    const isSolved = index < state.currentIndex;
    const shake =
      isCurrent && state.feedbackMs > 0
        ? Math.sin(state.feedbackMs * 0.18) * rect.width * 0.018
        : 0;

    context.fillStyle = isCurrent
      ? "rgba(14, 165, 233, 0.12)"
      : "rgba(15, 23, 42, 0.04)";
    drawRoundedRect(
      context,
      rect.x + rect.width * 0.12 + shake,
      y - rect.height * 0.072,
      rect.width * 0.76,
      rect.height * 0.14,
      12,
    );
    context.fill();
    context.fillStyle = isSolved ? "#64748b" : "#0f172a";
    context.font = `900 ${Math.max(22, rect.width * 0.088)}px Arial, Helvetica, sans-serif`;
    context.fillText(text, rect.x + rect.width * 0.48 + shake, y);

    if (isSolved) {
      context.fillStyle = "#16a34a";
      context.font = `900 ${Math.max(18, rect.width * 0.06)}px Arial, Helvetica, sans-serif`;
      context.fillText("OK", rect.x + rect.width * 0.78, y);
    }
  });

  context.restore();
}

function drawAnswerScreen(
  context: CanvasRenderingContext2D,
  rect: SourceRect,
  state: GameState,
) {
  const question = state.questions[state.currentIndex];
  const displayText =
    state.input ||
    (state.displayHoldMs > 0 || state.hasCleared ? state.displayInput : " ");

  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.fillRect(rect.x + 8, rect.y + 8, rect.width - 16, rect.height - 16);
  context.fillStyle = "rgba(226, 232, 240, 0.92)";
  context.fillRect(
    rect.x + 8,
    rect.y + rect.height * 0.78,
    rect.width - 16,
    rect.height * 0.16,
  );
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#64748b";
  context.font = `900 ${Math.max(15, rect.width * 0.048)}px Arial, Helvetica, sans-serif`;
  context.fillText(
    `${Math.min(state.currentIndex + 1, QUESTION_COUNT)} / ${QUESTION_COUNT}`,
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.13,
  );

  if (question && !state.hasCleared) {
    context.fillStyle = "#94a3b8";
    context.font = `900 ${Math.max(18, rect.width * 0.062)}px Arial, Helvetica, sans-serif`;
    context.fillText(
      `${question.left} ${question.operation} ${question.right}`,
      rect.x + rect.width / 2,
      rect.y + rect.height * 0.27,
    );
  }

  context.fillStyle = state.feedbackMs > 0 ? "#dc2626" : "#111827";
  const fontSize = fitFontSize(
    context,
    displayText,
    rect.width * 0.33,
    rect.width * 0.72,
  );
  context.font = `900 ${fontSize}px "Comic Sans MS", "Bradley Hand", Arial, sans-serif`;
  context.fillText(
    displayText,
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.55,
  );
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  state: GameState,
  width: number,
  height: number,
) {
  const layout = getCoverLayout(width, height);
  const leftScreen = getCanvasRect(LEFT_SCREEN, layout);
  const rightScreen = getCanvasRect(RIGHT_SCREEN, layout);

  drawBackground(context, image, layout, width, height);
  drawQuestionScreen(context, leftScreen, state);
  drawAnswerScreen(context, rightScreen, state);
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const nextWidth = Math.max(1, Math.floor(width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(height * pixelRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { height, width };
}

function isNumberKey(event: KeyboardEvent) {
  return /^[0-9]$/.test(event.key) || /^Numpad[0-9]$/.test(event.code);
}

function getKeyNumber(event: KeyboardEvent) {
  if (/^[0-9]$/.test(event.key)) {
    return event.key;
  }

  return event.code.replace("Numpad", "");
}

function handleDigit(state: GameState, digit: string) {
  if (state.hasCleared) {
    return;
  }

  const question = state.questions[state.currentIndex];

  if (!question) {
    return;
  }

  const nextInput = `${state.input}${digit}`.replace(/^0+(?=\d)/, "");
  const answerText = String(question.answer);

  state.input = nextInput;
  state.displayInput = nextInput;
  state.displayHoldMs = 0;

  if (nextInput.length < answerText.length) {
    return;
  }

  if (nextInput === answerText) {
    const nextIndex = state.currentIndex + 1;

    state.currentIndex = nextIndex;
    state.input = "";
    state.displayHoldMs = DISPLAY_HOLD_MS;

    if (nextIndex >= state.questions.length) {
      state.hasCleared = true;
      dispatchClear();
    }

    return;
  }

  state.feedbackMs = FEEDBACK_DURATION_MS;
  state.displayHoldMs = FEEDBACK_DURATION_MS;
  state.input = "";
}

export function useBrainAgeMathGameCanvas() {
  const backgroundRef = useRef<HTMLImageElement | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const keyAudioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    const background = new Image();

    background.src = BACKGROUND_SRC;
    backgroundRef.current = background;
    keyAudioRef.current = createAudio(KEY_SOUND_SRC);
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isNumberKey(event) && event.key !== "Backspace") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (event.key === "Backspace") {
        state.input = state.input.slice(0, -1);
        state.displayInput = state.input;
        state.displayHoldMs = state.input ? 0 : DISPLAY_HOLD_MS;
        return;
      }

      playAudio(keyAudioRef.current);
      handleDigit(state, getKeyNumber(event));
    };
    const render = (timestamp: number) => {
      const state = stateRef.current;
      const { height, width } = resizeCanvas(canvas, context);
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.feedbackMs = Math.max(0, state.feedbackMs - deltaMs);
      state.displayHoldMs = Math.max(0, state.displayHoldMs - deltaMs);
      drawScene(context, backgroundRef.current, state, width, height);
      frameRef.current = window.requestAnimationFrame(render);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });

      if (frameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  return canvasRef;
}
