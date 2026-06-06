"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const WIRE_RADIUS = 18;
const WIRE_DROP_RADIUS = 82;
const WIRE_GRAB_RADIUS = 82;
const AMONG_US_BACKGROUND = "/games/among-us/images/background.png";
const AMONG_US_SOUNDS = {
  connected: "/games/among-us/sounds/wire-connected.mp3",
  opening: "/games/among-us/sounds/wire-opening.mp3",
} as const;
const WIRE_COLORS = [
  { color: "#ef4444", name: "red" },
  { color: "#facc15", name: "yellow" },
  { color: "#3b82f6", name: "blue" },
] as const;
const LEFT_NODE_POSITIONS = [
  { x: 0.252, y: 0.292 },
  { x: 0.252, y: 0.505 },
  { x: 0.252, y: 0.712 },
] as const;
const RIGHT_NODE_POSITIONS = [
  { x: 0.748, y: 0.292 },
  { x: 0.748, y: 0.505 },
  { x: 0.748, y: 0.712 },
] as const;

type WireColorName = (typeof WIRE_COLORS)[number]["name"];

type Point = {
  x: number;
  y: number;
};

type WireEndpoint = Point & {
  color: string;
  name: WireColorName;
};

type WireSide = "left" | "right";

type SelectableWireEndpoint = WireEndpoint & {
  side: WireSide;
};

type DragState = {
  color: string;
  from: WireEndpoint;
  pointer: Point;
  side: WireSide;
};

type GameState = {
  completed: Partial<Record<WireColorName, boolean>>;
  drag: DragState | null;
  hasCleared: boolean;
  leftWires: WireEndpoint[];
  rightWires: WireEndpoint[];
};

type BackgroundLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
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

function getBackgroundLayout(
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  return {
    height: drawHeight,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  } satisfies BackgroundLayout;
}

function toCanvasPoint(layout: BackgroundLayout, position: Point) {
  return {
    x: layout.x + layout.width * position.x,
    y: layout.y + layout.height * position.y,
  };
}

function createFallbackLayout(width: number, height: number) {
  return {
    height,
    width,
    x: 0,
    y: 0,
  } satisfies BackgroundLayout;
}

function createInitialState(layout: BackgroundLayout) {
  const leftOrder = shuffle(WIRE_COLORS);
  const rightOrder = shuffle(WIRE_COLORS);

  return {
    completed: {},
    drag: null,
    hasCleared: false,
    leftWires: leftOrder.map((wire, index) => ({
      ...wire,
      ...toCanvasPoint(layout, LEFT_NODE_POSITIONS[index]),
    })),
    rightWires: rightOrder.map((wire, index) => ({
      ...wire,
      ...toCanvasPoint(layout, RIGHT_NODE_POSITIONS[index]),
    })),
  } satisfies GameState;
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getNearestOpenWire(
  state: GameState,
  pointer: Point,
): SelectableWireEndpoint | null {
  const candidates = [
    ...state.leftWires.map((wire) => ({ ...wire, side: "left" as const })),
    ...state.rightWires.map((wire) => ({ ...wire, side: "right" as const })),
  ]
    .filter((wire) => !state.completed[wire.name])
    .map((wire) => ({
      ...wire,
      distance: getDistance(pointer, wire),
    }))
    .sort((first, second) => first.distance - second.distance);
  const nearestWire = candidates[0];

  if (!nearestWire || nearestWire.distance > WIRE_GRAB_RADIUS) {
    return null;
  }

  return nearestWire;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function drawWireLine(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  alpha = 1,
) {
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineCap = "round";
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.globalAlpha = 1;
}

function drawEndpoint(
  context: CanvasRenderingContext2D,
  endpoint: WireEndpoint,
  isComplete: boolean,
) {
  context.fillStyle = isComplete ? "#d1d5db" : endpoint.color;
  context.beginPath();
  context.arc(endpoint.x, endpoint.y, WIRE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#111827";
  context.lineWidth = 5;
  context.stroke();
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Audio may be blocked until a trusted interaction unlocks playback.
  });
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  background: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (background) {
    const layout = getBackgroundLayout(background, width, height);

    context.drawImage(
      background,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  } else {
    context.fillStyle = "#111827";
    context.fillRect(0, 0, width, height);
  }

  state.leftWires.forEach((leftWire) => {
    const rightWire = state.rightWires.find(
      (candidate) => candidate.name === leftWire.name,
    );

    if (rightWire && state.completed[leftWire.name]) {
      drawWireLine(context, leftWire, rightWire, leftWire.color);
    }
  });

  if (state.drag) {
    drawWireLine(
      context,
      state.drag.from,
      state.drag.pointer,
      state.drag.color,
      0.88,
    );
  }

  state.leftWires.forEach((wire) => {
    drawEndpoint(context, wire, Boolean(state.completed[wire.name]));
  });
  state.rightWires.forEach((wire) => {
    drawEndpoint(context, wire, Boolean(state.completed[wire.name]));
  });

  drawCenteredText(
    context,
    "같은 색 전선을 연결하세요",
    width / 2,
    height * 0.09,
    34,
  );
}

export function useAmongUsWireGameCanvas() {
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);
  const openingAudioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<GameState>(
    createInitialState(
      createFallbackLayout(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT),
    ),
  );

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
    let isDisposed = false;
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const background = backgroundRef.current;

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stateRef.current = createInitialState(
        background
          ? getBackgroundLayout(background, canvasWidth, canvasHeight)
          : createFallbackLayout(canvasWidth, canvasHeight),
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;
      const pointer = getPointerPoint(canvas, event);
      const selectedWire = getNearestOpenWire(state, pointer);

      if (!selectedWire) {
        return;
      }

      event.preventDefault();
      state.drag = {
        color: selectedWire.color,
        from: selectedWire,
        pointer,
        side: selectedWire.side,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag) {
        return;
      }

      event.preventDefault();
      state.drag.pointer = getPointerPoint(canvas, event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag) {
        return;
      }

      const pointer = getPointerPoint(canvas, event);
      const drag = state.drag;
      const targetWires =
        drag.side === "left" ? state.rightWires : state.leftWires;
      const matchedWire = targetWires.find(
        (wire) =>
          wire.name === drag.from.name &&
          getDistance(pointer, wire) <= WIRE_DROP_RADIUS,
      );

      event.preventDefault();

      if (matchedWire) {
        state.completed[drag.from.name] = true;
        playAudio(connectedAudioRef.current);
      }

      state.drag = null;

      if (
        !state.hasCleared &&
        WIRE_COLORS.every((wire) => state.completed[wire.name])
      ) {
        state.hasCleared = true;
        dispatchClear();
      }
    };

    const render = () => {
      drawScene(
        context,
        stateRef.current,
        backgroundRef.current,
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    connectedAudioRef.current = new Audio(AMONG_US_SOUNDS.connected);
    openingAudioRef.current = new Audio(AMONG_US_SOUNDS.opening);
    playAudio(openingAudioRef.current);
    preloadImage(AMONG_US_BACKGROUND)
      .then((background) => {
        if (!isDisposed) {
          backgroundRef.current = background;
          stateRef.current = createInitialState(
            getBackgroundLayout(background, canvasWidth, canvasHeight),
          );
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("resize", resizeCanvas);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return canvasRef;
}
