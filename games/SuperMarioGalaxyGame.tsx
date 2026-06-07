"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useSuperMarioGalaxyGame } from "@/games/useSuperMarioGalaxyGame";

const BACKGROUND_SRC = "/games/super-mario-galaxy/images/background.png";
const CURSOR_SRC = "/games/super-mario-galaxy/images/cursor.png";

export function SuperMarioGalaxyGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    bits,
    collectedBitIds,
    containerRef,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    pointerPosition,
  } = useSuperMarioGalaxyGame();

  return (
    <div
      className="relative h-screen w-screen cursor-none touch-none select-none overflow-hidden bg-[#050816]"
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={containerRef}
    >
      <Image
        alt=""
        className="select-none object-cover"
        draggable={false}
        fill
        onDragStart={(event) => {
          event.preventDefault();
        }}
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div className="absolute inset-0 bg-black/10" />
      {bits.map((bit) => {
        const isCollected = collectedBitIds.includes(bit.id);

        return (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 size-[clamp(3.5rem,7.2vw,5.4rem)] -translate-x-1/2 -translate-y-1/2 transition duration-200 ${
              isCollected
                ? "scale-0 opacity-0 blur-sm"
                : "scale-100 opacity-100 drop-shadow-[0_0_18px_rgba(255,255,255,0.68)]"
            }`}
            key={bit.id}
            style={{
              left: `${bit.x}%`,
              top: `${bit.y}%`,
            }}
          >
            <Image
              alt=""
              className="animate-spin select-none object-contain"
              draggable={false}
              fill
              onDragStart={(event) => {
                event.preventDefault();
              }}
              sizes="86px"
              src={bit.imageSrc}
              style={{
                animationDelay: `${bit.rotationDelaySeconds}s`,
                animationDuration: "1.35s",
              }}
              unoptimized
            />
          </div>
        );
      })}
      {pointerPosition ? (
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute z-20 size-[clamp(3.25rem,5.8vw,4.9rem)] -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_0_18px_rgba(109,240,255,0.74)]"
          draggable={false}
          height={90}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          src={CURSOR_SRC}
          style={{
            left: `${pointerPosition.x}px`,
            top: `${pointerPosition.y}px`,
          }}
          unoptimized
          width={90}
        />
      ) : null}
    </div>
  );
}
