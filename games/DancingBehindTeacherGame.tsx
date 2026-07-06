"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  useDancingBehindTeacherGame,
  type TeacherPose,
} from "@/games/useDancingBehindTeacherGame";

const ASSET_BASE = "/games/dancing-behind-the-teacher";
const BACKGROUND_SRC = `${ASSET_BASE}/images/background.png`;
const CAUGHT_GAME_OVER_SRC = `${ASSET_BASE}/images/game-over.png`;
const TIMEOUT_GAME_OVER_SRC = `${ASSET_BASE}/images/game-over-no-input.png`;
const STUDENTS = [
  {
    src: `${ASSET_BASE}/images/first-student.png`,
    left: "18.1%",
    top: "69.5%",
    width: "11.2%",
  },
  {
    src: `${ASSET_BASE}/images/second-student.png`,
    left: "37.7%",
    top: "70.4%",
    width: "10.6%",
  },
  {
    src: `${ASSET_BASE}/images/third-student.png`,
    left: "57.6%",
    top: "69.8%",
    width: "10.3%",
  },
  {
    src: `${ASSET_BASE}/images/fourth-student.png`,
    left: "78.1%",
    top: "70.2%",
    width: "10.8%",
  },
] as const;

function getTeacherImage(pose: TeacherPose) {
  return `${ASSET_BASE}/images/teacher-${pose}.png`;
}

function getTeacherClassName(pose: TeacherPose) {
  if (pose === "front") {
    return "drop-shadow-[0_0_22px_rgba(239,68,68,0.5)]";
  }

  if (pose === "turning") {
    return "drop-shadow-[0_0_20px_rgba(250,204,21,0.45)]";
  }

  return "drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]";
}

const STUDENT_DANCE_CLASSES = [
  "animate-[dance-behind-teacher-jump_230ms_steps(2,end)_infinite]",
  "animate-[dance-behind-teacher-jump-side_310ms_steps(3,end)_infinite]",
  "animate-[dance-behind-teacher-jump-stomp_280ms_steps(3,end)_infinite]",
  "animate-[dance-behind-teacher-jump-shuffle_360ms_steps(4,end)_infinite]",
] as const;

const STUDENT_ROTATION_CLASSES = [
  "animate-[dance-behind-teacher-spin_520ms_linear_infinite]",
  "animate-[dance-behind-teacher-rock_250ms_ease-in-out_infinite]",
  "animate-[dance-behind-teacher-half-spin_430ms_ease-in-out_infinite]",
  "animate-[dance-behind-teacher-fast-twist_330ms_linear_infinite]",
] as const;

function getStudentClassName(
  index: number,
  isDancing: boolean,
  hasFailed: boolean,
) {
  if (hasFailed) {
    return "opacity-55 grayscale";
  }

  if (isDancing) {
    return `${STUDENT_DANCE_CLASSES[index]} drop-shadow-[0_0_22px_rgba(250,204,21,0.68)]`;
  }

  return "opacity-85";
}

function getStudentImageClassName(index: number, isDancing: boolean) {
  if (isDancing) {
    return STUDENT_ROTATION_CLASSES[index];
  }

  return "";
}

export function DancingBehindTeacherGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  void microgame;

  const { danceProgress, failureReason, hasFailed, isDancing, teacherPose } =
    useDancingBehindTeacherGame({
      beatCount: microgame.beatCount,
      beatDurationMs,
      isActive,
    });

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-[#1c1207]">
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
          className={[
            "pointer-events-none absolute z-30 aspect-[1536/1024] transition-[filter,transform] duration-150",
            getTeacherClassName(teacherPose),
          ].join(" ")}
          style={{
            left: "50%",
            top: "45.5%",
            transform: "translate(-50%, -50%)",
            width: "43%",
          }}
        >
          <Image
            alt=""
            className="object-contain"
            draggable={false}
            fill
            priority
            sizes="320px"
            src={getTeacherImage(teacherPose)}
            unoptimized
          />
        </div>

        {STUDENTS.map((student, index) => (
          <div
            aria-hidden="true"
            className={[
              "pointer-events-none absolute z-20 aspect-[1/1.48] transition-[filter,opacity] duration-100",
              getStudentClassName(index, isDancing, hasFailed),
            ].join(" ")}
            key={student.src}
            style={{
              animationDelay: `${index * -55}ms`,
              left: student.left,
              top: student.top,
              transform: "translate(-50%, -50%)",
              width: student.width,
            }}
          >
            <div
              className={[
                "relative h-full w-full origin-center",
                getStudentImageClassName(index, isDancing),
              ].join(" ")}
              style={{
                animationDelay: `${index * -75}ms`,
              }}
            >
              <Image
                alt=""
                className="object-contain"
                draggable={false}
                fill
                priority
                sizes="190px"
                src={student.src}
                unoptimized
              />
            </div>
          </div>
        ))}

        <div
          aria-hidden="true"
          className="absolute left-[5.2%] top-[8.2%] z-30 h-[3.2%] w-[26%] overflow-hidden rounded-full border-[0.18vw] border-black/70 bg-black/58 shadow-[inset_0_0_10px_rgba(0,0,0,0.55)]"
        >
          <div
            className="h-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.78)] transition-[width] duration-100"
            style={{ width: `${danceProgress * 100}%` }}
          />
        </div>

        <div
          aria-hidden="true"
          className={[
            "absolute left-[50%] top-[16.2%] z-30 h-[2.7%] w-[9.2%] -translate-x-1/2 rounded-full border border-black/50 transition-colors duration-150",
            teacherPose === "front"
              ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.72)]"
              : teacherPose === "turning"
                ? "bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.7)]"
                : "bg-lime-400 shadow-[0_0_18px_rgba(132,204,22,0.68)]",
          ].join(" ")}
        />

      </div>

      {hasFailed && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black"
        >
          <Image
            alt=""
            className="object-contain"
            draggable={false}
            fill
            priority
            sizes="100vw"
            src={
              failureReason === "timeout"
                ? TIMEOUT_GAME_OVER_SRC
                : CAUGHT_GAME_OVER_SRC
            }
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
