"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Microgame } from "@/data/microgames";
import type { LuigiMansionObjectId } from "@/games/useLuigiMansionGame";
import { useLuigiMansionGame } from "@/games/useLuigiMansionGame";

const BACKGROUND_SRC = "/games/luigi-mansion/images/background.png";
const GHOST_SRC = "/games/luigi-mansion/images/ghost.png";
const OBJECTS = [
  {
    id: "fruits",
    imageSrc: "/games/luigi-mansion/images/fruits.png",
    width: "18.5%",
    x: 13.5,
    y: 70.2,
  },
  {
    id: "chandelure",
    imageSrc: "/games/luigi-mansion/images/chandelure.png",
    width: "12.5%",
    x: 50,
    y: 26,
  },
  {
    id: "pots",
    imageSrc: "/games/luigi-mansion/images/pots.png",
    width: "13.5%",
    x: 92.2,
    y: 67.5,
  },
] as const satisfies ReadonlyArray<{
  id: LuigiMansionObjectId;
  imageSrc: string;
  width: string;
  x: number;
  y: number;
}>;

function getObjectLayout(objectId: LuigiMansionObjectId) {
  const layout = OBJECTS.find((object) => object.id === objectId);

  if (!layout) {
    throw new Error("Missing Luigi Mansion object layout.");
  }

  return layout;
}

export function LuigiMansionGame({
  beatDurationMs,
  microgame,
}: Readonly<{ beatDurationMs: number; microgame: Microgame }>) {
  void microgame;

  const {
    handleObjectClick,
    hiddenObjectId,
    isResolved,
    phase,
    wrongObjectId,
  } = useLuigiMansionGame(beatDurationMs);
  const hiddenObject = getObjectLayout(hiddenObjectId);

  return (
    <div className="relative h-screen w-screen touch-none select-none overflow-hidden bg-black">
      <div className="absolute left-1/2 top-1/2 aspect-[16/9] w-[max(100vw,177.778vh)] -translate-x-1/2 -translate-y-1/2">
        <Image
          alt=""
          className="object-cover"
          draggable={false}
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />
        <div className="absolute inset-0 bg-black/10" />

        {phase === "hiding" ? (
          <div
            aria-hidden="true"
            className="luigi-ghost absolute z-30 aspect-[422/393] w-[9.5%] -translate-x-1/2 -translate-y-1/2"
            style={
              {
                "--ghost-end-x": `${hiddenObject.x}%`,
                "--ghost-end-y": `${hiddenObject.y}%`,
                animationDuration: `${Math.max(beatDurationMs * 4, 600)}ms`,
              } as CSSProperties
            }
          >
            <Image
              alt=""
              className="object-contain drop-shadow-[0_0_24px_rgba(190,244,255,0.86)]"
              draggable={false}
              fill
              priority
              sizes="10vw"
              src={GHOST_SRC}
              unoptimized
            />
          </div>
        ) : null}

        {OBJECTS.map((object) => {
          const isHiddenTarget = object.id === hiddenObjectId;
          const isWrong = object.id === wrongObjectId;

          return (
            <button
              aria-label={`${object.id} 조사`}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 outline-none transition duration-150 ${
                phase === "selecting" && !isResolved
                  ? "cursor-pointer hover:scale-105 active:scale-95"
                  : "pointer-events-none"
              } ${isWrong ? "luigi-wrong-object" : ""} ${
                isResolved && isHiddenTarget
                  ? "scale-110 drop-shadow-[0_0_24px_rgba(132,255,179,0.82)]"
                  : ""
              }`}
              disabled={phase !== "selecting" || isResolved}
              key={object.id}
              onPointerDown={(event) => {
                event.preventDefault();
                handleObjectClick(object.id);
              }}
              style={{
                left: `${object.x}%`,
                top: `${object.y}%`,
                width: object.width,
              }}
              type="button"
            >
              <Image
                alt=""
                className="h-auto w-full object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)]"
                draggable={false}
                height={614}
                src={object.imageSrc}
                unoptimized
                width={584}
              />
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .luigi-ghost {
          animation-name: luigi-ghost-hide;
          animation-timing-function: cubic-bezier(0.17, 0.74, 0.18, 1);
          animation-fill-mode: both;
          left: 50%;
          top: 48%;
        }

        .luigi-wrong-object {
          animation: luigi-wrong-object 260ms ease-out both;
        }

        @keyframes luigi-ghost-hide {
          0% {
            left: 50%;
            opacity: 0;
            top: 48%;
            transform: translate(-50%, -50%) scale(0.45) rotate(-10deg);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2) rotate(8deg);
          }
          58% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.94) rotate(-6deg);
          }
          100% {
            left: var(--ghost-end-x);
            opacity: 0;
            top: var(--ghost-end-y);
            transform: translate(-50%, -50%) scale(0.15) rotate(18deg);
          }
        }

        @keyframes luigi-wrong-object {
          0%,
          100% {
            transform: translate(-50%, -50%);
          }
          25% {
            transform: translate(calc(-50% - 10px), -50%);
          }
          50% {
            transform: translate(calc(-50% + 10px), -50%);
          }
          75% {
            transform: translate(calc(-50% - 5px), -50%);
          }
        }
      `}</style>
    </div>
  );
}
