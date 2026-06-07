"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const APPLE_GAME_ASSETS = {
  apple: "/games/apple-game/images/apple.png",
  background: "/games/apple-game/images/background.png",
  frame: "/games/apple-game/images/frame.png",
} as const;
const BOARD_COLUMNS = 10;
const BOARD_ROWS = 6;
const FRAME_HEIGHT = 468;
const FRAME_WIDTH = 717;
const INNER_BOARD = {
  height: 384,
  width: 642,
  x: 35,
  y: 41,
} as const;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const APPLE_HIT_SCALE = 0.96;
const SELECTION_PADDING_PX = 10;
const TARGET_SUM = 10;
const TARGET_PAIRS = [
  [1, 9],
  [2, 8],
  [3, 7],
  [4, 6],
  [5, 5],
] as const;

type AssetKey = keyof typeof APPLE_GAME_ASSETS;

type Point = {
  x: number;
  y: number;
};

type ApplePosition = Readonly<{
  column: number;
  row: number;
}>;

type AppleCell = Readonly<{
  column: number;
  id: string;
  row: number;
  value: number;
}>;

type SelectionRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type DragState = Readonly<{
  current: Point;
  start: Point;
}>;

type GameState = {
  apples: AppleCell[];
  drag: DragState | null;
  hasCleared: boolean;
};

type BoardLayout = Readonly<{
  frameHeight: number;
  frameWidth: number;
  frameX: number;
  frameY: number;
  height: number;
  width: number;
  x: number;
  y: number;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomValue(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getGuaranteedPairPositions() {
  const row = getRandomValue(0, BOARD_ROWS - 1);
  const column = getRandomValue(0, BOARD_COLUMNS - 2);

  return [
    { column, row },
    { column: column + 1, row },
  ] satisfies [ApplePosition, ApplePosition];
}

function createInitialApples() {
  const pair = TARGET_PAIRS[getRandomValue(0, TARGET_PAIRS.length - 1)];
  const [firstTarget, secondTarget] = getGuaranteedPairPositions();
  const shouldFlipPair = Math.random() > 0.5;
  const firstValue = shouldFlipPair ? pair[1] : pair[0];
  const secondValue = shouldFlipPair ? pair[0] : pair[1];

  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      const isTargetFirst =
        row === firstTarget.row && column === firstTarget.column;
      const isTargetSecond =
        row === secondTarget.row && column === secondTarget.column;
      const value = isTargetFirst
        ? firstValue
        : isTargetSecond
          ? secondValue
          : getRandomValue(1, 9);

      return {
        column,
        id: `${column}-${row}`,
        row,
        value,
      } satisfies AppleCell;
    }),
  ).flat();
}

function createInitialState() {
  return {
    apples: createInitialApples(),
    drag: null,
    hasCleared: false,
  } satisfies GameState;
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadAppleGameImages() {
  const entries = await Promise.all(
    Object.entries(APPLE_GAME_ASSETS).map(async ([key, src]) => {
      const image = await preloadImage(src);

      return [key, image] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<AssetKey, HTMLImageElement>;
}

function isImageReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function getBoardLayout(width: number, height: number) {
  const frameScale = Math.min(
    (width * 0.94) / FRAME_WIDTH,
    (height * 0.88) / FRAME_HEIGHT,
  );
  const frameWidth = FRAME_WIDTH * frameScale;
  const frameHeight = FRAME_HEIGHT * frameScale;
  const frameX = (width - frameWidth) / 2;
  const frameY = (height - frameHeight) / 2 + height * 0.03;

  return {
    frameHeight,
    frameWidth,
    frameX,
    frameY,
    height: INNER_BOARD.height * frameScale,
    width: INNER_BOARD.width * frameScale,
    x: frameX + INNER_BOARD.x * frameScale,
    y: frameY + INNER_BOARD.y * frameScale,
  } satisfies BoardLayout;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function getSelectionRect(drag: DragState) {
  const x = Math.min(drag.start.x, drag.current.x);
  const y = Math.min(drag.start.y, drag.current.y);

  return {
    height: Math.abs(drag.current.y - drag.start.y),
    width: Math.abs(drag.current.x - drag.start.x),
    x,
    y,
  } satisfies SelectionRect;
}

function getAppleCenter(apple: AppleCell, layout: BoardLayout) {
  const cellWidth = layout.width / BOARD_COLUMNS;
  const cellHeight = layout.height / BOARD_ROWS;

  return {
    x: layout.x + cellWidth * (apple.column + 0.5),
    y: layout.y + cellHeight * (apple.row + 0.5),
  } satisfies Point;
}

function getAppleHitRect(apple: AppleCell, layout: BoardLayout) {
  const cellWidth = layout.width / BOARD_COLUMNS;
  const cellHeight = layout.height / BOARD_ROWS;
  const size = Math.min(cellWidth, cellHeight) * APPLE_HIT_SCALE;
  const center = getAppleCenter(apple, layout);

  return {
    height: size,
    width: size,
    x: center.x - size / 2,
    y: center.y - size / 2,
  } satisfies SelectionRect;
}

function getPaddedSelectionRect(rect: SelectionRect) {
  return {
    height: rect.height + SELECTION_PADDING_PX * 2,
    width: rect.width + SELECTION_PADDING_PX * 2,
    x: rect.x - SELECTION_PADDING_PX,
    y: rect.y - SELECTION_PADDING_PX,
  } satisfies SelectionRect;
}

function doRectsIntersect(first: SelectionRect, second: SelectionRect) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function getSelectedApples(
  apples: readonly AppleCell[],
  rect: SelectionRect,
  layout: BoardLayout,
) {
  const paddedRect = getPaddedSelectionRect(rect);

  return apples.filter((apple) => {
    const appleHitRect = getAppleHitRect(apple, layout);

    return doRectsIntersect(appleHitRect, paddedRect);
  });
}

function getAppleSum(apples: readonly AppleCell[]) {
  return apples.reduce((sum, apple) => sum + apple.value, 0);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  layout: BoardLayout,
  width: number,
  height: number,
) {
  context.fillStyle = "#d9f7d0";
  context.fillRect(0, 0, width, height);

  if (isImageReady(images.background)) {
    context.drawImage(
      images.background,
      layout.x,
      layout.y,
      layout.width,
      layout.height,
    );
  }
}

function drawApple(
  context: CanvasRenderingContext2D,
  apple: AppleCell,
  image: HTMLImageElement | undefined,
  layout: BoardLayout,
  isSelected: boolean,
) {
  const cellWidth = layout.width / BOARD_COLUMNS;
  const cellHeight = layout.height / BOARD_ROWS;
  const size = Math.min(cellWidth, cellHeight) * 0.82;
  const center = getAppleCenter(apple, layout);
  const x = center.x - size / 2;
  const y = center.y - size / 2;

  if (isSelected) {
    context.fillStyle = "rgba(250, 204, 21, 0.42)";
    context.beginPath();
    context.roundRect(x - 4, y - 4, size + 8, size + 8, size * 0.18);
    context.fill();
  }

  if (isImageReady(image)) {
    context.drawImage(image, x, y, size, size);
  } else {
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(center.x, center.y, size / 2, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#fff";
  context.font = `700 ${Math.floor(size * 0.46)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(apple.value), center.x, center.y + size * 0.05);
}

function drawSelection(
  context: CanvasRenderingContext2D,
  rect: SelectionRect,
  isTargetSum: boolean,
) {
  const color = isTargetSum ? "239, 68, 68" : "34, 197, 94";

  context.fillStyle = `rgba(${color}, 0.14)`;
  context.strokeStyle = `rgba(${color}, 0.88)`;
  context.lineWidth = 3;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawFrame(
  context: CanvasRenderingContext2D,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  layout: BoardLayout,
) {
  if (!isImageReady(images.frame)) {
    context.strokeStyle = "#16a34a";
    context.lineWidth = 12;
    context.strokeRect(
      layout.x - 16,
      layout.y - 16,
      layout.width + 32,
      layout.height + 32,
    );
    return;
  }

  context.drawImage(
    images.frame,
    layout.frameX,
    layout.frameY,
    layout.frameWidth,
    layout.frameHeight,
  );
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  width: number,
  height: number,
) {
  const layout = getBoardLayout(width, height);
  const selectionRect = state.drag ? getSelectionRect(state.drag) : null;
  const selectedApples = selectionRect
    ? getSelectedApples(state.apples, selectionRect, layout)
    : [];
  const selectedSum = getAppleSum(selectedApples);
  const selectedIds = new Set(selectedApples.map(({ id }) => id));

  drawBackground(context, images, layout, width, height);
  state.apples.forEach((apple) => {
    drawApple(context, apple, images.apple, layout, selectedIds.has(apple.id));
  });

  if (selectionRect) {
    drawSelection(context, selectionRect, selectedSum === TARGET_SUM);
  }

  drawFrame(context, images, layout);
}

export function useAppleGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
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
    let canvasHeight = MIN_CANVAS_HEIGHT;
    let canvasWidth = MIN_CANVAS_WIDTH;
    let isDisposed = false;
    const pixelRatio = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (stateRef.current.hasCleared) {
        return;
      }

      const pointer = getPointerPoint(canvas, event);

      event.preventDefault();
      stateRef.current.drag = {
        current: pointer,
        start: pointer,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.hasCleared) {
        return;
      }

      event.preventDefault();
      state.drag = {
        ...state.drag,
        current: getPointerPoint(canvas, event),
      };
    };

    const resolveSelection = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.hasCleared) {
        return;
      }

      const layout = getBoardLayout(canvasWidth, canvasHeight);
      const drag = {
        ...state.drag,
        current: getPointerPoint(canvas, event),
      };
      const selectionRect = getSelectionRect(drag);
      const selectedApples = getSelectedApples(
        state.apples,
        selectionRect,
        layout,
      );
      const selectedSum = getAppleSum(selectedApples);

      event.preventDefault();

      if (selectedApples.length > 0 && selectedSum === TARGET_SUM) {
        state.hasCleared = true;
        state.apples = state.apples.filter(
          (apple) =>
            !selectedApples.some((selected) => selected.id === apple.id),
        );
        state.drag = null;
        window.setTimeout(dispatchClear, 140);
        return;
      }

      state.drag = null;
    };

    const render = () => {
      drawScene(
        context,
        stateRef.current,
        imagesRef.current,
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    stateRef.current = createInitialState();
    resizeCanvas();
    preloadAppleGameImages()
      .then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", resolveSelection);
    window.addEventListener("pointercancel", resolveSelection);
    window.addEventListener("resize", resizeCanvas);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", resolveSelection);
      window.removeEventListener("pointercancel", resolveSelection);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return canvasRef;
}
