"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type AngryBirdPoint = Readonly<{
  x: number;
  y: number;
}>;

export type AngryBirdGamePhase = "aiming" | "flying" | "idle";

const LAUNCH_POINT = { x: 21.2, y: 66.8 } as const satisfies AngryBirdPoint;
const INITIAL_BIRD_POINT = LAUNCH_POINT;
const MAX_PULL_DISTANCE = 18;
const CLEAR_LINE_X = 56;
const GRAVITY = 145;
const POWER = 18;
const GROUND_CENTER_Y = 82.4;
const BOUNCE_DAMPING = 0.34;
const BOUNCE_HORIZONTAL_DAMPING = 0.78;
const MIN_BOUNCE_VELOCITY = 34;
const MIN_ROLLING_VELOCITY = 4.4;
const ROLLING_FRICTION = 4.2;
const ROTATION_DEGREES_PER_X = 6.8;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointerPoint(
  element: HTMLDivElement,
  event: PointerEvent<HTMLDivElement>,
) {
  const bounds = element.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 100,
    y: ((event.clientY - bounds.top) / bounds.height) * 100,
  } satisfies AngryBirdPoint;
}

function getClampedDragPoint(point: AngryBirdPoint) {
  const offsetX = point.x - LAUNCH_POINT.x;
  const offsetY = point.y - LAUNCH_POINT.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance <= MAX_PULL_DISTANCE) {
    return point;
  }

  const ratio = MAX_PULL_DISTANCE / distance;

  return {
    x: LAUNCH_POINT.x + offsetX * ratio,
    y: LAUNCH_POINT.y + offsetY * ratio,
  } satisfies AngryBirdPoint;
}

function getLaunchVelocity(point: AngryBirdPoint) {
  return {
    x: (LAUNCH_POINT.x - point.x) * POWER,
    y: (LAUNCH_POINT.y - point.y) * POWER,
  };
}

function getRollingVelocityX(velocityX: number, deltaSeconds: number) {
  const friction = Math.max(0, 1 - ROLLING_FRICTION * deltaSeconds);
  const nextVelocityX = velocityX * friction;

  return Math.abs(nextVelocityX) < MIN_ROLLING_VELOCITY ? 0 : nextVelocityX;
}

function getNextFlyingStep(
  currentPoint: AngryBirdPoint,
  velocity: Readonly<{ x: number; y: number }>,
  deltaSeconds: number,
) {
  const gravityVelocity = {
    x: velocity.x,
    y: velocity.y + GRAVITY * deltaSeconds,
  };
  const airbornePoint = {
    x: currentPoint.x + gravityVelocity.x * deltaSeconds,
    y: currentPoint.y + gravityVelocity.y * deltaSeconds,
  } satisfies AngryBirdPoint;

  if (airbornePoint.y < GROUND_CENTER_Y) {
    return {
      point: airbornePoint,
      shouldStop: false,
      velocity: gravityVelocity,
    };
  }

  const bounceVelocityY =
    gravityVelocity.y > MIN_BOUNCE_VELOCITY
      ? -gravityVelocity.y * BOUNCE_DAMPING
      : 0;
  const rollingVelocityX =
    bounceVelocityY === 0
      ? getRollingVelocityX(gravityVelocity.x, deltaSeconds)
      : gravityVelocity.x * BOUNCE_HORIZONTAL_DAMPING;

  return {
    point: {
      x: airbornePoint.x,
      y: GROUND_CENTER_Y,
    } satisfies AngryBirdPoint,
    shouldStop: bounceVelocityY === 0 && rollingVelocityX === 0,
    velocity: {
      x: rollingVelocityX,
      y: bounceVelocityY,
    },
  };
}

export function useAngryBirdGame(): Readonly<{
  birdElementRef: RefObject<HTMLDivElement | null>;
  birdPoint: AngryBirdPoint;
  clearLineX: number;
  dragPoint: AngryBirdPoint | null;
  handlePointerCancel: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerLeave: () => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: () => void;
  launchPoint: AngryBirdPoint;
  phase: AngryBirdGamePhase;
}> {
  const animationFrameRef = useRef<number | null>(null);
  const birdElementRef = useRef<HTMLDivElement | null>(null);
  const birdPointRef = useRef<AngryBirdPoint>(INITIAL_BIRD_POINT);
  const hasClearedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastFrameAtRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const updateFlyingRef = useRef<((timestamp: number) => void) | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const [birdPoint, setBirdPoint] =
    useState<AngryBirdPoint>(INITIAL_BIRD_POINT);
  const [dragPoint, setDragPoint] = useState<AngryBirdPoint | null>(null);
  const [phase, setPhase] = useState<AngryBirdGamePhase>("idle");

  const moveBirdElement = useCallback(
    (point: AngryBirdPoint, rotation = rotationRef.current) => {
      birdPointRef.current = point;
      rotationRef.current = rotation;

      if (!birdElementRef.current) {
        return;
      }

      birdElementRef.current.style.left = `${point.x}%`;
      birdElementRef.current.style.top = `${point.y}%`;
      birdElementRef.current.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    },
    [],
  );

  const setAimingBirdPoint = useCallback(
    (point: AngryBirdPoint) => {
      moveBirdElement(point);
      setBirdPoint(point);
    },
    [moveBirdElement],
  );

  const stopFlyingAnimation = useCallback(() => {
    if (animationFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const updateFlying = useCallback(
    (timestamp: number) => {
      const lastFrameAt = lastFrameAtRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - lastFrameAt) / 1000, 0.05);

      lastFrameAtRef.current = timestamp;
      const currentVelocity = velocityRef.current;
      const nextStep = getNextFlyingStep(
        birdPointRef.current,
        currentVelocity,
        deltaSeconds,
      );
      const nextRotation =
        rotationRef.current +
        nextStep.velocity.x * deltaSeconds * ROTATION_DEGREES_PER_X;

      velocityRef.current = nextStep.velocity;
      moveBirdElement(nextStep.point, nextRotation);

      if (!hasClearedRef.current && nextStep.point.x >= CLEAR_LINE_X) {
        hasClearedRef.current = true;
        dispatchClear();
      }

      if (
        nextStep.shouldStop ||
        nextStep.point.x > 112 ||
        nextStep.point.y < -22
      ) {
        stopFlyingAnimation();
        moveBirdElement(
          {
            x: clamp(nextStep.point.x, -16, 112),
            y: clamp(nextStep.point.y, -22, GROUND_CENTER_Y),
          },
          nextRotation,
        );
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(
        (nextTimestamp) => {
          updateFlyingRef.current?.(nextTimestamp);
        },
      );
    },
    [moveBirdElement, stopFlyingAnimation],
  );

  useEffect(() => {
    updateFlyingRef.current = updateFlying;
  }, [updateFlying]);

  const launchBird = useCallback(
    (point: AngryBirdPoint) => {
      if (hasClearedRef.current) {
        return;
      }

      velocityRef.current = getLaunchVelocity(point);
      lastFrameAtRef.current = null;
      rotationRef.current = 0;
      setPhase("flying");
      setDragPoint(null);
      bgmLibrary
        .playSoundEffect("angryBirdSlingshot")
        .catch((error: unknown) => {
          console.error(error);
        });
      bgmLibrary.playSoundEffect("angryBirdFlying").catch((error: unknown) => {
        console.error(error);
      });
      stopFlyingAnimation();
      animationFrameRef.current = window.requestAnimationFrame(updateFlying);
    },
    [stopFlyingAnimation, updateFlying],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (phase === "flying" || hasClearedRef.current) {
        return;
      }

      const point = getPointerPoint(event.currentTarget, event);
      const distanceFromBird = Math.hypot(
        point.x - birdPoint.x,
        point.y - birdPoint.y,
      );

      if (distanceFromBird > 4.6) {
        return;
      }

      event.preventDefault();
      isDraggingRef.current = true;
      const nextPoint = getClampedDragPoint(point);

      setPhase("aiming");
      setDragPoint(nextPoint);
      setAimingBirdPoint(nextPoint);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [birdPoint, phase, setAimingBirdPoint],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || phase !== "aiming") {
        return;
      }

      const nextPoint = getClampedDragPoint(
        getPointerPoint(event.currentTarget, event),
      );

      setDragPoint(nextPoint);
      setAimingBirdPoint(nextPoint);
    },
    [phase, setAimingBirdPoint],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current || !dragPoint) {
      return;
    }

    isDraggingRef.current = false;
    launchBird(dragPoint);
  }, [dragPoint, launchBird]);

  const cancelDrag = useCallback(() => {
    if (!isDraggingRef.current || phase !== "aiming") {
      return;
    }

    isDraggingRef.current = false;
    setPhase("idle");
    setDragPoint(null);
    setAimingBirdPoint(INITIAL_BIRD_POINT);
  }, [phase, setAimingBirdPoint]);

  useEffect(() => {
    return () => {
      stopFlyingAnimation();
    };
  }, [stopFlyingAnimation]);

  return {
    birdElementRef,
    birdPoint,
    clearLineX: CLEAR_LINE_X,
    dragPoint,
    handlePointerCancel: cancelDrag,
    handlePointerDown,
    handlePointerLeave: cancelDrag,
    handlePointerMove,
    handlePointerUp,
    launchPoint: LAUNCH_POINT,
    phase,
  };
}
