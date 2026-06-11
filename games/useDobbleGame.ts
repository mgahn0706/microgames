"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type DobbleIcon = Readonly<{
  id: string;
  label: string;
  src: string;
}>;

export type DobbleCardIcon = Readonly<{
  icon: DobbleIcon;
  rotation: number;
  scale: number;
}>;

export type DobbleResult = "failure" | "playing" | "success";
export type DobbleSide = "left" | "right";

const ICONS_PER_CARD = 8;
const FAILURE_REVEAL_MS = 650;
const DOBBLE_ICONS = [
  { id: "anchor", label: "닻", src: "/games/dobble/images/anchor.png" },
  { id: "car", label: "자동차", src: "/games/dobble/images/car.png" },
  { id: "carrot", label: "당근", src: "/games/dobble/images/carrot.png" },
  { id: "cheese", label: "치즈", src: "/games/dobble/images/cheese.png" },
  {
    id: "chess-knight",
    label: "체스 말",
    src: "/games/dobble/images/chess_knight.png",
  },
  { id: "glasses", label: "안경", src: "/games/dobble/images/glasses.png" },
  { id: "hammer", label: "망치", src: "/games/dobble/images/hammer.png" },
  { id: "heart", label: "하트", src: "/games/dobble/images/heart.png" },
  { id: "icecube", label: "얼음", src: "/games/dobble/images/icecube.png" },
  { id: "igloo", label: "이글루", src: "/games/dobble/images/igloo.png" },
  {
    id: "no-entry",
    label: "진입 금지",
    src: "/games/dobble/images/no_entry.png",
  },
  { id: "padlock", label: "자물쇠", src: "/games/dobble/images/padlock.png" },
  { id: "pencil", label: "연필", src: "/games/dobble/images/pencil.png" },
  {
    id: "question-mark",
    label: "물음표",
    src: "/games/dobble/images/question_mark.png",
  },
  { id: "scissors", label: "가위", src: "/games/dobble/images/scissors.png" },
  { id: "skull", label: "해골", src: "/games/dobble/images/skull.png" },
  {
    id: "waterdrop",
    label: "물방울",
    src: "/games/dobble/images/waterdrop.png",
  },
  {
    id: "yin-yang",
    label: "태극",
    src: "/games/dobble/images/yin_yang.png",
  },
  { id: "zebra", label: "얼룩말", src: "/games/dobble/images/zebra.png" },
] as const satisfies readonly DobbleIcon[];

type DobbleRound = Readonly<{
  answerId: string;
  leftCard: readonly DobbleCardIcon[];
  rightCard: readonly DobbleCardIcon[];
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function shuffle<T>(values: readonly T[]) {
  return values
    .map((value) => ({ order: Math.random(), value }))
    .sort((first, second) => first.order - second.order)
    .map(({ value }) => value);
}

function decorateCard(icons: readonly DobbleIcon[]) {
  return shuffle(icons).map((icon) => ({
    icon,
    rotation: Math.round(Math.random() * 70 - 35),
    scale: 0.9 + Math.random() * 0.18,
  }));
}

function createRound() {
  const [answer, ...remainingIcons] = shuffle(DOBBLE_ICONS);

  if (!answer) {
    throw new Error("Dobble requires at least one icon.");
  }

  const uniqueIconCount = ICONS_PER_CARD - 1;
  const leftIcons = remainingIcons.slice(0, uniqueIconCount);
  const rightIcons = remainingIcons.slice(uniqueIconCount, uniqueIconCount * 2);

  return {
    answerId: answer.id,
    leftCard: decorateCard([answer, ...leftIcons]),
    rightCard: decorateCard([answer, ...rightIcons]),
  } satisfies DobbleRound;
}

export function useDobbleGame(
  beatCount: number,
  beatDurationMs: number,
  isActive: boolean,
): Readonly<{
  answerId: string;
  chooseIcon: (iconId: string, side: DobbleSide) => void;
  leftCard: readonly DobbleCardIcon[];
  result: DobbleResult;
  rightCard: readonly DobbleCardIcon[];
  selectedSide: DobbleSide | null;
}> {
  const resolvedRef = useRef(false);
  const failureTimerRef = useRef<number | null>(null);
  const [round] = useState(createRound);
  const [result, setResult] = useState<DobbleResult>("playing");
  const [selectedSide, setSelectedSide] = useState<DobbleSide | null>(null);

  const revealFailure = useCallback((delayMs: number) => {
    if (resolvedRef.current) {
      return;
    }

    resolvedRef.current = true;
    setResult("failure");
    failureTimerRef.current = window.setTimeout(dispatchFailure, delayMs);
  }, []);

  const chooseIcon = useCallback(
    (iconId: string, side: DobbleSide) => {
      if (resolvedRef.current) {
        return;
      }

      if (iconId !== round.answerId) {
        revealFailure(FAILURE_REVEAL_MS);
        return;
      }

      resolvedRef.current = true;
      setSelectedSide(side);
      setResult("success");
      dispatchClear();
    },
    [revealFailure, round.answerId],
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const durationMs = beatCount * beatDurationMs;
    const revealLeadMs = Math.min(
      FAILURE_REVEAL_MS,
      Math.max(beatDurationMs, 200),
    );
    const revealTimer = window.setTimeout(
      () => {
        revealFailure(Math.max(revealLeadMs - 50, 0));
      },
      Math.max(durationMs - revealLeadMs, 0),
    );

    return () => {
      window.clearTimeout(revealTimer);

      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
      }
    };
  }, [beatCount, beatDurationMs, isActive, revealFailure]);

  return {
    answerId: round.answerId,
    chooseIcon,
    leftCard: round.leftCard,
    result,
    rightCard: round.rightCard,
    selectedSide,
  };
}
