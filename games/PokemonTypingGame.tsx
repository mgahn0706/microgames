"use client";

import type { Microgame } from "@/data/microgames";
import { usePokemonTypingGame } from "@/games/usePokemonTypingGame";

export function PokemonTypingGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { canvasRef, inputHandlers, inputRef, targetName, typedName } =
    usePokemonTypingGame();
  void targetName;
  void typedName;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <section className="absolute right-[4.3vw] top-[19.7vh] w-[27.7vw] min-w-64 max-w-[30rem] text-white">
        <p className="mb-3 text-center text-[clamp(1rem,1.55vw,1.55rem)] font-black">
          포켓몬 이름은?
        </p>
        <input
          ref={inputRef}
          aria-label="포켓몬 이름"
          autoCapitalize="off"
          autoComplete="off"
          autoFocus
          className="h-[clamp(3.25rem,7.5vh,5.5rem)] w-full rounded-lg border-2 border-cyan-300 bg-slate-950/80 px-5 text-center text-[clamp(1.75rem,3vw,3.5rem)] font-black text-yellow-300 outline-none shadow-[0_0_18px_rgba(34,211,238,0.35)] placeholder:text-white/45 focus:border-yellow-300"
          inputMode="text"
          lang="ko"
          placeholder="입력"
          spellCheck={false}
          type="text"
          {...inputHandlers}
        />
      </section>
    </div>
  );
}
