"use client";

import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const POKEMON_ASSETS = {
  background: "/games/pokemon/images/pokedex-background.png",
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

const ENGLISH_TO_DUBEOLSI_CONSONANTS = {
  E: "ㄸ",
  Q: "ㅃ",
  R: "ㄲ",
  T: "ㅆ",
  W: "ㅉ",
  a: "ㅁ",
  b: "ㅠ",
  c: "ㅊ",
  d: "ㅇ",
  e: "ㄷ",
  f: "ㄹ",
  g: "ㅎ",
  q: "ㅂ",
  r: "ㄱ",
  s: "ㄴ",
  t: "ㅅ",
  v: "ㅍ",
  w: "ㅈ",
  x: "ㅌ",
  z: "ㅋ",
} as const;
const ENGLISH_TO_DUBEOLSI_VOWELS = {
  O: "ㅒ",
  P: "ㅖ",
  h: "ㅗ",
  i: "ㅑ",
  j: "ㅓ",
  k: "ㅏ",
  l: "ㅣ",
  n: "ㅜ",
  o: "ㅐ",
  p: "ㅔ",
  u: "ㅕ",
  y: "ㅛ",
} as const;
const COMPAT_CONSONANT_TO_INITIAL_INDEX = {
  ㄱ: 0,
  ㄲ: 1,
  ㄴ: 2,
  ㄷ: 3,
  ㄸ: 4,
  ㄹ: 5,
  ㅁ: 6,
  ㅂ: 7,
  ㅃ: 8,
  ㅅ: 9,
  ㅆ: 10,
  ㅇ: 11,
  ㅈ: 12,
  ㅉ: 13,
  ㅊ: 14,
  ㅋ: 15,
  ㅌ: 16,
  ㅍ: 17,
  ㅎ: 18,
} as const;
const COMPAT_VOWEL_TO_MEDIAL_INDEX = {
  ㅏ: 0,
  ㅐ: 1,
  ㅑ: 2,
  ㅒ: 3,
  ㅓ: 4,
  ㅔ: 5,
  ㅕ: 6,
  ㅖ: 7,
  ㅗ: 8,
  ㅘ: 9,
  ㅙ: 10,
  ㅚ: 11,
  ㅛ: 12,
  ㅜ: 13,
  ㅝ: 14,
  ㅞ: 15,
  ㅟ: 16,
  ㅠ: 17,
  ㅡ: 18,
  ㅢ: 19,
  ㅣ: 20,
} as const;
const COMPAT_CONSONANT_TO_FINAL_INDEX = {
  ㄱ: 1,
  ㄲ: 2,
  ㄳ: 3,
  ㄴ: 4,
  ㄵ: 5,
  ㄶ: 6,
  ㄷ: 7,
  ㄹ: 8,
  ㄺ: 9,
  ㄻ: 10,
  ㄼ: 11,
  ㄽ: 12,
  ㄾ: 13,
  ㄿ: 14,
  ㅀ: 15,
  ㅁ: 16,
  ㅂ: 17,
  ㅄ: 18,
  ㅅ: 19,
  ㅆ: 20,
  ㅇ: 21,
  ㅈ: 22,
  ㅊ: 23,
  ㅋ: 24,
  ㅌ: 25,
  ㅍ: 26,
  ㅎ: 27,
} as const;
const COMPOUND_FINALS = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
} as const;
const SPLIT_COMPOUND_FINALS = {
  ㄳ: ["ㄱ", "ㅅ"],
  ㄵ: ["ㄴ", "ㅈ"],
  ㄶ: ["ㄴ", "ㅎ"],
  ㄺ: ["ㄹ", "ㄱ"],
  ㄻ: ["ㄹ", "ㅁ"],
  ㄼ: ["ㄹ", "ㅂ"],
  ㄽ: ["ㄹ", "ㅅ"],
  ㄾ: ["ㄹ", "ㅌ"],
  ㄿ: ["ㄹ", "ㅍ"],
  ㅀ: ["ㄹ", "ㅎ"],
  ㅄ: ["ㅂ", "ㅅ"],
} as const;
const COMPOUND_VOWELS = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
} as const;

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

function isInitialConsonant(value: string) {
  return value in COMPAT_CONSONANT_TO_INITIAL_INDEX;
}

function isMedialVowel(value: string) {
  return value in COMPAT_VOWEL_TO_MEDIAL_INDEX;
}

function isFinalConsonant(value: string) {
  return value in COMPAT_CONSONANT_TO_FINAL_INDEX;
}

function composeHangulSyllable(
  initial: string,
  medial: string,
  final = "",
) {
  const initialIndex =
    COMPAT_CONSONANT_TO_INITIAL_INDEX[
      initial as keyof typeof COMPAT_CONSONANT_TO_INITIAL_INDEX
    ];
  const medialIndex =
    COMPAT_VOWEL_TO_MEDIAL_INDEX[
      medial as keyof typeof COMPAT_VOWEL_TO_MEDIAL_INDEX
    ];
  const finalIndex = final
    ? COMPAT_CONSONANT_TO_FINAL_INDEX[
        final as keyof typeof COMPAT_CONSONANT_TO_FINAL_INDEX
      ]
    : 0;

  if (
    initialIndex === undefined ||
    medialIndex === undefined ||
    finalIndex === undefined
  ) {
    return `${initial}${medial}${final}`;
  }

  return String.fromCharCode(
    0xac00 + (initialIndex * 21 + medialIndex) * 28 + finalIndex,
  );
}

function combineVowels(first: string, second: string) {
  return COMPOUND_VOWELS[
    `${first}${second}` as keyof typeof COMPOUND_VOWELS
  ];
}

function combineFinals(first: string, second: string) {
  return COMPOUND_FINALS[
    `${first}${second}` as keyof typeof COMPOUND_FINALS
  ];
}

function mapEnglishToDubeolsi(value: string) {
  return value
    .split("")
    .map(
      (character) =>
        ENGLISH_TO_DUBEOLSI_CONSONANTS[
          character as keyof typeof ENGLISH_TO_DUBEOLSI_CONSONANTS
        ] ??
        ENGLISH_TO_DUBEOLSI_VOWELS[
          character as keyof typeof ENGLISH_TO_DUBEOLSI_VOWELS
        ] ??
        ENGLISH_TO_DUBEOLSI_CONSONANTS[
          character.toLowerCase() as keyof typeof ENGLISH_TO_DUBEOLSI_CONSONANTS
        ] ??
        ENGLISH_TO_DUBEOLSI_VOWELS[
          character.toLowerCase() as keyof typeof ENGLISH_TO_DUBEOLSI_VOWELS
        ] ??
        character,
    );
}

function composeJamo(jamo: readonly string[]) {
  const output: string[] = [];
  let index = 0;

  while (index < jamo.length) {
    const initial = jamo[index];
    const next = jamo[index + 1];

    if (!isInitialConsonant(initial) || !next || !isMedialVowel(next)) {
      output.push(initial);
      index += 1;
      continue;
    }

    let medial = next;
    let cursor = index + 2;
    const combinedMedial = jamo[cursor]
      ? combineVowels(medial, jamo[cursor])
      : undefined;

    if (combinedMedial) {
      medial = combinedMedial;
      cursor += 1;
    }

    let final = "";
    const finalCandidate = jamo[cursor];

    if (finalCandidate && isFinalConsonant(finalCandidate)) {
      const following = jamo[cursor + 1];

      if (following && isMedialVowel(following)) {
        output.push(composeHangulSyllable(initial, medial));
        index = cursor;
        continue;
      }

      const compoundFinal = jamo[cursor + 1]
        ? combineFinals(finalCandidate, jamo[cursor + 1])
        : undefined;

      if (compoundFinal) {
        const afterCompound = jamo[cursor + 2];

        if (afterCompound && isMedialVowel(afterCompound)) {
          const splitFinal =
            SPLIT_COMPOUND_FINALS[
              compoundFinal as keyof typeof SPLIT_COMPOUND_FINALS
            ];

          output.push(composeHangulSyllable(initial, medial, splitFinal[0]));
          index = cursor + 1;
          continue;
        }

        final = compoundFinal;
        cursor += 2;
      } else {
        final = finalCandidate;
        cursor += 1;
      }
    }

    output.push(composeHangulSyllable(initial, medial, final));
    index = cursor;
  }

  return output.join("");
}

function convertEnglishKeyboardInputToKorean(value: string) {
  return composeJamo(mapEnglishToDubeolsi(value));
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
