"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  type InfiniteStairsDirection,
  useInfiniteStairsGame,
} from "@/games/useInfiniteStairsGame";

const BACKGROUND_SRC = "/games/infinite-stairs/images/background.webp";
const IDLE_PLAYER_SRC = "/games/infinite-stairs/images/player-first-idle.png";
const GOING_UP_PLAYER_SRC =
  "/games/infinite-stairs/images/player-going-up.png";
const STAIR_SRC = "/games/infinite-stairs/images/stair-brick.png";
const BACKGROUND_ASPECT_RATIO = 1672 / 941;
const STAIR_ASPECT_RATIO = 222 / 424;
const STAIR_WIDTH_PERCENT = 9.2;
const STAIR_HEIGHT_PERCENT =
  STAIR_WIDTH_PERCENT * BACKGROUND_ASPECT_RATIO * STAIR_ASPECT_RATIO;
const BASE_TILE = { left: 46, top: 73 } as const;
const PLAYER_IDLE_WIDTH_CLASS = "w-[clamp(7.6rem,18vmin,13rem)]";
const PLAYER_RUNNING_WIDTH_CLASS = "w-[clamp(7.8rem,19vmin,13.5rem)]";

type PositionedStep = Readonly<{
  direction: InfiniteStairsDirection;
  centerX: number;
  centerY: number;
  left: number;
  top: number;
}>;
type StairTile = Readonly<{
  direction: InfiniteStairsDirection;
  left: number;
  top: number;
}>;

function getStepPositions(
  sequence: readonly InfiniteStairsDirection[],
): readonly PositionedStep[] {
  const startTile = {
    direction: "right",
    left: BASE_TILE.left,
    top: BASE_TILE.top,
  } satisfies StairTile;
  const tiles = sequence.reduce<StairTile[]>(
    (tilePositions, direction) => {
      const previousTile = tilePositions[tilePositions.length - 1] ?? startTile;
      const left =
        previousTile.left +
        (direction === "left" ? -STAIR_WIDTH_PERCENT : STAIR_WIDTH_PERCENT);
      const top = previousTile.top - STAIR_HEIGHT_PERCENT;

      return [...tilePositions, { direction, left, top }];
    },
    [startTile],
  );

  return tiles.map((tile) => ({
    direction: tile.direction,
    centerX: tile.left + STAIR_WIDTH_PERCENT / 2,
    centerY: tile.top + STAIR_HEIGHT_PERCENT / 2,
    left: tile.left,
    top: tile.top,
  }));
}

function getPlayerPosition(
  positions: readonly PositionedStep[],
  progress: number,
) {
  const position = positions[progress] ?? positions[positions.length - 1];

  if (!position) {
    return {
      x: BASE_TILE.left + STAIR_WIDTH_PERCENT / 2,
      y: BASE_TILE.top + STAIR_HEIGHT_PERCENT / 2,
    };
  }

  return {
    x: position.centerX,
    y: position.centerY,
  };
}

export function InfiniteStairsGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const { failed, progress, sequence, stepKey } = useInfiniteStairsGame();
  const positions = getStepPositions(sequence);
  const playerPosition = getPlayerPosition(positions, progress);
  const playerDirection = positions[progress]?.direction ?? "right";
  const isIdle = failed || progress === 0;
  const playerSrc = isIdle ? IDLE_PLAYER_SRC : GOING_UP_PLAYER_SRC;
  const playerScaleX = !isIdle && playerDirection === "right" ? -1 : 1;

  return (
    <div
      aria-label={microgame.startPrompt}
      className="grid h-screen w-screen place-items-center overflow-hidden bg-black"
    >
      <div className="relative aspect-[1672/941] w-screen max-w-[calc(100vh*1672/941)] overflow-hidden bg-[#9bc4dd]">
        <Image
          alt=""
          className="pointer-events-none select-none object-cover"
          draggable={false}
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />
        <div className="absolute inset-0 bg-white/10" />

        {positions.map((position, index) => {
          const isPassed = index < progress;
          const isCurrent = index === progress;

          return (
            <div
              aria-hidden="true"
              className={[
                "absolute z-10 aspect-[424/222] transition duration-150",
                isPassed ? "opacity-75" : "opacity-100",
                isCurrent && !failed
                  ? "drop-shadow-[0_0_16px_rgba(250,204,21,0.9)]"
                  : "drop-shadow-[0_8px_8px_rgba(0,0,0,0.22)]",
              ].join(" ")}
              key={`${position.left}-${position.top}-${index}`}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                width: `${STAIR_WIDTH_PERCENT}%`,
              }}
            >
              <Image
                alt=""
                className="select-none object-contain"
                draggable={false}
                fill
                priority
                sizes="204px"
                src={STAIR_SRC}
                unoptimized
              />
            </div>
          );
        })}

        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-[98%] transition-[left,top] duration-120 ease-out"
          style={{
            left: `${playerPosition.x}%`,
            top: `${playerPosition.y}%`,
          }}
        >
          {failed ? (
            <div className="absolute -top-[24%] left-1/2 z-30 -translate-x-1/2 text-[clamp(3rem,8vmin,6rem)] font-black leading-none text-[#ffdf2e] drop-shadow-[3px_4px_0_rgba(0,0,0,0.8)]">
              !
            </div>
          ) : null}
          <div
            className={[
              "relative",
              isIdle
                ? `aspect-[1024/1536] ${PLAYER_IDLE_WIDTH_CLASS}`
                : `aspect-[788/1120] ${PLAYER_RUNNING_WIDTH_CLASS}`,
            ].join(" ")}
            key={failed ? "failed" : stepKey}
            style={{ transform: `scaleX(${playerScaleX})` }}
          >
            <div
              className={[
                "absolute inset-0 transition-transform duration-100",
                !failed && stepKey > 0
                  ? "animate-[infinite-stairs-step_140ms_ease-out]"
                  : "",
              ].join(" ")}
            >
              <Image
                alt=""
                className="select-none object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.28)]"
                draggable={false}
                fill
                priority
                sizes="160px"
                src={playerSrc}
                unoptimized
              />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes infinite-stairs-step {
            0% { transform: translateY(8%) scale(0.96); }
            100% { transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
