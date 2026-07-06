"use client";

import { useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

type Point = Readonly<{
  x: number;
  y: number;
}>;

export type NanaimoBullet = Readonly<{
  color: string;
  id: number;
  radius: number;
  rotationDeg: number;
  x: number;
  y: number;
}>;

export type NanaimoShot = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

type MovingBullet = NanaimoBullet &
  Readonly<{
    vx: number;
    vy: number;
  }>;

type MovingShot = NanaimoShot &
  Readonly<{
    vx: number;
  }>;

type GameModel = {
  bossHit: boolean;
  bullets: MovingBullet[];
  elapsedBeats: number;
  failureDispatchStarted: boolean;
  hasEnded: boolean;
  hasFailed: boolean;
  hitFlashMs: number;
  lastTimestamp: number | null;
  nextBulletBeat: number;
  nextBulletId: number;
  nextShotId: number;
  nextShotTimestamp: number;
  player: Point;
  shots: MovingShot[];
  startTimestamp: number | null;
};

export type NanaimoRenderState = Readonly<{
  bossHit: boolean;
  bullets: readonly NanaimoBullet[];
  elapsedProgress: number;
  failureStartedAt: number | null;
  hasFailed: boolean;
  hitFlashMs: number;
  player: Point;
  shots: readonly NanaimoShot[];
}>;

const PLAYER_START = { x: 22, y: 72 } satisfies Point;
const BOSS_CENTER = { x: 84, y: 49 } satisfies Point;
const BOSS_BULLET_ORIGIN = { x: 72, y: 45 } satisfies Point;
const ARENA_BOUNDS = {
  bottom: 86,
  left: 8,
  right: 92,
  top: 20,
} as const;
const PLAYER_RADIUS = 2.45;
const BULLET_RADIUS = 0.56;
const BOSS_HIT_RADIUS = 30;
const PLAYER_SPEED_PER_SECOND = 42;
const BULLET_SPEED_PER_SECOND = 21;
const SHOT_SPEED_PER_SECOND = 64;
const SHOT_COOLDOWN_MS = 210;
const FIRST_BULLET_BEAT = 0.8;
const BULLET_INTERVAL_BEATS = 1.15;
const FINISH_BEAT_OFFSET = 0.12;
const HIT_FAILURE_DELAY_MS = 760;
const SHOOT_SOUND_SRC = "/games/nana-imo/sounds/player-shoot.mp3";
const HANDLED_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
]);

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createInitialModel(): GameModel {
  return {
    bossHit: false,
    bullets: [],
    elapsedBeats: 0,
    failureDispatchStarted: false,
    hasEnded: false,
    hasFailed: false,
    hitFlashMs: 0,
    lastTimestamp: null,
    nextBulletBeat: FIRST_BULLET_BEAT,
    nextBulletId: 1,
    nextShotId: 1,
    nextShotTimestamp: 0,
    player: PLAYER_START,
    shots: [],
    startTimestamp: null,
  };
}

function createRenderState(model: GameModel, beatCount: number) {
  return {
    bossHit: model.bossHit,
    bullets: model.bullets.map(({ color, id, radius, rotationDeg, x, y }) => ({
      color,
      id,
      radius,
      rotationDeg,
      x,
      y,
    })),
    elapsedProgress: Math.min(1, model.elapsedBeats / beatCount),
    failureStartedAt:
      model.hasFailed && model.failureDispatchStarted
        ? model.lastTimestamp
        : null,
    hasFailed: model.hasFailed,
    hitFlashMs: model.hitFlashMs,
    player: model.player,
    shots: model.shots.map(({ id, x, y }) => ({ id, x, y })),
  } satisfies NanaimoRenderState;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;

  return {
    x: x / length,
    y: y / length,
  } satisfies Point;
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function createBullet(
  id: number,
  origin: Point,
  angleRadians: number,
  color: string,
) {
  const direction = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  } satisfies Point;
  const rotationDeg = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;

  return {
    color,
    id,
    radius: BULLET_RADIUS,
    rotationDeg,
    vx: direction.x * BULLET_SPEED_PER_SECOND,
    vy: direction.y * BULLET_SPEED_PER_SECOND,
    x: origin.x,
    y: origin.y,
  } satisfies MovingBullet;
}

function createBulletWave(
  model: GameModel,
  elapsedBeats: number,
) {
  const waveIndex = Math.floor(
    (elapsedBeats - FIRST_BULLET_BEAT) / BULLET_INTERVAL_BEATS,
  );
  const origin = {
    x: BOSS_BULLET_ORIGIN.x + Math.sin(waveIndex * 0.8) * 2.2,
    y: BOSS_BULLET_ORIGIN.y + Math.cos(waveIndex * 0.7) * 4.8,
  } satisfies Point;
  const baseAngle = Math.PI + Math.sin(waveIndex * 0.55) * 0.28;
  const angleStep = Math.PI / 7;
  const bulletCount = waveIndex % 3 === 1 ? 4 : 3;
  const startOffset = -((bulletCount - 1) / 2) * angleStep;
  const color = waveIndex % 2 === 0 ? "#f97316" : "#38bdf8";

  return Array.from({ length: bulletCount }, (_, index) =>
    createBullet(
      model.nextBulletId + index,
      origin,
      baseAngle + startOffset + index * angleStep,
      index % 2 === 0 ? color : "#f43f5e",
    ),
  );
}

function playShootSound(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Space input unlocks audio in browsers that block autoplay.
  });
}

export function useNanaimoGame({
  beatCount,
  beatDurationMs,
  isActive,
}: Readonly<{
  beatCount: number;
  beatDurationMs: number;
  isActive: boolean;
}>): NanaimoRenderState {
  const animationFrameRef = useRef<number | null>(null);
  const failureTimerRef = useRef<number | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const modelRef = useRef<GameModel>(createInitialModel());
  const shootAudioRef = useRef<HTMLAudioElement | null>(null);
  const [renderState, setRenderState] = useState<NanaimoRenderState>(() =>
    createRenderState(modelRef.current, beatCount),
  );

  useEffect(() => {
    const shootAudio = new Audio(SHOOT_SOUND_SRC);

    shootAudio.preload = "auto";
    shootAudio.volume = 0.82;
    shootAudioRef.current = shootAudio;

    return () => {
      shootAudio.pause();
      shootAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    modelRef.current = createInitialModel();
    if (failureTimerRef.current !== null) {
      window.clearTimeout(failureTimerRef.current);
      failureTimerRef.current = null;
    }
    keysRef.current = {};
    setRenderState(createRenderState(modelRef.current, beatCount));
  }, [beatCount, isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const fireShot = (timestamp: number) => {
      const model = modelRef.current;

      if (timestamp < model.nextShotTimestamp || model.hasEnded) {
        return;
      }

      modelRef.current = {
        ...model,
        nextShotId: model.nextShotId + 1,
        nextShotTimestamp: timestamp + SHOT_COOLDOWN_MS,
        shots: [
          ...model.shots,
          {
            id: model.nextShotId,
            vx: SHOT_SPEED_PER_SECOND,
            x: model.player.x + 4.5,
            y: model.player.y - 0.4,
          },
        ],
      };
      playShootSound(shootAudioRef.current);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!HANDLED_KEYS.has(event.code)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      keysRef.current = { ...keysRef.current, [event.code]: true };

      if (event.code === "Space") {
        fireShot(window.performance.now());
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!HANDLED_KEYS.has(event.code)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      keysRef.current = { ...keysRef.current, [event.code]: false };
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      keysRef.current = {};
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const finishBeat = Math.max(0, beatCount - FINISH_BEAT_OFFSET);

    const tick = (timestamp: number) => {
      const model = modelRef.current;

      if (model.hasEnded && model.hasFailed) {
        setRenderState(createRenderState(model, beatCount));
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (model.startTimestamp === null) {
        modelRef.current = {
          ...model,
          lastTimestamp: timestamp,
          startTimestamp: timestamp,
        };
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const deltaSeconds = Math.min(
        Math.max((timestamp - (model.lastTimestamp ?? timestamp)) / 1000, 0),
        0.05,
      );
      const elapsedBeats = (timestamp - model.startTimestamp) / beatDurationMs;
      const keys = keysRef.current;
      const movement = normalizeVector(
        (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0),
        (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0),
      );
      const shouldMove = Object.values(keys).some(Boolean);
      const nextPlayer = shouldMove
        ? {
            x: clamp(
              model.player.x +
                movement.x * PLAYER_SPEED_PER_SECOND * deltaSeconds,
              ARENA_BOUNDS.left,
              ARENA_BOUNDS.right,
            ),
            y: clamp(
              model.player.y +
                movement.y * PLAYER_SPEED_PER_SECOND * deltaSeconds,
              ARENA_BOUNDS.top,
              ARENA_BOUNDS.bottom,
            ),
          }
        : model.player;
      const spawnedBullets =
        elapsedBeats >= model.nextBulletBeat && !model.hasEnded
          ? createBulletWave({ ...model, player: nextPlayer }, elapsedBeats)
          : [];
      const nextBulletBeat =
        spawnedBullets.length > 0
          ? model.nextBulletBeat + BULLET_INTERVAL_BEATS
          : model.nextBulletBeat;
      const movedBullets = [...model.bullets, ...spawnedBullets]
        .map((bullet) => ({
          ...bullet,
          x: bullet.x + bullet.vx * deltaSeconds,
          y: bullet.y + bullet.vy * deltaSeconds,
        }))
        .filter(
          (bullet) =>
            bullet.x > -8 &&
            bullet.x < 108 &&
            bullet.y > -8 &&
            bullet.y < 108,
        );
      const movedShots = model.shots
        .map((shot) => ({
          ...shot,
          x: shot.x + shot.vx * deltaSeconds,
        }))
        .filter((shot) => shot.x < 104);
      const collidesWithBullet = movedBullets.some(
        (bullet) =>
          getDistance(nextPlayer, bullet) < PLAYER_RADIUS + bullet.radius,
      );
      const bossWasHit =
        model.bossHit ||
        movedShots.some((shot) => getDistance(shot, BOSS_CENTER) < BOSS_HIT_RADIUS);
      const shotsAfterHit = bossWasHit
        ? movedShots.filter((shot) => getDistance(shot, BOSS_CENTER) >= BOSS_HIT_RADIUS)
        : movedShots;
      const nextHitFlashMs = bossWasHit && !model.bossHit ? 260 : Math.max(0, model.hitFlashMs - deltaSeconds * 1000);
      const shouldFinish = elapsedBeats >= finishBeat && !model.hasEnded;
      const nextHasFailed =
        model.hasFailed || collidesWithBullet || (shouldFinish && !bossWasHit);
      const nextHasEnded = model.hasEnded || collidesWithBullet || shouldFinish;
      const nextFailureDispatchStarted =
        model.failureDispatchStarted || collidesWithBullet;
      const nextModel = {
        ...model,
        bossHit: bossWasHit,
        bullets: movedBullets,
        elapsedBeats,
        failureDispatchStarted: nextFailureDispatchStarted,
        hasEnded: nextHasEnded,
        hasFailed: nextHasFailed,
        hitFlashMs: nextHitFlashMs,
        lastTimestamp: timestamp,
        nextBulletBeat,
        nextBulletId: model.nextBulletId + spawnedBullets.length,
        player: nextPlayer,
        shots: shotsAfterHit,
      } satisfies GameModel;

      modelRef.current = nextModel;
      setRenderState(createRenderState(nextModel, beatCount));

      if (collidesWithBullet && !model.hasEnded) {
        failureTimerRef.current = window.setTimeout(() => {
          failureTimerRef.current = null;
          dispatchFailure();
        }, HIT_FAILURE_DELAY_MS);
      } else if (shouldFinish) {
        if (bossWasHit) {
          dispatchClear();
        } else {
          dispatchFailure();
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }

      animationFrameRef.current = null;
    };
  }, [beatCount, beatDurationMs, isActive]);

  return renderState;
}
