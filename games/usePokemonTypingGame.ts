"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { convertEnglishKeyboardInputToKorean } from "@/lib/hangulInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const POKEMON_ASSETS = {
  background: "/games/pokemon/images/pokedex-background.webp",
  blastoise: "/games/pokemon/images/blastoise.png",
  bulbasaur: "/games/pokemon/images/bulbasaur.png",
  butterfree: "/games/pokemon/images/butterfree.png",
  charizard: "/games/pokemon/images/charizard.png",
  charmander: "/games/pokemon/images/charmander.png",
  eevee: "/games/pokemon/images/eevee.png",
  magikarp: "/games/pokemon/images/magikarp.png",
  pikachu: "/games/pokemon/images/pikachu.png",
  snorlax: "/games/pokemon/images/snorlax.png",
  squirtle: "/games/pokemon/images/squirtle.png",
  venusaur: "/games/pokemon/images/venusaur.png",
} as const;
const POKEMON_OPTIONS = [
  {
    imageKey: "blastoise",
    name: "거북왕",
  },
  {
    imageKey: "bulbasaur",
    name: "이상해씨",
  },
  {
    imageKey: "butterfree",
    name: "버터플",
  },
  {
    imageKey: "charizard",
    name: "리자몽",
  },
  {
    imageKey: "charmander",
    name: "파이리",
  },
  {
    imageKey: "eevee",
    name: "이브이",
  },
  {
    imageKey: "magikarp",
    name: "잉어킹",
  },
  {
    imageKey: "pikachu",
    name: "피카츄",
  },
  {
    imageKey: "snorlax",
    name: "잠만보",
  },
  {
    imageKey: "squirtle",
    name: "꼬부기",
  },
  {
    imageKey: "venusaur",
    name: "이상해꽃",
  },
] as const;

type PokemonOption = (typeof POKEMON_OPTIONS)[number];
type LoadedImages = Record<keyof typeof POKEMON_ASSETS, HTMLImageElement>;

type PokemonGameInputHandlers = Readonly<{
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
}>;

function createTargetPokemon() {
  return POKEMON_OPTIONS[Math.floor(Math.random() * POKEMON_OPTIONS.length)];
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadPokemonImages() {
  const entries = await Promise.all(
    Object.entries(POKEMON_ASSETS).map(async ([key, src]) => {
      const image = await preloadImage(src);

      return [key, image] as const;
    }),
  );

  return Object.fromEntries(entries) as LoadedImages;
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
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function getCoverImageRect(
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
    scale,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
  };
}

function drawContainImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    x - drawWidth / 2,
    y - drawHeight / 2,
    drawWidth,
    drawHeight,
  );
}

function sanitizePokemonNameInput(value: string) {
  return value.replaceAll(/[^A-Za-z\uAC00-\uD7A3]/g, "");
}

function normalizePokemonNameInput(value: string) {
  const sanitizedValue = sanitizePokemonNameInput(value);

  if (/^[A-Za-z]+$/.test(sanitizedValue)) {
    return convertEnglishKeyboardInputToKorean(sanitizedValue);
  }

  return sanitizedValue.replaceAll(/[A-Za-z]/g, "");
}

function drawScene(
  context: CanvasRenderingContext2D,
  targetPokemon: PokemonOption,
  images: LoadedImages | null,
  width: number,
  height: number,
) {
  if (images) {
    drawCoverImage(context, images.background, width, height);
    const backgroundRect = getCoverImageRect(images.background, width, height);

    drawContainImage(
      context,
      images[targetPokemon.imageKey],
      backgroundRect.x + 542 * backgroundRect.scale,
      backgroundRect.y + 490 * backgroundRect.scale,
      360 * backgroundRect.scale,
      360 * backgroundRect.scale,
    );
  } else {
    context.fillStyle = "#dbeafe";
    context.fillRect(0, 0, width, height);
  }
}

export function usePokemonTypingGame(): Readonly<{
  canvasRef: RefObject<HTMLCanvasElement | null>;
  inputHandlers: PokemonGameInputHandlers;
  inputRef: RefObject<HTMLInputElement | null>;
  targetName: string;
  typedName: string;
}> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const hasClearedRef = useRef(false);
  const isComposingRef = useRef(false);
  const [targetPokemon] = useState(createTargetPokemon);
  const [typedName, setTypedName] = useState("");

  const updateTypedName = (value: string) => {
    const nextNormalizedTypedName = normalizePokemonNameInput(value);

    setTypedName(nextNormalizedTypedName);

    if (
      hasClearedRef.current ||
      nextNormalizedTypedName !== targetPokemon.name
    ) {
      return;
    }

    hasClearedRef.current = true;
    inputRef.current?.blur();
    dispatchClear();
  };
  const syncTypedNameFromInput = () => {
    const input = inputRef.current;

    if (input) {
      updateTypedName(input.value);
    }
  };

  const inputHandlers = {
    onChange: (event) => {
      const nextValue = event.currentTarget.value;

      if (isComposingRef.current) {
        return;
      }

      updateTypedName(nextValue);
    },
    onCompositionEnd: () => {
      isComposingRef.current = false;
      window.requestAnimationFrame(syncTypedNameFromInput);
    },
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
  } satisfies PokemonGameInputHandlers;

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

    const focusInput = () => {
      inputRef.current?.focus({ preventScroll: true });
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, MIN_CANVAS_WIDTH);
      canvasHeight = Math.max(bounds.height, MIN_CANVAS_HEIGHT);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasClearedRef.current) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Backspace" || event.key.length === 1) {
        focusInput();
      }
    };

    const render = () => {
      drawScene(
        context,
        targetPokemon,
        imagesRef.current,
        canvasWidth,
        canvasHeight,
      );
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    focusInput();
    preloadPokemonImages()
      .then((images) => {
        if (!isDisposed) {
          imagesRef.current = images;
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    canvas.addEventListener("pointerdown", focusInput);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", focusInput);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [targetPokemon]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return {
    canvasRef,
    inputHandlers,
    inputRef,
    targetName: targetPokemon.name,
    typedName,
  };
}
