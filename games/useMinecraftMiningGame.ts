"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { drawCenteredText } from "@/lib/canvasUtils";
import { bgmLibrary, type SoundEffectTrack } from "@/lib/bgmLibrary";

const MINE_DURATION_MS = 1050;
const DIG_TICK_INTERVAL_MS = 180;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const ORE_SIZE = 132;
const MAX_DELTA_MS = 50;
const MINECRAFT_DIG_SOUND_EFFECTS = {
  complete: "minecraftDig2",
  start: "minecraftDig1",
} satisfies Record<"complete" | "start", SoundEffectTrack>;

type OreType = "diamond" | "emerald" | "gold" | "iron" | "lapisLazuli";
type AssetKey =
  | "background"
  | "crack1"
  | "crack2"
  | "crack3"
  | "diamondOre"
  | "emeraldOre"
  | "goldOre"
  | "ironOre"
  | "lapisLazuliOre";

type Point = {
  x: number;
  y: number;
};

type Ore = Point & {
  progressMs: number;
  type: OreType;
};

type GameState = {
  digSoundAccumulatorMs: number;
  hasCleared: boolean;
  hasFailed: boolean;
  heldOreIndex: number | null;
  lastTimestamp: number | null;
  ores: Ore[];
};

const MINECRAFT_ASSETS = {
  background: "/games/minecraft/images/background.webp",
  crack1: "/games/minecraft/images/cracked-1.png",
  crack2: "/games/minecraft/images/cracked-2.png",
  crack3: "/games/minecraft/images/cracked-3.png",
  diamondOre: "/games/minecraft/images/diamond-ore.png",
  emeraldOre: "/games/minecraft/images/emerald-ore.png",
  goldOre: "/games/minecraft/images/gold-ore.png",
  ironOre: "/games/minecraft/images/iron-ore.png",
  lapisLazuliOre: "/games/minecraft/images/lapis-lazuli-ore.png",
} satisfies Record<AssetKey, string>;

const ORE_IMAGE_KEYS = {
  diamond: "diamondOre",
  emerald: "emeraldOre",
  gold: "goldOre",
  iron: "ironOre",
  lapisLazuli: "lapisLazuliOre",
} satisfies Record<OreType, AssetKey>;

const ORE_STYLES = {
  diamond: {
    color: "#22d3ee",
    glow: "#a5f3fc",
  },
  emerald: {
    color: "#22c55e",
    glow: "#bbf7d0",
  },
  gold: {
    color: "#facc15",
    glow: "#fef08a",
  },
  iron: {
    color: "#cbd5e1",
    glow: "#f8fafc",
  },
  lapisLazuli: {
    color: "#2563eb",
    glow: "#bfdbfe",
  },
} satisfies Record<OreType, { color: string; glow: string }>;
const DECOY_ORE_TYPES = ["emerald", "gold", "iron", "lapisLazuli"] as const;
const ORE_POSITION_RATIOS = [
  { x: 0.28, y: 0.5 },
  { x: 0.5, y: 0.44 },
  { x: 0.72, y: 0.5 },
] as const;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playMineSoundEffect(track: SoundEffectTrack) {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
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

function createInitialState(width: number, height: number) {
  const oreTypes = shuffle([
    "diamond",
    ...shuffle(DECOY_ORE_TYPES).slice(0, 2),
  ] satisfies OreType[]);

  return {
    digSoundAccumulatorMs: 0,
    hasCleared: false,
    hasFailed: false,
    heldOreIndex: null,
    lastTimestamp: null,
    ores: ORE_POSITION_RATIOS.map((position, index) => ({
      progressMs: 0,
      type: oreTypes[index],
      x: width * position.x,
      y: height * position.y,
    })),
  } satisfies GameState;
}

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function getOreAtPoint(ores: readonly Ore[], pointer: Point) {
  return ores.findIndex((ore) => {
    const halfSize = ORE_SIZE / 2;

    return (
      pointer.x >= ore.x - halfSize &&
      pointer.x <= ore.x + halfSize &&
      pointer.y >= ore.y - halfSize &&
      pointer.y <= ore.y + halfSize
    );
  });
}

function drawPixelBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  context.fillStyle = "#475569";
  context.fillRect(x, y, size, size);
  context.fillStyle = "#64748b";
  context.fillRect(x + 8, y + 8, size - 16, size - 16);
  context.fillStyle = "#334155";
  context.fillRect(x + size - 24, y + 8, 16, size - 16);
  context.fillRect(x + 8, y + size - 24, size - 16, 16);
  context.fillStyle = color;

  const gemSize = size * 0.2;
  [
    [0.22, 0.22],
    [0.58, 0.18],
    [0.4, 0.46],
    [0.7, 0.62],
    [0.2, 0.68],
  ].forEach(([xRatio, yRatio]) => {
    context.fillRect(x + size * xRatio, y + size * yRatio, gemSize, gemSize);
  });
}

function drawCracks(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  progress: number,
) {
  const crackCount = Math.floor(progress * 7);

  context.strokeStyle = "rgba(15, 23, 42, 0.88)";
  context.lineWidth = 4;

  Array.from({ length: crackCount }, (_, index) => {
    const startX = x + size * (0.22 + ((index * 0.17) % 0.58));
    const startY = y + size * (0.2 + ((index * 0.23) % 0.52));

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(startX + size * 0.12, startY + size * 0.1);
    context.lineTo(startX + size * 0.04, startY + size * 0.22);
    context.stroke();
  });
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

function getCrackAssetKey(progress: number) {
  if (progress < 0.25) {
    return null;
  }

  if (progress < 0.55) {
    return "crack1";
  }

  if (progress < 0.82) {
    return "crack2";
  }

  return "crack3";
}

function drawMiningInvertPulse(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  progress: number,
) {
  context.save();
  context.beginPath();
  context.rect(centerX - size / 2, centerY - size / 2, size, size);
  context.clip();
  context.globalCompositeOperation = "difference";

  for (let index = 0; index < 3; index += 1) {
    const phase = (progress * 3.3 + index * 0.34) % 1;
    const radius = size * (0.12 + phase * 0.76);
    const alpha = Math.max(0, 0.34 - phase * 0.22);

    context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    context.lineWidth = size * (0.08 - phase * 0.04);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: Partial<Record<AssetKey, HTMLImageElement>>,
  width: number,
  height: number,
) {
  const backgroundImage = images.background;

  if (isImageReady(backgroundImage)) {
    drawCoverImage(context, backgroundImage, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(0.48, "#334155");
    gradient.addColorStop(1, "#111827");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  drawCenteredText(context, "다이아몬드를 캐라!", width / 2, 70, 42, "#e0f2fe");

  state.ores.forEach((ore, index) => {
    const style = ORE_STYLES[ore.type];
    const progress = Math.min(ore.progressMs / MINE_DURATION_MS, 1);
    const blockX = ore.x - ORE_SIZE / 2;
    const blockY = ore.y - ORE_SIZE / 2;
    const isHeld = state.heldOreIndex === index;
    const oreImage = images[ORE_IMAGE_KEYS[ore.type]];
    const crackAssetKey = getCrackAssetKey(progress);
    const crackImage =
      crackAssetKey === null ? undefined : images[crackAssetKey];

    context.shadowColor = isHeld ? style.glow : "transparent";
    context.shadowBlur = isHeld ? 24 : 0;
    if (isImageReady(oreImage)) {
      context.drawImage(oreImage, blockX, blockY, ORE_SIZE, ORE_SIZE);
    } else {
      drawPixelBlock(context, blockX, blockY, ORE_SIZE, style.color);
    }
    context.shadowBlur = 0;
    if (isImageReady(crackImage)) {
      context.drawImage(crackImage, blockX, blockY, ORE_SIZE, ORE_SIZE);
    } else if (crackAssetKey !== null) {
      drawCracks(context, blockX, blockY, ORE_SIZE, progress);
    }

    if (isHeld) {
      drawMiningInvertPulse(context, ore.x, ore.y, ORE_SIZE, progress);
    }

    context.fillStyle = "#0f172a";
    context.fillRect(blockX, blockY + ORE_SIZE + 14, ORE_SIZE, 12);
    context.fillStyle = ore.type === "diamond" ? "#67e8f9" : "#94a3b8";
    context.fillRect(
      blockX,
      blockY + ORE_SIZE + 14,
      ORE_SIZE * progress,
      12,
    );
  });

  if (state.hasFailed) {
    drawCenteredText(context, "WRONG ORE", width / 2, height * 0.76, 44, "#fca5a5");
  }
}

export function useMinecraftMiningGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const stateRef = useRef<GameState>(
    createInitialState(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT),
  );

  useEffect(() => {
    const loadedImages = (Object.keys(MINECRAFT_ASSETS) as AssetKey[]).reduce<
      Partial<Record<AssetKey, HTMLImageElement>>
    >((nextImages, assetKey) => {
      const image = new Image();

      image.src = MINECRAFT_ASSETS[assetKey];
      return {
        ...nextImages,
        [assetKey]: image,
      };
    }, {});

    imagesRef.current = loadedImages;
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
      stateRef.current = createInitialState(canvasWidth, canvasHeight);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = stateRef.current;

      if (state.hasCleared || state.hasFailed) {
        return;
      }

      const oreIndex = getOreAtPoint(
        state.ores,
        getPointerPoint(canvas, event),
      );

      if (oreIndex < 0) {
        return;
      }

      event.preventDefault();
      state.heldOreIndex = oreIndex;
      state.digSoundAccumulatorMs = 0;
      playMineSoundEffect(MINECRAFT_DIG_SOUND_EFFECTS.start);
    };

    const stopMining = () => {
      const state = stateRef.current;

      if (state.heldOreIndex !== null) {
        state.ores[state.heldOreIndex].progressMs = 0;
      }

      state.digSoundAccumulatorMs = 0;
      state.heldOreIndex = null;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const deltaMs =
        state.lastTimestamp === null
          ? 0
          : Math.min(timestamp - state.lastTimestamp, MAX_DELTA_MS);

      state.lastTimestamp = timestamp;

      if (
        state.heldOreIndex !== null &&
        !state.hasCleared &&
        !state.hasFailed
      ) {
        const ore = state.ores[state.heldOreIndex];

        ore.progressMs += deltaMs;
        state.digSoundAccumulatorMs += deltaMs;

        if (state.digSoundAccumulatorMs >= DIG_TICK_INTERVAL_MS) {
          state.digSoundAccumulatorMs %= DIG_TICK_INTERVAL_MS;
          playMineSoundEffect(MINECRAFT_DIG_SOUND_EFFECTS.start);
        }

        if (ore.progressMs >= MINE_DURATION_MS) {
          playMineSoundEffect(MINECRAFT_DIG_SOUND_EFFECTS.complete);

          if (ore.type === "diamond") {
            state.hasCleared = true;
            dispatchClear();
          } else {
            state.hasFailed = true;
          }
          state.digSoundAccumulatorMs = 0;
          state.heldOreIndex = null;
        }
      }

      drawScene(context, state, imagesRef.current, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    window.addEventListener("pointerup", stopMining);
    window.addEventListener("pointercancel", stopMining);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      window.removeEventListener("pointerup", stopMining);
      window.removeEventListener("pointercancel", stopMining);
    };
  }, []);

  return canvasRef;
}
