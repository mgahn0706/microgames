"use client";

import { useEffect, useRef } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const BACKGROUND_HEIGHT = 941;
const BACKGROUND_WIDTH = 1672;
const BIN_BOUNDS = {
  floor: 876,
  left: 545,
  right: 1131,
  top: 220,
} as const;
const FRUIT_LEVELS = [
  {
    imageSrc: "/games/suika-game/images/apple.png",
    name: "apple",
    radius: 34,
  },
  {
    imageSrc: "/games/suika-game/images/pear.png",
    name: "pear",
    radius: 43,
  },
  {
    imageSrc: "/games/suika-game/images/peach.png",
    name: "peach",
    radius: 54,
  },
  {
    imageSrc: "/games/suika-game/images/pineapple.png",
    name: "pineapple",
    radius: 69,
  },
  {
    imageSrc: "/games/suika-game/images/melon.png",
    name: "melon",
    radius: 88,
  },
  {
    imageSrc: "/games/suika-game/images/watermelon.png",
    name: "watermelon",
    radius: 116,
  },
] as const;
const FRUIT_RESTITUTION = 0.12;
const FRUIT_FRICTION = 0.22;
const GRAVITY = 1750;
const HELD_FRUIT_KEY_NUDGE = 18;
const HELD_FRUIT_SPEED = 620;
const LINEAR_DAMPING = 0.998;
const MAX_DELTA_SECONDS = 1 / 30;
const MELON_LEVEL = 4;
const PHYSICS_STEPS = 6;
const POSITION_CORRECTION = 0.82;
const POSITION_SLOP = 0.35;
const RESTING_SPEED = 12;
const ROLLING_ROTATION_FACTOR = 0.42;
const ROLLING_ROTATION_LIMIT = 0.035;
const SUIKA_SOUNDS = {
  drop: "/games/suika-game/sounds/drop.wav",
  merged: "/games/suika-game/sounds/merged.wav",
} as const;
const WALL_RESTITUTION = 0.18;
const WATERMELON_LEVEL = 5;

type FruitLevel = (typeof FRUIT_LEVELS)[number]["name"];

type Fruit = {
  id: number;
  level: number;
  rotation: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type SceneLayout = Readonly<{
  floor: number;
  left: number;
  right: number;
  scale: number;
  top: number;
  x: number;
  y: number;
}>;

type GameState = {
  dropped: boolean;
  fruits: Fruit[];
  hasCleared: boolean;
  heldX: number;
  lastTimestamp: number | null;
  leftPressed: boolean;
  nextFruitId: number;
  rightPressed: boolean;
};

type GameImages = Readonly<{
  background: HTMLImageElement;
  fruits: Readonly<Record<FruitLevel, HTMLImageElement>>;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // The first trusted key input unlocks audio in browsers that block autoplay.
  });
}

function createFruit(id: number, level: number, x: number, y: number): Fruit {
  return {
    id,
    level,
    rotation: 0,
    vx: 0,
    vy: 0,
    x,
    y,
  };
}

function createInitialState() {
  return {
    dropped: false,
    fruits: [
      createFruit(1, 3, 640, 807),
      createFruit(2, 1, 722, 704),
      createFruit(3, MELON_LEVEL, 865, 788),
      createFruit(4, 0, 1018, 713),
      createFruit(5, 2, 1065, 816),
    ],
    hasCleared: false,
    heldX: 650,
    lastTimestamp: null,
    leftPressed: false,
    nextFruitId: 6,
    rightPressed: false,
  } satisfies GameState;
}

function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image;
}

function loadGameImages(): GameImages {
  return {
    background: loadImage("/games/suika-game/images/background.webp"),
    fruits: Object.fromEntries(
      FRUIT_LEVELS.map(({ imageSrc, name }) => [name, loadImage(imageSrc)]),
    ) as Record<FruitLevel, HTMLImageElement>,
  };
}

function getSceneLayout(width: number, height: number): SceneLayout {
  const scale = Math.max(width / BACKGROUND_WIDTH, height / BACKGROUND_HEIGHT);
  const x = (width - BACKGROUND_WIDTH * scale) / 2;
  const y = (height - BACKGROUND_HEIGHT * scale) / 2;

  return {
    floor: y + BIN_BOUNDS.floor * scale,
    left: x + BIN_BOUNDS.left * scale,
    right: x + BIN_BOUNDS.right * scale,
    scale,
    top: y + BIN_BOUNDS.top * scale,
    x,
    y,
  };
}

function getFruitRadius(fruit: Fruit, layout: SceneLayout) {
  return FRUIT_LEVELS[fruit.level].radius * layout.scale;
}

function getFruitMass(fruit: Fruit) {
  const radius = FRUIT_LEVELS[fruit.level].radius;
  return radius * radius;
}

function toCanvasPosition(fruit: Pick<Fruit, "x" | "y">, layout: SceneLayout) {
  return {
    x: layout.x + fruit.x * layout.scale,
    y: layout.y + fruit.y * layout.scale,
  };
}

function toWorldX(canvasX: number, layout: SceneLayout) {
  return (canvasX - layout.x) / layout.scale;
}

function clampHeldX(x: number) {
  const radius = FRUIT_LEVELS[MELON_LEVEL].radius;
  return Math.min(
    Math.max(x, BIN_BOUNDS.left + radius),
    BIN_BOUNDS.right - radius,
  );
}

function mergeFruits(
  state: GameState,
  first: Fruit,
  second: Fruit,
  onMerge: () => void,
) {
  if (first.level !== second.level || first.level >= WATERMELON_LEVEL) {
    return false;
  }

  const nextLevel = first.level + 1;
  const mergedFruit = createFruit(
    state.nextFruitId,
    nextLevel,
    (first.x + second.x) / 2,
    (first.y + second.y) / 2,
  );

  mergedFruit.vx = (first.vx + second.vx) / 2;
  mergedFruit.vy = Math.min((first.vy + second.vy) / 2, 0);
  mergedFruit.rotation = (first.rotation + second.rotation) / 2;
  state.nextFruitId += 1;
  state.fruits = [
    ...state.fruits.filter(
      (fruit) => fruit.id !== first.id && fruit.id !== second.id,
    ),
    mergedFruit,
  ];
  onMerge();

  if (nextLevel === WATERMELON_LEVEL && !state.hasCleared) {
    state.hasCleared = true;
    dispatchClear();
  }

  return true;
}

function resolveFruitCollision(
  state: GameState,
  first: Fruit,
  second: Fruit,
  layout: SceneLayout,
  onMerge: () => void,
) {
  const firstPosition = toCanvasPosition(first, layout);
  const secondPosition = toCanvasPosition(second, layout);
  const dx = secondPosition.x - firstPosition.x;
  const dy = secondPosition.y - firstPosition.y;
  const distance = Math.hypot(dx, dy);
  const minimumDistance =
    getFruitRadius(first, layout) + getFruitRadius(second, layout);

  if (distance >= minimumDistance) {
    return false;
  }

  if (mergeFruits(state, first, second, onMerge)) {
    return true;
  }

  const safeDistance = Math.max(distance, 0.001);
  const normalX = dx / safeDistance;
  const normalY = dy / safeDistance;
  const overlapInWorld = (minimumDistance - safeDistance) / layout.scale;
  const firstInverseMass = 1 / getFruitMass(first);
  const secondInverseMass = 1 / getFruitMass(second);
  const totalInverseMass = firstInverseMass + secondInverseMass;
  const correction =
    Math.max(overlapInWorld - POSITION_SLOP, 0) * POSITION_CORRECTION;

  first.x -= normalX * correction * (firstInverseMass / totalInverseMass);
  first.y -= normalY * correction * (firstInverseMass / totalInverseMass);
  second.x += normalX * correction * (secondInverseMass / totalInverseMass);
  second.y += normalY * correction * (secondInverseMass / totalInverseMass);

  const relativeVelocityX = second.vx - first.vx;
  const relativeVelocityY = second.vy - first.vy;
  const velocityAlongNormal =
    relativeVelocityX * normalX + relativeVelocityY * normalY;

  if (velocityAlongNormal < 0) {
    const impulse =
      (-(1 + FRUIT_RESTITUTION) * velocityAlongNormal) / totalInverseMass;
    const impulseX = impulse * normalX;
    const impulseY = impulse * normalY;

    first.vx -= impulseX * firstInverseMass;
    first.vy -= impulseY * firstInverseMass;
    second.vx += impulseX * secondInverseMass;
    second.vy += impulseY * secondInverseMass;
  }

  const tangentX = -normalY;
  const tangentY = normalX;
  const tangentVelocity =
    relativeVelocityX * tangentX + relativeVelocityY * tangentY;
  const frictionImpulse =
    (-tangentVelocity * FRUIT_FRICTION) / totalInverseMass;

  first.vx -= frictionImpulse * tangentX * firstInverseMass;
  first.vy -= frictionImpulse * tangentY * firstInverseMass;
  second.vx += frictionImpulse * tangentX * secondInverseMass;
  second.vy += frictionImpulse * tangentY * secondInverseMass;

  return false;
}

function resolveWalls(fruit: Fruit, layout: SceneLayout) {
  const radius = getFruitRadius(fruit, layout);
  const position = toCanvasPosition(fruit, layout);

  if (position.x - radius < layout.left) {
    fruit.x = toWorldX(layout.left + radius, layout);
    fruit.vx = Math.abs(fruit.vx) * WALL_RESTITUTION;
  } else if (position.x + radius > layout.right) {
    fruit.x = toWorldX(layout.right - radius, layout);
    fruit.vx = -Math.abs(fruit.vx) * WALL_RESTITUTION;
  }

  if (position.y + radius > layout.floor) {
    fruit.y = (layout.floor - radius - layout.y) / layout.scale;
    fruit.vy = -Math.abs(fruit.vy) * WALL_RESTITUTION;
    fruit.vx *= 0.88;

    if (Math.abs(fruit.vy) < RESTING_SPEED) {
      fruit.vy = 0;
    }

    if (Math.abs(fruit.vx) < RESTING_SPEED * 0.25) {
      fruit.vx = 0;
    }
  }
}

function stepPhysics(
  state: GameState,
  layout: SceneLayout,
  deltaSeconds: number,
  onMerge: () => void,
) {
  const stepSeconds = deltaSeconds / PHYSICS_STEPS;

  for (let step = 0; step < PHYSICS_STEPS; step += 1) {
    state.fruits.forEach((fruit) => {
      const previousX = fruit.x;

      fruit.vy += GRAVITY * stepSeconds;
      fruit.vx *= LINEAR_DAMPING;
      fruit.x += fruit.vx * stepSeconds;
      fruit.y += fruit.vy * stepSeconds;
      resolveWalls(fruit, layout);
      const radius = FRUIT_LEVELS[fruit.level].radius;
      const rollingRotation =
        ((fruit.x - previousX) / radius) * ROLLING_ROTATION_FACTOR;

      fruit.rotation += Math.max(
        Math.min(rollingRotation, ROLLING_ROTATION_LIMIT),
        -ROLLING_ROTATION_LIMIT,
      );
    });

    let didMerge = false;

    for (
      let firstIndex = 0;
      firstIndex < state.fruits.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < state.fruits.length;
        secondIndex += 1
      ) {
        if (
          resolveFruitCollision(
            state,
            state.fruits[firstIndex],
            state.fruits[secondIndex],
            layout,
            onMerge,
          )
        ) {
          didMerge = true;
          break;
        }
      }

      if (didMerge) {
        break;
      }
    }
  }
}

function drawFruit(
  context: CanvasRenderingContext2D,
  fruit: Fruit,
  image: HTMLImageElement,
  layout: SceneLayout,
  alpha = 1,
) {
  const position = toCanvasPosition(fruit, layout);
  const radius = getFruitRadius(fruit, layout);
  const maxDimension = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const width = (image.naturalWidth / maxDimension) * radius * 2;
  const height = (image.naturalHeight / maxDimension) * radius * 2;

  context.save();
  context.globalAlpha = alpha;
  context.translate(position.x, position.y);
  context.rotate(fruit.rotation);

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, -width / 2, -height / 2, width, height);
  } else {
    context.fillStyle = "#b8e84d";
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  images: GameImages,
  layout: SceneLayout,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);

  if (images.background.complete && images.background.naturalWidth > 0) {
    context.drawImage(
      images.background,
      layout.x,
      layout.y,
      BACKGROUND_WIDTH * layout.scale,
      BACKGROUND_HEIGHT * layout.scale,
    );
  } else {
    context.fillStyle = "#c98742";
    context.fillRect(0, 0, width, height);
  }

  state.fruits.forEach((fruit) => {
    const level = FRUIT_LEVELS[fruit.level];
    drawFruit(context, fruit, images.fruits[level.name], layout);
  });

  if (!state.dropped) {
    const heldFruit = createFruit(
      -1,
      MELON_LEVEL,
      state.heldX,
      BIN_BOUNDS.top - 45,
    );
    const position = toCanvasPosition(heldFruit, layout);
    const radius = getFruitRadius(heldFruit, layout);

    context.save();
    context.setLineDash([9, 9]);
    context.strokeStyle = "rgba(255, 255, 255, 0.75)";
    context.lineWidth = Math.max(2, 3 * layout.scale);
    context.beginPath();
    context.moveTo(position.x, position.y + radius * 0.72);
    context.lineTo(position.x, layout.top);
    context.stroke();
    context.restore();

    drawFruit(context, heldFruit, images.fruits.melon, layout, 0.96);
  }
}

function dropMelon(state: GameState) {
  if (state.dropped || state.hasCleared) {
    return false;
  }

  state.fruits = [
    ...state.fruits,
    createFruit(
      state.nextFruitId,
      MELON_LEVEL,
      state.heldX,
      BIN_BOUNDS.top - 45,
    ),
  ];
  state.nextFruitId += 1;
  state.dropped = true;
  return true;
}

export function useSuikaGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropAudioRef = useRef<HTMLAudioElement | null>(null);
  const mergedAudioRef = useRef<HTMLAudioElement | null>(null);
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

    const images = loadGameImages();
    const pixelRatio = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let canvasHeight = 360;
    let canvasWidth = 640;
    let layout = getSceneLayout(canvasWidth, canvasHeight);

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();

      canvasWidth = Math.max(bounds.width, 640);
      canvasHeight = Math.max(bounds.height, 360);
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      layout = getSceneLayout(canvasWidth, canvasHeight);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      const state = stateRef.current;

      if (event.code === "Space") {
        if (!event.repeat && dropMelon(state)) {
          playAudio(dropAudioRef.current);
        }
        return;
      }

      if (event.code === "ArrowLeft") {
        state.leftPressed = true;
      } else {
        state.rightPressed = true;
      }

      if (!event.repeat && !state.dropped && !state.hasCleared) {
        const direction = event.code === "ArrowLeft" ? -1 : 1;
        state.heldX = clampHeldX(
          state.heldX + direction * HELD_FRUIT_KEY_NUDGE,
        );
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.code)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.code === "ArrowLeft") {
        stateRef.current.leftPressed = false;
      } else {
        stateRef.current.rightPressed = false;
      }
    };

    const resetPressedDirections = () => {
      stateRef.current.leftPressed = false;
      stateRef.current.rightPressed = false;
    };

    const render = (timestamp: number) => {
      const state = stateRef.current;
      const elapsedSeconds =
        state.lastTimestamp === null
          ? 0
          : (timestamp - state.lastTimestamp) / 1000;
      const deltaSeconds = Math.min(elapsedSeconds, MAX_DELTA_SECONDS);

      state.lastTimestamp = timestamp;

      if (!state.dropped && !state.hasCleared) {
        const direction =
          Number(state.rightPressed) - Number(state.leftPressed);
        state.heldX = clampHeldX(
          state.heldX +
            direction * HELD_FRUIT_SPEED * Math.min(elapsedSeconds, 0.05),
        );
      }

      stepPhysics(state, layout, deltaSeconds, () => {
        playAudio(mergedAudioRef.current);
      });

      drawScene(context, state, images, layout, canvasWidth, canvasHeight);
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    dropAudioRef.current = new Audio(SUIKA_SOUNDS.drop);
    mergedAudioRef.current = new Audio(SUIKA_SOUNDS.merged);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("blur", resetPressedDirections);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("blur", resetPressedDirections);
      dropAudioRef.current = null;
      mergedAudioRef.current = null;
    };
  }, []);

  return canvasRef;
}
