"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Microgame } from "@/data/microgames";
import {
  type DobbleCardIcon,
  type DobbleResult,
  type DobbleSide,
  useDobbleGame,
} from "@/games/useDobbleGame";

const ICON_LAYOUTS = [
  { left: "50%", size: "27%", top: "49%" },
  { left: "21%", size: "20%", top: "23%" },
  { left: "51%", size: "12%", top: "16%" },
  { left: "79%", size: "24%", top: "28%" },
  { left: "20%", size: "13%", top: "56%" },
  { left: "80%", size: "14%", top: "58%" },
  { left: "34%", size: "23%", top: "81%" },
  { left: "69%", size: "16%", top: "80%" },
] as const;

type IconButtonStyle = CSSProperties & {
  "--dobble-icon-rotation": string;
  "--dobble-icon-scale": number;
};

function DobbleCard({
  answerId,
  card,
  chooseIcon,
  result,
  selectedSide,
  side,
}: Readonly<{
  answerId: string;
  card: readonly DobbleCardIcon[];
  chooseIcon: (iconId: string, side: DobbleSide) => void;
  result: DobbleResult;
  selectedSide: DobbleSide | null;
  side: DobbleSide;
}>) {
  return (
    <div className="relative aspect-square w-[min(42vw,72vh)] rounded-full border-[clamp(7px,1vw,14px)] border-white bg-white shadow-[0_1.5rem_3.5rem_rgba(15,23,42,0.32),inset_0_0_0_4px_#dbeafe]">
      {card.map(({ icon, rotation, scale }, index) => {
        const layout = ICON_LAYOUTS[index];
        const isAnswer = icon.id === answerId;
        const shouldShowSuccess =
          result === "success" && isAnswer && selectedSide === side;
        const shouldShowFailure = result === "failure" && isAnswer;
        const style = {
          "--dobble-icon-rotation": `${rotation}deg`,
          "--dobble-icon-scale": scale,
          height: layout.size,
          left: layout.left,
          top: layout.top,
          width: layout.size,
        } satisfies IconButtonStyle;

        return (
          <button
            aria-label={`${side === "left" ? "왼쪽" : "오른쪽"} 카드의 ${icon.label}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation rounded-full outline-none transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-cyan-400"
            disabled={result !== "playing"}
            key={icon.id}
            onPointerDown={(event) => {
              event.preventDefault();
              chooseIcon(icon.id, side);
            }}
            style={style}
            type="button"
          >
            <span
              className="absolute inset-0"
              style={{
                transform:
                  "rotate(var(--dobble-icon-rotation)) scale(var(--dobble-icon-scale))",
              }}
            >
              <Image
                alt=""
                className="object-contain drop-shadow-[0_3px_2px_rgba(15,23,42,0.2)]"
                fill
                sizes="12vw"
                src={icon.src}
                unoptimized
              />
            </span>
            {shouldShowSuccess || shouldShowFailure ? (
              <span
                className={`pointer-events-none absolute -inset-2 rounded-full border-[clamp(4px,0.55vw,8px)] ${
                  shouldShowFailure
                    ? "border-red-500 shadow-[0_0_1.2rem_rgba(239,68,68,0.8)]"
                    : "border-emerald-500 shadow-[0_0_1.2rem_rgba(16,185,129,0.8)]"
                }`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function DobbleGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  const { answerId, chooseIcon, leftCard, result, rightCard, selectedSide } =
    useDobbleGame(microgame.beatCount, beatDurationMs, isActive);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center gap-[3vw] overflow-hidden bg-[radial-gradient(circle_at_center,#bae6fd_0%,#38bdf8_52%,#0369a1_100%)] px-4">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.7)_50%,transparent_55%)] [background-size:5rem_5rem]" />
      <DobbleCard
        answerId={answerId}
        card={leftCard}
        chooseIcon={chooseIcon}
        result={result}
        selectedSide={selectedSide}
        side="left"
      />
      <DobbleCard
        answerId={answerId}
        card={rightCard}
        chooseIcon={chooseIcon}
        result={result}
        selectedSide={selectedSide}
        side="right"
      />
    </div>
  );
}
