"use client";

import type { Microgame } from "@/data/microgames";
import {
  type TicTacToeCell,
  type TicTacToeMark,
  useTicTacToeGame,
} from "@/games/useTicTacToeGame";

const LINE_CLASS_BY_KEY: Record<string, string> = {
  "0-1-2": "left-[8%] top-[16.666%] h-[10px] w-[84%]",
  "3-4-5": "left-[8%] top-1/2 h-[10px] w-[84%]",
  "6-7-8": "left-[8%] top-[83.333%] h-[10px] w-[84%]",
  "0-3-6": "left-[16.666%] top-[8%] h-[84%] w-[10px]",
  "1-4-7": "left-1/2 top-[8%] h-[84%] w-[10px]",
  "2-5-8": "left-[83.333%] top-[8%] h-[84%] w-[10px]",
  "0-4-8":
    "left-1/2 top-1/2 h-[10px] w-[118%] -translate-x-1/2 -translate-y-1/2 rotate-45",
  "2-4-6":
    "left-1/2 top-1/2 h-[10px] w-[118%] -translate-x-1/2 -translate-y-1/2 -rotate-45",
};

function MarkGlyph({ mark }: Readonly<{ mark: TicTacToeMark }>) {
  if (mark === "X") {
    return (
      <svg aria-hidden="true" className="h-[68%] w-[68%]" viewBox="0 0 100 100">
        <path
          d="M20 22 C38 38, 61 63, 80 79"
          fill="none"
          stroke="#545454"
          strokeDasharray="120"
          strokeLinecap="round"
          strokeWidth="12"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur="150ms"
            fill="freeze"
            from="120"
            to="0"
          />
        </path>
        <path
          d="M80 20 C63 38, 38 61, 20 80"
          fill="none"
          stroke="#545454"
          strokeDasharray="120"
          strokeLinecap="round"
          strokeWidth="12"
        >
          <animate
            attributeName="stroke-dashoffset"
            begin="90ms"
            dur="150ms"
            fill="freeze"
            from="120"
            to="0"
          />
        </path>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-[70%] w-[70%]" viewBox="0 0 100 100">
      <path
        d="M50 17 C70 17, 84 31, 84 50 C84 70, 70 84, 50 84 C30 84, 16 70, 16 50 C16 30, 30 17, 50 17"
        fill="none"
        stroke="#f2ebd3"
        strokeDasharray="230"
        strokeLinecap="round"
        strokeWidth="11"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="260ms"
          fill="freeze"
          from="230"
          to="0"
        />
      </path>
    </svg>
  );
}

function BoardCell({
  cell,
  disabled,
  onPlay,
}: Readonly<{
  cell: TicTacToeCell;
  disabled: boolean;
  onPlay: (cellIndex: number) => void;
}>) {
  return (
    <button
      aria-label={`${cell.id + 1}번 칸`}
      className="grid aspect-square place-items-center border-[#0da192] outline-none transition-colors hover:bg-white/5 focus-visible:bg-white/10 disabled:cursor-default"
      disabled={disabled || cell.mark !== null}
      onClick={() => onPlay(cell.id)}
      type="button"
    >
      {cell.mark ? (
        <span
          key={`${cell.mark}-${cell.strokeKey}`}
          className="grid h-full w-full place-items-center"
        >
          <MarkGlyph mark={cell.mark} />
        </span>
      ) : null}
    </button>
  );
}

export function TicTacToeGame({
  isActive,
  microgame,
}: Readonly<{ isActive: boolean; microgame: Microgame }>) {
  const { board, playCell, status, turn, winningLineKey } = useTicTacToeGame({
    isActive,
  });
  const isPlayerTurn = isActive && status === "playing" && turn === "X";

  return (
    <section
      aria-label={microgame.startPrompt}
      className="flex h-screen w-screen items-center justify-center bg-[#14bdac] px-6 py-8"
    >
      <div className="flex w-full max-w-[640px] flex-col items-center gap-8">
        <div className="flex h-16 items-center justify-center">
          <div className="rounded-sm bg-[#0da192]/70 px-6 py-3 text-center text-xl font-black tracking-normal text-white/90 shadow-[0_8px_0_rgba(0,0,0,0.08)]">
            {isPlayerTurn ? "X TURN" : "O THINKS"}
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-[520px]">
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            {board.map((cell) => (
              <BoardCell
                cell={cell}
                disabled={!isPlayerTurn}
                key={cell.id}
                onPlay={playCell}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            <div className="border-b-[10px] border-r-[10px] border-[#0da192]" />
            <div className="border-b-[10px] border-r-[10px] border-[#0da192]" />
            <div className="border-b-[10px] border-[#0da192]" />
            <div className="border-b-[10px] border-r-[10px] border-[#0da192]" />
            <div className="border-b-[10px] border-r-[10px] border-[#0da192]" />
            <div className="border-b-[10px] border-[#0da192]" />
            <div className="border-r-[10px] border-[#0da192]" />
            <div className="border-r-[10px] border-[#0da192]" />
            <div />
          </div>

          {winningLineKey ? (
            <div
              className={`pointer-events-none absolute rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.45)] ${LINE_CLASS_BY_KEY[winningLineKey]}`}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
