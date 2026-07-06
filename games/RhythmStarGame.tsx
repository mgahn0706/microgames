"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  useRhythmStarGame,
  type RhythmStarJudgement,
  type RhythmStarNote,
} from "@/games/useRhythmStarGame";

const BACKGROUND_SRC = "/games/rhythm-star/images/background.png";
const FALL_BEATS = 3.25;
const LANE_LEFT_PERCENT = 29.1;
const LANE_RIGHT_PERCENT = 70.9;
const NOTE_START_Y_PERCENT = 6.8;
const NOTE_TARGET_Y_PERCENT = 78.2;
const NOTE_PAST_Y_PERCENT = 88;
const NOTE_HEIGHT_PERCENT = 3.7;
const NOTE_WIDTH_PERCENT = 5.9;

const NOTE_COLORS = [
  "#22d3ee",
  "#facc15",
  "#a3e635",
  "#fb923c",
  "#f87171",
  "#c084fc",
  "#f0abfc",
  "#38bdf8",
  "#34d399",
  "#e5e7eb",
] as const;

const FEEDBACK_LABELS = {
  good: "GOOD",
  great: "GREAT",
  miss: "MISS",
  perfect: "PERFECT",
} satisfies Record<RhythmStarJudgement, string>;

function getLaneCenterPercent(laneIndex: number) {
  const progress = laneIndex / 9;

  return LANE_LEFT_PERCENT + (LANE_RIGHT_PERCENT - LANE_LEFT_PERCENT) * progress;
}

function getNoteYPercent(note: RhythmStarNote, elapsedBeats: number) {
  if (note.status === "hit") {
    return NOTE_TARGET_Y_PERCENT;
  }

  if (note.status === "missed") {
    return NOTE_PAST_Y_PERCENT;
  }

  const fallProgress = Math.max(
    -0.12,
    Math.min(1.14, 1 - (note.targetBeat - elapsedBeats) / FALL_BEATS),
  );

  return (
    NOTE_START_Y_PERCENT +
    (NOTE_TARGET_Y_PERCENT - NOTE_START_Y_PERCENT) * fallProgress
  );
}

function getNoteClassName(status: RhythmStarNote["status"]) {
  if (status === "hit") {
    return "opacity-35 scale-125";
  }

  if (status === "missed") {
    return "opacity-30 grayscale";
  }

  return "opacity-100";
}

function getFeedbackClassName(judgement: RhythmStarJudgement) {
  if (judgement === "miss") {
    return "border-red-400 bg-red-950/80 text-red-100 shadow-[0_0_28px_rgba(248,113,113,0.54)]";
  }

  if (judgement === "perfect") {
    return "border-yellow-200 bg-yellow-300 text-slate-950 shadow-[0_0_34px_rgba(250,204,21,0.82)]";
  }

  return "border-cyan-200 bg-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.62)]";
}

export function RhythmStarGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  void microgame;

  const { activeLaneIndex, elapsedBeats, feedback, keys, notes } =
    useRhythmStarGame({
      beatCount: microgame.beatCount,
      beatDurationMs,
      isActive,
    });

  const hitCount = notes.filter((note) => note.status === "hit").length;

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div className="relative aspect-[1672/941] w-screen max-w-[calc(100vh*1672/941)] select-none overflow-hidden">
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
          className="absolute h-[0.75%] rounded-full bg-cyan-100 shadow-[0_0_24px_rgba(103,232,249,0.78)]"
          style={{
            left: `${LANE_LEFT_PERCENT - 2.2}%`,
            top: `${NOTE_TARGET_Y_PERCENT}%`,
            width: `${LANE_RIGHT_PERCENT - LANE_LEFT_PERCENT + 4.4}%`,
          }}
        />

        {keys.map((key, laneIndex) => (
          <div key={key}>
            <div
              aria-hidden="true"
              className={[
                "absolute top-[8%] h-[72%] w-[3.1%] -translate-x-1/2 rounded-full transition-opacity duration-150",
                activeLaneIndex === laneIndex ? "opacity-100" : "opacity-0",
              ].join(" ")}
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(103,232,249,0.34), rgba(255,255,255,0.08))",
                boxShadow:
                  "0 0 22px rgba(103,232,249,0.72), 0 0 52px rgba(34,211,238,0.48)",
                left: `${getLaneCenterPercent(laneIndex)}%`,
              }}
            />
            <div
              aria-hidden="true"
              className={[
                "absolute grid aspect-square place-items-center rounded-md border text-[clamp(10px,1.2vw,18px)] font-black text-white/88 transition-[box-shadow,border-color,background-color] duration-150",
                activeLaneIndex === laneIndex
                  ? "border-cyan-100 bg-cyan-400/42 shadow-[0_0_24px_rgba(103,232,249,0.82)]"
                  : "border-white/35 bg-black/58 shadow-[0_0_14px_rgba(255,255,255,0.18)]",
              ].join(" ")}
              style={{
                left: `${getLaneCenterPercent(laneIndex)}%`,
                top: "83.4%",
                transform: "translate(-50%, -50%)",
                width: "3.1%",
              }}
            >
              {key}
            </div>
          </div>
        ))}

        {notes.map((note) => {
          const color = NOTE_COLORS[note.laneIndex];
          const yPercent = getNoteYPercent(note, elapsedBeats);

          return (
            <div
              aria-hidden="true"
              className={[
                "absolute transition-[opacity,transform,filter] duration-150",
                getNoteClassName(note.status),
              ].join(" ")}
              key={note.id}
              style={{
                height: `${NOTE_HEIGHT_PERCENT}%`,
                left: `${getLaneCenterPercent(note.laneIndex)}%`,
                top: `${yPercent}%`,
                transform: "translate(-50%, -50%)",
                width: `${NOTE_WIDTH_PERCENT}%`,
              }}
            >
              <div
                className="absolute left-1/2 top-[-88%] -translate-x-1/2 text-[clamp(11px,1.35vw,22px)] font-black text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.95)]"
              >
                {keys[note.laneIndex]}
              </div>
              <div
                className="h-full w-full rounded-[0.45vw] border-[0.16vw] border-white/85"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${color} 25%, rgba(17,24,39,0.92) 100%)`,
                  boxShadow: `0 0 16px ${color}, 0 0 34px ${color}, inset 0 0 15px rgba(255,255,255,0.55), inset 0 -10px 16px rgba(0,0,0,0.42)`,
                }}
              />
            </div>
          );
        })}

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[91.2%] flex -translate-x-1/2 gap-[0.7vw]"
        >
          {notes.map((note) => (
            <span
              className={[
                "block aspect-square w-[clamp(9px,1.05vw,17px)] rounded-full border border-white/45",
                note.status === "hit"
                  ? "bg-lime-300 shadow-[0_0_14px_rgba(190,242,100,0.8)]"
                  : "bg-black/72",
              ].join(" ")}
              key={`marker-${note.id}`}
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="absolute left-[26.3%] top-[86.8%] w-[5.6%] text-center text-[clamp(12px,1.5vw,23px)] font-black text-lime-200 tabular-nums drop-shadow-[0_0_8px_rgba(163,230,53,0.86)]"
        >
          {hitCount}/3
        </div>

        {feedback && (
          <div
            aria-hidden="true"
            className={[
              "absolute left-1/2 top-[29%] -translate-x-1/2 rounded-md border-2 px-[2.2vw] py-[0.7vw] text-[clamp(19px,3.2vw,48px)] font-black tracking-normal",
              getFeedbackClassName(feedback.judgement),
            ].join(" ")}
            key={feedback.id}
          >
            {FEEDBACK_LABELS[feedback.judgement]}
          </div>
        )}
      </div>
    </div>
  );
}
