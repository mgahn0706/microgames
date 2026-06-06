"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const MAX_DELTA_MS = 50;
const FEEDBACK_DURATION_MS = 360;
const BACKGROUND_IMAGE_SRC = "/games/piano/images/background.png";
const NOTE_VOLUME = 0.68;

type Note = Readonly<{
  key: string;
  label: string;
  soundSrc: string;
}>;

type Melody = readonly number[];
type NoteResult = "correct" | "pending" | "wrong";

type GameState = {
  feedback: "idle" | "reset" | "success";
  feedbackMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  melody: Melody;
  noteResults: NoteResult[];
  progress: number;
};

const NOTES = [
  { key: "1", label: "도", soundSrc: "/games/piano/sounds/C4.mp3" },
  { key: "2", label: "레", soundSrc: "/games/piano/sounds/D4.mp3" },
  { key: "3", label: "미", soundSrc: "/games/piano/sounds/E4.mp3" },
  { key: "4", label: "파", soundSrc: "/games/piano/sounds/F4.mp3" },
  { key: "5", label: "솔", soundSrc: "/games/piano/sounds/G4.mp3" },
  { key: "6", label: "라", soundSrc: "/games/piano/sounds/A4.mp3" },
  { key: "7", label: "시", soundSrc: "/games/piano/sounds/B4.mp3" },
  { key: "8", label: "도", soundSrc: "/games/piano/sounds/C5.mp3" },
  { key: "9", label: "레", soundSrc: "/games/piano/sounds/D5.mp3" },
] satisfies Note[];

const MELODY_POOL = [
  [3, 2, 1, 2, 3, 3, 3],
  [5, 5, 6, 6, 5, 5, 3],
  [1, 1, 5, 5, 6, 6, 5],
  [3, 4, 5, 3, 4, 5, 5],
  [5, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 5, 3, 2, 1],
] as const satisfies readonly Melody[];

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomMelody() {
  return MELODY_POOL[Math.floor(Math.random() * MELODY_POOL.length)];
}

function createInitialState() {
  const melody = getRandomMelody();

  return {
    feedback: "idle",
    feedbackMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    melody,
    noteResults: createPendingNoteResults(melody),
    progress: 0,
  } satisfies GameState;
}

function isImageReady(
  image: HTMLImageElement | null,
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

function getNoteTextColor(result: NoteResult) {
  if (result === "correct") {
    return "#15803d";
  }

  if (result === "wrong") {
    return "#dc2626";
  }

  return "#431407";
}

function createPendingNoteResults(melody: Melody) {
  return Array.from({ length: melody.length }, () => "pending" as const);
}

function drawMelodyLabel(
  context: CanvasRenderingContext2D,
  state: GameState,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
) {
  const labels = state.melody.map((noteNumber) => NOTES[noteNumber - 1].label);
  const gap = fontSize * 0.46;

  context.save();
  context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";

  const labelWidths = labels.map((label) => context.measureText(label).width);
  const totalWidth =
    labelWidths.reduce((sum, labelWidth) => sum + labelWidth, 0) +
    gap * Math.max(labels.length - 1, 0);
  const scale = Math.min(1, maxWidth / totalWidth);
  const resolvedFontSize = fontSize * scale;
  const resolvedGap = gap * scale;

  context.font = `900 ${resolvedFontSize}px Arial, Helvetica, sans-serif`;

  const resolvedLabelWidths = labels.map(
    (label) => context.measureText(label).width,
  );
  const resolvedTotalWidth =
    resolvedLabelWidths.reduce((sum, labelWidth) => sum + labelWidth, 0) +
    resolvedGap * Math.max(labels.length - 1, 0);
  let cursorX = x - resolvedTotalWidth / 2;

  labels.forEach((label, index) => {
    context.fillStyle = getNoteTextColor(state.noteResults[index] ?? "pending");
    context.fillText(label, cursorX, y);
    cursorX += resolvedLabelWidths[index] + resolvedGap;
  });

  context.restore();
}

function playNoteAudio(
  noteAudios: readonly HTMLAudioElement[],
  noteIndex: number,
) {
  const audio = noteAudios[noteIndex];

  if (!audio) {
    return;
  }

  audio.volume = NOTE_VOLUME;
  audio.currentTime = 0;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  backgroundImage: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (isImageReady(backgroundImage)) {
    drawCoverImage(context, backgroundImage, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, "#111827");
    gradient.addColorStop(0.55, "#3f2a19");
    gradient.addColorStop(1, "#18181b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  const panelWidth = Math.min(width * 0.76, 720);
  const panelX = (width - panelWidth) / 2;
  const panelY = height * 0.1;
  const panelHeight = Math.min(height * 0.18, 128);

  context.fillStyle = "rgba(255, 247, 237, 0.9)";
  context.beginPath();
  context.roundRect(panelX, panelY, panelWidth, panelHeight, 18);
  context.fill();
  context.strokeStyle = "rgba(120, 53, 15, 0.32)";
  context.lineWidth = 3;
  context.stroke();

  drawMelodyLabel(
    context,
    state,
    width / 2,
    panelY + panelHeight / 2,
    panelWidth * 0.86,
    Math.min(42, panelWidth / 13),
  );
}

export function usePianoMelodyGameCanvas() {
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const noteAudiosRef = useRef<HTMLAudioElement[]>([]);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    const image = new Image();

    image.src = BACKGROUND_IMAGE_SRC;
    backgroundImageRef.current = image;
    noteAudiosRef.current = NOTES.map((note) => {
      const audio = new Audio(note.soundSrc);

      audio.preload = "auto";
      audio.volume = NOTE_VOLUME;

      return audio;
    });
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
      const noteIndex = NOTES.findIndex((note) => note.key === event.key);

      if (noteIndex < 0 || stateRef.current.hasCleared) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const state = stateRef.current;

      if (state.feedback === "reset") {
        state.feedback = "idle";
        state.feedbackMs = 0;
        state.noteResults = createPendingNoteResults(state.melody);
      }

      const noteNumber = noteIndex + 1;
      const expectedNoteNumber = state.melody[state.progress];
      const attemptedProgress = state.progress;

      playNoteAudio(noteAudiosRef.current, noteIndex);

      if (noteNumber !== expectedNoteNumber) {
        state.feedback = "reset";
        state.feedbackMs = FEEDBACK_DURATION_MS;
        state.noteResults = state.melody.map((_, index) =>
          index < attemptedProgress ? "correct" : "pending",
        );
        state.noteResults[
          Math.min(attemptedProgress, state.melody.length - 1)
        ] = "wrong";
        state.progress = 0;
        return;
      }

      state.noteResults[state.progress] = "correct";
      state.progress += 1;
      state.feedback = "idle";
      state.feedbackMs = 0;

      if (state.progress >= state.melody.length) {
        state.hasCleared = true;
        state.feedback = "success";
        dispatchClear();
      }
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;
      state.feedbackMs = Math.max(state.feedbackMs - deltaMs, 0);

      if (state.feedback === "reset" && state.feedbackMs === 0) {
        state.feedback = "idle";
        state.noteResults = createPendingNoteResults(state.melody);
      }

      drawScene(
        context,
        state,
        backgroundImageRef.current,
        canvasWidth,
        canvasHeight,
      );
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
      noteAudiosRef.current.forEach((audio) => {
        audio.pause();
      });
      noteAudiosRef.current = [];
    };
  }, []);

  return canvasRef;
}
