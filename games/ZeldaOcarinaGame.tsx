"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Microgame } from "@/data/microgames";
import {
  useZeldaOcarinaGame,
  type OcarinaInput,
} from "@/games/useZeldaOcarinaGame";

const BACKGROUND_SRC = "/games/zelda-ocarina-of-time/images/background.png";

function getArrowStyle(input: Exclude<OcarinaInput, "space">): CSSProperties {
  const transparent = "clamp(0.42rem,0.9vw,0.7rem) solid transparent";
  const solid = "clamp(0.8rem,1.75vw,1.24rem) solid currentColor";

  if (input === "up") {
    return {
      borderBottom: solid,
      borderLeft: transparent,
      borderRight: transparent,
    };
  }

  if (input === "down") {
    return {
      borderLeft: transparent,
      borderRight: transparent,
      borderTop: solid,
    };
  }

  if (input === "left") {
    return {
      borderBottom: transparent,
      borderRight: solid,
      borderTop: transparent,
    };
  }

  return {
    borderBottom: transparent,
    borderLeft: solid,
    borderTop: transparent,
  };
}

function OcarinaInputIcon({ input }: Readonly<{ input: OcarinaInput }>) {
  if (input === "space") {
    return (
      <span
        aria-hidden="true"
        className="h-[clamp(0.58rem,1.1vw,0.86rem)] w-[clamp(1.65rem,3.1vw,2.45rem)] rounded border-[0.18rem] border-current shadow-[inset_0_-0.16rem_0_rgba(0,0,0,0.22)]"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="block size-0 drop-shadow-[0_2px_0_rgba(0,0,0,0.18)]"
      style={getArrowStyle(input)}
    />
  );
}

export function ZeldaOcarinaGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { feedback, progress, song } = useZeldaOcarinaGame();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#15110d]">
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div className="absolute inset-0 bg-black/28" />
      <div className="absolute left-1/2 top-1/2 z-10 w-[min(42rem,78vw)] -translate-x-1/2 -translate-y-1/2">
        <div
          className={`relative aspect-[390/142] w-full overflow-hidden rounded border-2 bg-[#e8c88f] shadow-[0_18px_34px_rgba(0,0,0,0.42)] transition duration-150 ${
            feedback === "wrong"
              ? "border-red-300"
              : feedback === "success"
                ? "border-emerald-200"
                : "border-[#3b2110]"
          }`}
        >
          <Image
            alt={song.imageAlt}
            className="object-contain"
            fill
            priority
            sizes="672px"
            src={song.imageSrc}
            unoptimized
          />
        </div>
      </div>
      <div className="absolute bottom-[14%] left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
        {song.sequence.map((input, index) => {
          const isComplete = index < progress;
          const isCurrent = index === progress;

          return (
            <div
              className={`grid size-[clamp(2.75rem,5.8vw,4.4rem)] place-items-center rounded-full border-2 shadow-[0_10px_18px_rgba(0,0,0,0.26)] transition ${
                isComplete
                  ? "border-emerald-100 bg-emerald-300 text-emerald-950"
                  : isCurrent
                    ? "border-yellow-100 bg-yellow-300 text-stone-950"
                    : "border-white/35 bg-black/42 text-white/72"
              }`}
              key={`${song.id}-${index}`}
            >
              <OcarinaInputIcon input={input} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
