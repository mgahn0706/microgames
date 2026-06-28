"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { usePokerougeShopGame } from "@/games/usePokerougeShopGame";

const BACKGROUND_SRC = "/games/pokerouge/images/background.png";

export function PokerougeShopGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const { options, selectedIndex } = usePokerougeShopGame();

  return (
    <div
      aria-label={microgame.startPrompt}
      className="grid h-screen w-screen place-items-center overflow-hidden bg-black"
    >
      <div className="relative aspect-[16/9] h-screen max-h-screen w-screen max-w-[calc(100vh*16/9)] overflow-hidden bg-[#69b574]">
        <Image
          alt=""
          className="select-none object-cover [image-rendering:pixelated]"
          draggable={false}
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute left-1/2 top-1/2 grid w-[86%] -translate-x-1/2 -translate-y-1/2 grid-cols-5 items-end gap-[clamp(0.4rem,1.3vmin,1rem)]">
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;

            return (
              <div
                className="relative grid place-items-center gap-[clamp(0.35rem,1.2vmin,0.85rem)]"
                key={option.id}
              >
                {isSelected ? (
                  <span
                    className="absolute -top-[24%] left-1/2 -translate-x-1/2 text-[clamp(1.8rem,5.5vmin,4.4rem)] leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.88)]"
                  >
                    ▼
                  </span>
                ) : null}
                <div
                  className={[
                    "relative aspect-square w-[clamp(3.8rem,13vmin,9.2rem)] transition-transform duration-100",
                    isSelected ? "scale-125" : "scale-100 opacity-90",
                  ].join(" ")}
                >
                  <Image
                    alt=""
                    className="object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.82)] [image-rendering:pixelated]"
                    draggable={false}
                    fill
                    priority
                    sizes="148px"
                    src={option.imageSrc}
                    unoptimized
                  />
                </div>
                <p
                  className="whitespace-nowrap text-center text-[clamp(0.8rem,2.35vmin,1.75rem)] font-black leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.95)]"
                  style={{ color: option.color }}
                >
                  {option.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
