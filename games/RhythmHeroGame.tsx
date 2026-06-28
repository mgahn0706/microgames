"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useRhythmHeroGame } from "@/games/useRhythmHeroGame";

const BACKGROUND_SRC = "/games/rhythm-hero/images/background.webp";
const SPINNER_SRC = "/games/rhythm-hero/images/spinner.webp";
const SPINNER_FRAME = {
  left: "49.94%",
  size: "49.1%",
  top: "53.35%",
} as const;
const GAUGE_SLOT_COUNT = 13;
const GAUGE_SLOTS = Array.from({ length: GAUGE_SLOT_COUNT }, (_, index) => ({
  height: 5.08,
  top: 12.28 + index * 6.62,
}));
const GAUGE_SLOT_COLORS = [
  "#b91c1c",
  "#dc2626",
  "#ef4444",
  "#f97316",
  "#fb923c",
  "#f59e0b",
  "#fbbf24",
  "#facc15",
  "#fde047",
  "#fef08a",
  "#fff176",
  "#fff59d",
  "#fff9c4",
] as const;

function RhythmHeroGauge({
  gauge,
  side,
}: Readonly<{ gauge: number; side: "left" | "right" }>) {
  const filledSlots = (gauge / 100) * GAUGE_SLOT_COUNT;

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute top-0 z-[1] h-full w-[14.7%]",
        side === "left" ? "left-[1.95%]" : "right-[1.95%]",
      ].join(" ")}
    >
      {GAUGE_SLOTS.map((slot, index) => {
        const slotFromBottom = GAUGE_SLOT_COUNT - 1 - index;
        const fill = Math.max(0, Math.min(1, filledSlots - slotFromBottom));
        const slotColor = GAUGE_SLOT_COLORS[slotFromBottom];

        return (
          <div
            className="absolute left-0 right-0 overflow-hidden rounded-[0.35vw]"
            key={`${side}-${slot.top}`}
            style={{
              height: `${slot.height}%`,
              top: `${slot.top}%`,
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 shadow-[inset_0_0_12px_rgba(255,255,255,0.5)]"
              style={{ backgroundColor: slotColor, height: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function RhythmHeroGame({
  beatDurationMs,
  microgame,
}: Readonly<{ beatDurationMs: number; microgame: Microgame }>) {
  void microgame;

  const {
    gauge,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDragging,
    spinnerRotation,
    spinnerStageRef,
  } = useRhythmHeroGame({ beatDurationMs });

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div
        className="relative aspect-[1672/941] w-screen max-w-[calc(100vh*1672/941)] touch-none select-none"
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={spinnerStageRef}
      >
        <Image
          alt=""
          className="pointer-events-none select-none object-contain"
          draggable={false}
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute z-10 aspect-square",
            isDragging
              ? "drop-shadow-[0_0_32px_rgba(255,229,77,0.8)]"
              : "drop-shadow-[0_0_18px_rgba(59,130,246,0.32)]",
          ].join(" ")}
          style={{
            left: SPINNER_FRAME.left,
            top: SPINNER_FRAME.top,
            transform: "translate(-50%, -50%)",
            width: SPINNER_FRAME.size,
          }}
        >
          <div
            className="relative h-full w-full"
            style={{ transform: `rotate(${spinnerRotation}deg)` }}
          >
            <Image
              alt=""
              className="select-none object-contain"
              draggable={false}
              fill
              priority
              sizes="1074px"
              src={SPINNER_SRC}
              unoptimized
            />
          </div>
        </div>

        <RhythmHeroGauge gauge={gauge} side="left" />
        <RhythmHeroGauge gauge={gauge} side="right" />
      </div>
    </div>
  );
}
