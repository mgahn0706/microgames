"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

const RUMMIKUB_IMAGES = {
  background: "/games/rummikub/images/background.png",
  tile: "/games/rummikub/images/tile.png",
} as const;

const CANVAS_HEIGHT = 941;
const CANVAS_WIDTH = 1672;
const DEFAULT_BEAT_DURATION_MS = 500;
const DRAG_SCALE = 1.08;
const MAX_DELTA_MS = 48;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const RACK_Y = 744;
const TILE_HEIGHT = 128;
const TILE_WIDTH = 86;

const TILE_COLORS = {
  black: "#171717",
  blue: "#1669d8",
  orange: "#e98921",
  red: "#d92f28",
} as const;

const TILE_COLOR_KEYS = ["red", "orange", "blue", "black"] as const;
const MELD_POSITIONS = [
  { x: 606, y: 268 },
  { x: 704, y: 452 },
  { x: 794, y: 636 },
] as const;
const RACK_TILE_COUNT = 6;

type TileColor = keyof typeof TILE_COLORS;
type Tile = Readonly<{
  color: TileColor;
  number: number;
}>;
type RackTile = Tile &
  Readonly<{
    id: string;
  }>;
type MeldId = string;
type Meld = Readonly<{
  id: MeldId;
  label: string;
  tiles: readonly Tile[];
  x: number;
  y: number;
}>;
type RoundSetup = Readonly<{
  melds: readonly Meld[];
  rackTiles: readonly RackTile[];
}>;
type Point = Readonly<{
  x: number;
  y: number;
}>;
type Rect = Point &
  Readonly<{
    height: number;
    width: number;
  }>;
type DrawLayout = Readonly<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
type DragState = Readonly<{
  current: Point;
  offset: Point;
  pointerId: number;
  start: Point;
  tileId: string;
}>;
type PlacedTile = RackTile &
  Readonly<{
    meldId: MeldId;
  }>;
type GameState = {
  drag: DragState | null;
  elapsedMs: number;
  hasCleared: boolean;
  lastTimestamp: number | null;
  melds: readonly Meld[];
  placedAtMs: number | null;
  placedTile: PlacedTile | null;
  rackTiles: readonly RackTile[];
};
type RummikubImages = Record<keyof typeof RUMMIKUB_IMAGES, HTMLImageElement>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createImage(src: string) {
  const image = new Image();

  image.src = src;

  return image;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function shuffleItems<T>(items: readonly T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createRackTile(tile: Tile, index: number) {
  return {
    ...tile,
    id: `${tile.color}-${tile.number}-${index}`,
  } satisfies RackTile;
}

function createRandomTile() {
  return {
    color: getRandomItem(TILE_COLOR_KEYS),
    number: getRandomInt(1, 13),
  } satisfies Tile;
}

function createRandomGroupMeld(index: number) {
  const number = getRandomInt(1, 13);
  const colors = shuffleItems(TILE_COLOR_KEYS);
  const [firstColor, secondColor, thirdColor] = colors;
  const position = MELD_POSITIONS[index] ?? MELD_POSITIONS[0];

  return {
    id: `group-${index}`,
    label: "group",
    tiles: [firstColor, secondColor, thirdColor].map((color) => ({
      color: color ?? "red",
      number,
    })),
    x: position.x,
    y: position.y,
  } satisfies Meld;
}

function createRandomRunMeld(index: number) {
  const color = getRandomItem(TILE_COLOR_KEYS);
  const startNumber = getRandomInt(1, 10);
  const position = MELD_POSITIONS[index] ?? MELD_POSITIONS[0];

  return {
    id: `run-${index}`,
    label: "run",
    tiles: [startNumber, startNumber + 1, startNumber + 2].map((number) => ({
      color,
      number,
    })),
    x: position.x,
    y: position.y,
  } satisfies Meld;
}

function createRandomMeld(index: number) {
  return Math.random() < 0.5
    ? createRandomGroupMeld(index)
    : createRandomRunMeld(index);
}

function getAttachableTiles(meld: Meld) {
  return TILE_COLOR_KEYS.flatMap((color) =>
    Array.from({ length: 13 }, (_, index) => ({
      color,
      number: index + 1,
    })).filter((tile) => canAttach(tile, meld)),
  );
}

function canAttachToAnyMeld(tile: Tile, melds: readonly Meld[]) {
  return melds.some((meld) => canAttach(tile, meld));
}

function createDistractorTile(melds: readonly Meld[]) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const tile = createRandomTile();

    if (!canAttachToAnyMeld(tile, melds)) {
      return tile;
    }
  }

  return createRandomTile();
}

function createRoundSetup() {
  const melds = MELD_POSITIONS.map((_, index) => createRandomMeld(index));
  const solvableMeld =
    shuffleItems(melds).find((meld) => getAttachableTiles(meld).length > 0) ??
    melds[0];
  const solutionTile = getRandomItem(getAttachableTiles(solvableMeld));
  const rackTiles = shuffleItems([
    createRackTile(solutionTile, 0),
    ...Array.from({ length: RACK_TILE_COUNT - 1 }, (_, index) =>
      createRackTile(createDistractorTile(melds), index + 1),
    ),
  ]);

  return {
    melds,
    rackTiles,
  } satisfies RoundSetup;
}

function createInitialState() {
  const setup = createRoundSetup();

  return {
    drag: null,
    elapsedMs: 0,
    hasCleared: false,
    lastTimestamp: null,
    melds: setup.melds,
    placedAtMs: null,
    placedTile: null,
    rackTiles: setup.rackTiles,
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

function isPointInRect(point: Point, rect: Rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getRackTileRect(index: number) {
  return {
    height: TILE_HEIGHT,
    width: TILE_WIDTH,
    x: 512 + index * 106,
    y: RACK_Y,
  } satisfies Rect;
}

function getMeldTileRect(meld: Meld, index: number) {
  return {
    height: TILE_HEIGHT,
    width: TILE_WIDTH,
    x: meld.x + index * 92,
    y: meld.y,
  } satisfies Rect;
}

function getAttachSlotRect(meld: Meld) {
  return getMeldTileRect(meld, meld.tiles.length);
}

function getMeldWithPlacement(meld: Meld, placedTile: PlacedTile | null) {
  if (!placedTile || placedTile.meldId !== meld.id) {
    return meld.tiles;
  }

  return [...meld.tiles, placedTile];
}

function isValidGroup(tiles: readonly Tile[]) {
  if (tiles.length < 3 || tiles.length > 4) {
    return false;
  }

  const [firstTile] = tiles;

  if (!firstTile || tiles.some((tile) => tile.number !== firstTile.number)) {
    return false;
  }

  return new Set(tiles.map((tile) => tile.color)).size === tiles.length;
}

function isValidRun(tiles: readonly Tile[]) {
  if (tiles.length < 3) {
    return false;
  }

  const [firstTile] = tiles;

  if (!firstTile || tiles.some((tile) => tile.color !== firstTile.color)) {
    return false;
  }

  const sortedNumbers = [...tiles]
    .map((tile) => tile.number)
    .sort((first, second) => first - second);

  return sortedNumbers.every(
    (number, index) =>
      index === 0 || number === (sortedNumbers[index - 1] ?? 0) + 1,
  );
}

function isValidMeld(tiles: readonly Tile[]) {
  return isValidGroup(tiles) || isValidRun(tiles);
}

function canAttach(tile: Tile, meld: Meld) {
  return isValidMeld([...meld.tiles, tile]);
}

function getTileById(rackTiles: readonly RackTile[], tileId: string) {
  return rackTiles.find((tile) => tile.id === tileId) ?? null;
}

function getRackTileAtPoint(rackTiles: readonly RackTile[], point: Point) {
  const tileIndex = rackTiles.findIndex((_, index) =>
    isPointInRect(point, getRackTileRect(index)),
  );

  return tileIndex === -1 ? null : rackTiles[tileIndex] ?? null;
}

function getAttachMeldAtPoint(
  point: Point,
  tile: Tile,
  melds: readonly Meld[],
) {
  return (
    melds.find((meld) => {
      const slotRect = getAttachSlotRect(meld);
      const expandedSlot = {
        height: slotRect.height + 34,
        width: slotRect.width + 34,
        x: slotRect.x - 17,
        y: slotRect.y - 17,
      } satisfies Rect;

      return isPointInRect(point, expandedSlot) && canAttach(tile, meld);
    }) ?? null
  );
}

function playTilePlacedSound() {
  bgmLibrary.playSoundEffect("rummikubTilePlaced").catch((error: unknown) => {
    console.error(error);
  });
}

function handleDrop(state: GameState, point: Point) {
  const drag = state.drag;

  state.drag = null;

  if (!drag || state.hasCleared) {
    return;
  }

  const tile = getTileById(state.rackTiles, drag.tileId);

  if (!tile) {
    return;
  }

  const attachMeld = getAttachMeldAtPoint(point, tile, state.melds);

  if (!attachMeld) {
    return;
  }

  state.hasCleared = true;
  state.placedAtMs = state.elapsedMs;
  state.placedTile = {
    ...tile,
    meldId: attachMeld.id,
  };
  state.rackTiles = state.rackTiles.filter((rackTile) => rackTile.id !== tile.id);
  playTilePlacedSound();
  dispatchClear();
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement,
) {
  if (background.complete && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  context.fillStyle = "#071a35";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawTileBase(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Rect,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.shadowBlur = 15;
  context.shadowColor = "rgba(0, 0, 0, 0.34)";

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  } else {
    context.fillStyle = "#f5ebd0";
    context.beginPath();
    context.roundRect(rect.x, rect.y, rect.width, rect.height, 12);
    context.fill();
  }

  context.restore();
}

function drawTileNumber(
  context: CanvasRenderingContext2D,
  tile: Tile,
  rect: Rect,
) {
  const color = TILE_COLORS[tile.color];

  context.save();
  context.fillStyle = color;
  context.font = "700 50px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(tile.number), rect.x + rect.width / 2, rect.y + 42);
  context.fillStyle = color;
  context.beginPath();
  context.arc(rect.x + rect.width / 2, rect.y + 86, 10, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawTile(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tile: Tile,
  rect: Rect,
  alpha = 1,
) {
  drawTileBase(context, image, rect, alpha);
  drawTileNumber(context, tile, rect);
}

function drawAttachSlot(
  context: CanvasRenderingContext2D,
  meld: Meld,
  state: GameState,
) {
  const rect = getAttachSlotRect(meld);
  const draggedTile = state.drag
    ? getTileById(state.rackTiles, state.drag.tileId)
    : null;
  const isTarget = draggedTile ? canAttach(draggedTile, meld) : false;
  const isHover =
    isTarget && state.drag ? isPointInRect(state.drag.current, rect) : false;
  const pulse = 0.65 + Math.sin(state.elapsedMs * 0.012) * 0.22;

  context.save();
  context.globalAlpha = isTarget ? 0.9 : 0.34;
  context.strokeStyle = isHover
    ? "rgba(80, 255, 158, 0.98)"
    : `rgba(255, 215, 120, ${pulse})`;
  context.lineWidth = isHover ? 7 : 4;
  context.setLineDash([12, 10]);
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, 14);
  context.stroke();
  context.restore();
}

function drawPlacedSpark(
  context: CanvasRenderingContext2D,
  state: GameState,
  meld: Meld,
) {
  if (!state.placedTile || state.placedTile.meldId !== meld.id) {
    return;
  }

  const progress =
    state.placedAtMs === null
      ? 1
      : clamp((state.elapsedMs - state.placedAtMs) / 520, 0, 1);
  const rect = getAttachSlotRect(meld);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  context.save();
  context.globalAlpha = 1 - progress;
  context.strokeStyle = "rgba(76, 255, 144, 0.96)";
  context.lineWidth = 8;
  context.beginPath();
  context.arc(centerX, centerY, 36 + progress * 44, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.beginPath();
  context.arc(centerX, centerY, 8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawMelds(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  state.melds.forEach((meld) => {
    const tiles = getMeldWithPlacement(meld, state.placedTile);

    tiles.forEach((tile, index) => {
      drawTile(context, image, tile, getMeldTileRect(meld, index));
    });

    if (!state.hasCleared) {
      drawAttachSlot(context, meld, state);
    }

    drawPlacedSpark(context, state, meld);
  });
}

function drawRack(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  const draggingTileId = state.drag?.tileId ?? null;

  context.save();
  context.fillStyle = "rgba(4, 13, 29, 0.42)";
  context.beginPath();
  context.roundRect(478, RACK_Y - 24, 696, TILE_HEIGHT + 48, 20);
  context.fill();
  context.restore();

  state.rackTiles.forEach((tile, index) => {
    if (tile.id === draggingTileId) {
      return;
    }

    drawTile(context, image, tile, getRackTileRect(index));
  });
}

function drawDraggingTile(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: GameState,
) {
  if (!state.drag) {
    return;
  }

  const tile = getTileById(state.rackTiles, state.drag.tileId);

  if (!tile) {
    return;
  }

  const width = TILE_WIDTH * DRAG_SCALE;
  const height = TILE_HEIGHT * DRAG_SCALE;
  const rect = {
    height,
    width,
    x: state.drag.current.x - state.drag.offset.x * DRAG_SCALE,
    y: state.drag.current.y - state.drag.offset.y * DRAG_SCALE,
  } satisfies Rect;

  context.save();
  context.globalAlpha = 0.96;
  drawTile(context, image, tile, rect);
  context.restore();
}

function drawRoundTimer(context: CanvasRenderingContext2D, remainingRatio: number) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.2)";
  context.fillRect(510, 900, 652, 7);
  context.fillStyle = "rgba(84, 232, 141, 0.86)";
  context.fillRect(510, 900, 652 * remainingRatio, 7);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: RummikubImages,
  state: GameState,
  width: number,
  height: number,
  remainingRatio: number,
) {
  context.fillStyle = "#071a35";
  context.fillRect(0, 0, width, height);

  const layout = getDrawLayout(width, height);

  context.save();
  context.translate(layout.offsetX, layout.offsetY);
  context.scale(layout.scale, layout.scale);

  drawBackground(context, images.background);
  drawMelds(context, images.tile, state);
  drawRack(context, images.tile, state);
  drawDraggingTile(context, images.tile, state);
  drawRoundTimer(context, remainingRatio);

  context.restore();
}

export function useRummikubGameCanvas(gameBeatCount: number) {
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
      background: createImage(RUMMIKUB_IMAGES.background),
      tile: createImage(RUMMIKUB_IMAGES.tile),
    } satisfies RummikubImages;

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

      const point = getPointerPoint(canvas, event, layout);
      const tile = getRackTileAtPoint(state.rackTiles, point);

      if (!tile) {
        return;
      }

      const tileIndex = state.rackTiles.findIndex(
        (rackTile) => rackTile.id === tile.id,
      );
      const tileRect = getRackTileRect(tileIndex);

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      state.drag = {
        current: point,
        offset: {
          x: point.x - tileRect.x,
          y: point.y - tileRect.y,
        },
        pointerId: event.pointerId,
        start: point,
        tileId: tile.id,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      state.drag = {
        ...state.drag,
        current: getPointerPoint(canvas, event, layout),
      };
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const state = stateRef.current;

      if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      handleDrop(state, getPointerPoint(canvas, event, layout));
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
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerEnd);
    canvas.addEventListener("pointercancel", handlePointerEnd);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
