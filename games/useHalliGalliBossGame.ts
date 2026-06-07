"use client";

import { useEffect, useRef } from "react";
import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 640;
const TURN_BEATS = 4;
const ROUND_END_SAFETY_MS = 32;
const PLAYER_COUNT = 4;
const FRUITS = ["banana", "lime", "plum", "strawberry"] as const;
const COUNTS = [1, 2, 3, 4, 5] as const;
const HALLI_GALLI_ASSETS = {
  background: "/games/halli-galli/images/background.png",
  bell: "/games/halli-galli/images/bell.png",
} as const;
const HALLI_GALLI_SOUNDS = {
  bell: "/games/halli-galli/sounds/bell-chime.mp3",
  card: "/games/halli-galli/sounds/card-draw.mp3",
} as const;

type Fruit = (typeof FRUITS)[number];
type Count = (typeof COUNTS)[number];

type Point = Readonly<{
  x: number;
  y: number;
}>;

type Card = Readonly<{
  count: Count;
  fruit: Fruit;
  imageSrc: string;
}>;

type Turn = Readonly<{
  cards: readonly Card[];
  changedPlayerIndex: number | null;
  hasFive: boolean;
}>;

type BackgroundLayout = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

type LoadedImages = Readonly<{
  background: HTMLImageElement;
  bell: HTMLImageElement;
  cards: Readonly<Record<string, HTMLImageElement>>;
}>;

type GameState = {
  bellPulseUntil: number;
  hasClickedBell: boolean;
  hasResolved: boolean;
  startTimestamp: number | null;
  turnIndex: number;
  turns: readonly Turn[];
};

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getBeatDurationMs(canvas: HTMLCanvasElement) {
  const rawDuration = window
    .getComputedStyle(canvas)
    .getPropertyValue("--game-rhythm-duration")
    .trim();
  const parsedDuration = Number.parseFloat(rawDuration);

  return Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : RHYTHM_DURATION_MS;
}

function getTurnDurationMs(beatDurationMs: number) {
  return TURN_BEATS * beatDurationMs;
}

function getCardImageSrc(card: Pick<Card, "count" | "fruit">) {
  return `/games/halli-galli/images/${card.fruit}_${card.count}.png`;
}

function createCard(fruit: Fruit, count: Count) {
  return {
    count,
    fruit,
    imageSrc: getCardImageSrc({ count, fruit }),
  } satisfies Card;
}

function getRandomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function createRandomCard() {
  return createCard(getRandomItem(FRUITS), getRandomItem(COUNTS));
}

function createCardDeck() {
  return FRUITS.flatMap((fruit) =>
    COUNTS.map((count) => createCard(fruit, count)),
  );
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

function hasFruitSumFive(cards: readonly Card[]) {
  const fruitCounts = cards.reduce(
    (counts, card) => ({
      ...counts,
      [card.fruit]: counts[card.fruit] + card.count,
    }),
    {
      banana: 0,
      lime: 0,
      plum: 0,
      strawberry: 0,
    } satisfies Record<Fruit, number>,
  );

  return Object.values(fruitCounts).some((count) => count === 5);
}

function createsFruitSumFive(
  previousCards: readonly Card[],
  nextCards: readonly Card[],
) {
  return !hasFruitSumFive(previousCards) && hasFruitSumFive(nextCards);
}

function createSafeCards() {
  return shuffle(FRUITS).map((fruit) => createCard(fruit, 1));
}

function createInitialTurn(shouldCreateFive: boolean) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const cards = [
      createRandomCard(),
      createRandomCard(),
      createRandomCard(),
      createRandomCard(),
    ];

    if (hasFruitSumFive(cards) === shouldCreateFive) {
      return {
        cards,
        changedPlayerIndex: null,
        hasFive: shouldCreateFive,
      } satisfies Turn;
    }
  }

  const cards = createSafeCards();

  return {
    cards,
    changedPlayerIndex: null,
    hasFive: false,
  } satisfies Turn;
}

function createNextTurn(
  previousCards: readonly Card[],
  shouldCreateFive: boolean,
  preferredChangedPlayerIndex: number,
) {
  const baseCards = hasFruitSumFive(previousCards)
    ? createSafeCards()
    : previousCards;
  const playerIndexes = [
    preferredChangedPlayerIndex,
    ...shuffle(
      Array.from({ length: PLAYER_COUNT }, (_, index) => index).filter(
        (index) => index !== preferredChangedPlayerIndex,
      ),
    ),
  ];
  const deck = createCardDeck();

  for (const changedPlayerIndex of playerIndexes) {
    const candidateCards = shuffle(deck).filter((card) => {
      return card.imageSrc !== baseCards[changedPlayerIndex]?.imageSrc;
    });

    for (const candidateCard of candidateCards) {
      const cards = baseCards.map((card, index) => {
        return index === changedPlayerIndex ? candidateCard : card;
      });
      const isBellMoment = createsFruitSumFive(baseCards, cards);

      if (isBellMoment === shouldCreateFive) {
        return {
          cards,
          changedPlayerIndex,
          hasFive: shouldCreateFive,
        } satisfies Turn;
      }
    }
  }

  return createInitialTurn(shouldCreateFive);
}

function createTurns(turnCount: number) {
  const targetPattern = Array.from(
    { length: Math.max(turnCount - 2, 0) },
    (_, index) => {
      return index % 2 === 0;
    },
  );
  const playerOffset = Math.floor(Math.random() * PLAYER_COUNT);
  const shouldCreateFivePattern =
    turnCount <= 2
      ? Array.from({ length: turnCount }, () => false)
      : [false, ...shuffle(targetPattern), false];

  return shouldCreateFivePattern.reduce<readonly Turn[]>(
    (turns, shouldCreateFive, index) => {
      if (turns.length === 0) {
        return [createInitialTurn(false)];
      }

      const previousTurn = turns[turns.length - 1];
      const changedPlayerIndex = (playerOffset + index - 1) % PLAYER_COUNT;

      return [
        ...turns,
        createNextTurn(
          previousTurn.cards,
          shouldCreateFive,
          changedPlayerIndex,
        ),
      ];
    },
    [],
  );
}

function rebuildTurnsAfterBell(
  turns: readonly Turn[],
  currentTurnIndex: number,
) {
  const resetTurn = {
    cards: createSafeCards(),
    changedPlayerIndex: null,
    hasFive: false,
  } satisfies Turn;
  const previousTurns = turns.slice(0, currentTurnIndex);
  const rebuiltTurns = turns
    .slice(currentTurnIndex + 1)
    .reduce<readonly Turn[]>(
      (nextTurns, turn, index) => {
        const previousTurn = nextTurns[nextTurns.length - 1];
        const changedPlayerIndex =
          turn.changedPlayerIndex ?? (currentTurnIndex + index) % PLAYER_COUNT;

        return [
          ...nextTurns,
          createNextTurn(previousTurn.cards, turn.hasFive, changedPlayerIndex),
        ];
      },
      [resetTurn],
    );

  return [...previousTurns, ...rebuiltTurns];
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload ${src}`));
    image.src = src;
  });
}

async function preloadHalliGalliImages() {
  const cardEntries = FRUITS.flatMap((fruit) =>
    COUNTS.map((count) => {
      const imageSrc = getCardImageSrc({ count, fruit });

      return [imageSrc, imageSrc] as const;
    }),
  );
  const [background, bell, cardImages] = await Promise.all([
    preloadImage(HALLI_GALLI_ASSETS.background),
    preloadImage(HALLI_GALLI_ASSETS.bell),
    Promise.all(
      cardEntries.map(async ([key, imageSrc]) => {
        return [key, await preloadImage(imageSrc)] as const;
      }),
    ),
  ]);

  return {
    background,
    bell,
    cards: Object.fromEntries(cardImages),
  } satisfies LoadedImages;
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
    // The first playback may be blocked before a trusted user gesture.
  });
}

function getCoverLayout(
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

function getPointerPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  } satisfies Point;
}

function getBellLayout(width: number, height: number) {
  const size = Math.min(width, height) * 0.24;

  return {
    radius: size * 0.42,
    size,
    x: width / 2,
    y: height / 2,
  };
}

function isInsideBell(point: Point, width: number, height: number) {
  const bell = getBellLayout(width, height);

  return Math.hypot(point.x - bell.x, point.y - bell.y) <= bell.radius;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  background: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!background) {
    context.fillStyle = "#d2a76b";
    context.fillRect(0, 0, width, height);
    return;
  }

  const layout = getCoverLayout(background, width, height);

  context.drawImage(
    background,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
  );
}

function drawCard(
  context: CanvasRenderingContext2D,
  card: Card,
  image: HTMLImageElement | undefined,
  point: Point,
  width: number,
  angle: number,
  scale: number,
  isChanged: boolean,
  playerIndex: number,
) {
  const cardWidth = width * scale;
  const cardHeight = cardWidth * 1.4;

  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.shadowBlur = isChanged ? 32 : 20;
  context.shadowColor = isChanged
    ? "rgba(250,204,21,0.58)"
    : "rgba(38,20,7,0.36)";
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
  context.strokeStyle = isChanged ? "#facc15" : "rgba(58,30,13,0.42)";
  context.lineWidth = isChanged ? 5 : 3;
  context.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);

  if (image) {
    context.drawImage(
      image,
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
    );
  } else {
    context.fillStyle = "#422006";
    context.font = `900 ${Math.max(24, cardWidth * 0.18)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(card.fruit, 0, -cardHeight * 0.08);
    context.fillText(`${card.count}`, 0, cardHeight * 0.18);
  }

  context.font = "900 18px Arial, Helvetica, sans-serif";
  context.fillStyle = "rgba(58,30,13,0.78)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`P${playerIndex + 1}`, 0, cardHeight / 2 + 22);
  context.restore();
}

function drawBell(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number,
  height: number,
  pulseScale: number,
) {
  if (!image) {
    return;
  }

  const bell = getBellLayout(width, height);
  const drawSize = bell.size * pulseScale;

  context.save();
  context.translate(bell.x, bell.y);
  context.shadowBlur = 30;
  context.shadowColor = "rgba(250,204,21,0.48)";
  context.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  context.restore();
}

function drawTurnCounter(
  context: CanvasRenderingContext2D,
  turnIndex: number,
  turnCount: number,
  width: number,
) {
  context.save();
  context.font = "900 24px Arial, Helvetica, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.shadowBlur = 10;
  context.shadowColor = "rgba(0,0,0,0.55)";
  context.fillText(
    `${Math.min(turnIndex + 1, turnCount)} / ${turnCount}`,
    width / 2,
    24,
  );
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImages | null,
  state: GameState,
  width: number,
  height: number,
  timestamp: number,
  turnDurationMs: number,
) {
  drawBackground(context, images?.background ?? null, width, height);

  const turn = state.turns[state.turnIndex];
  const elapsedInTurn =
    state.startTimestamp === null
      ? 0
      : Math.max(timestamp - state.startTimestamp, 0) % turnDurationMs;
  const popProgress = Math.max(0, 1 - elapsedInTurn / 260);
  const cardPositions = [
    { angle: -0.12, x: width * 0.24, y: height * 0.27 },
    { angle: 0.11, x: width * 0.76, y: height * 0.27 },
    { angle: 0.13, x: width * 0.24, y: height * 0.73 },
    { angle: -0.1, x: width * 0.76, y: height * 0.73 },
  ] as const;

  if (turn) {
    turn.cards.forEach((card, index) => {
      const position = cardPositions[index];
      const isChanged =
        turn.changedPlayerIndex === null || turn.changedPlayerIndex === index;
      const cardScale = 0.2 + (isChanged ? popProgress * 0.024 : 0);

      drawCard(
        context,
        card,
        images?.cards[card.imageSrc],
        position,
        Math.min(width, height),
        position.angle,
        cardScale,
        isChanged,
        index,
      );
    });
  }

  const pulseProgress = Math.max(0, state.bellPulseUntil - timestamp) / 260;
  const pulseScale = 1 + pulseProgress * 0.18;

  drawBell(context, images?.bell ?? null, width, height, pulseScale);
  drawTurnCounter(context, state.turnIndex, state.turns.length, width);
}

export function useHalliGalliBossGameCanvas(gameBeatCount: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedImages | null>(null);
  const frameRef = useRef<number | null>(null);
  const cardAudioRef = useRef<HTMLAudioElement | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<GameState>({
    bellPulseUntil: 0,
    hasClickedBell: false,
    hasResolved: false,
    startTimestamp: null,
    turnIndex: -1,
    turns: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const beatDurationMs = getBeatDurationMs(canvas);
    const turnDurationMs = getTurnDurationMs(beatDurationMs);
    const roundDurationMs = gameBeatCount * beatDurationMs;
    const turnCount = Math.max(
      1,
      Math.ceil(roundDurationMs / turnDurationMs),
    );

    stateRef.current = {
      ...stateRef.current,
      turns: createTurns(turnCount),
    };
    cardAudioRef.current = createAudio(HALLI_GALLI_SOUNDS.card);
    bellAudioRef.current = createAudio(HALLI_GALLI_SOUNDS.bell);

    const resizeCanvas = () => {
      const width = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
      const height = Math.max(window.innerHeight, MIN_CANVAS_HEIGHT);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resolveFailure = () => {
      if (stateRef.current.hasResolved) {
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        hasResolved: true,
      };
      dispatchFailure();
    };

    const resolveClear = () => {
      if (stateRef.current.hasResolved) {
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        hasResolved: true,
      };
      dispatchClear();
    };

    const syncTurn = (timestamp: number) => {
      if (stateRef.current.startTimestamp === null) {
        stateRef.current = {
          ...stateRef.current,
          startTimestamp: timestamp,
        };
      }

      const startTimestamp = stateRef.current.startTimestamp ?? timestamp;
      const elapsedMs = timestamp - startTimestamp;
      const currentTurn = stateRef.current.turns[stateRef.current.turnIndex];
      const currentTurnDeadline = Math.min(
        (stateRef.current.turnIndex + 1) * turnDurationMs,
        roundDurationMs - ROUND_END_SAFETY_MS,
      );
      const isRoundEnding = elapsedMs >= roundDurationMs - ROUND_END_SAFETY_MS;

      if (
        stateRef.current.turnIndex >= 0 &&
        currentTurn?.hasFive &&
        !stateRef.current.hasClickedBell &&
        elapsedMs >= currentTurnDeadline
      ) {
        resolveFailure();
        return;
      }

      if (isRoundEnding) {
        resolveClear();
        return;
      }

      const nextTurnIndex = Math.min(
        Math.floor(elapsedMs / turnDurationMs),
        stateRef.current.turns.length - 1,
      );

      if (nextTurnIndex !== stateRef.current.turnIndex) {
        stateRef.current = {
          ...stateRef.current,
          hasClickedBell: false,
          turnIndex: nextTurnIndex,
        };
        playAudio(cardAudioRef.current);
      }
    };

    const render = (timestamp: number) => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;

      if (!stateRef.current.hasResolved) {
        syncTurn(timestamp);
      }

      drawScene(
        context,
        imagesRef.current,
        stateRef.current,
        width,
        height,
        timestamp,
        turnDurationMs,
      );
      frameRef.current = window.requestAnimationFrame(render);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (stateRef.current.hasResolved) {
        return;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const point = getPointerPoint(canvas, event);

      if (!isInsideBell(point, width, height)) {
        return;
      }

      event.preventDefault();

      const currentTurn = stateRef.current.turns[stateRef.current.turnIndex];

      if (!currentTurn) {
        return;
      }

      if (stateRef.current.hasClickedBell) {
        return;
      }

      if (!currentTurn.hasFive) {
        resolveFailure();
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        bellPulseUntil: performance.now() + 260,
        hasClickedBell: true,
        turns: rebuildTurnsAfterBell(
          stateRef.current.turns,
          stateRef.current.turnIndex,
        ),
      };
      playAudio(bellAudioRef.current);
    };

    preloadHalliGalliImages()
      .then((loadedImages) => {
        imagesRef.current = loadedImages;
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    resizeCanvas();
    frameRef.current = window.requestAnimationFrame(render);
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [gameBeatCount]);

  return canvasRef;
}
