"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type PokerougeShopOption = Readonly<{
  id: "greatBall" | "masterBall" | "pokeBall" | "rogueBall" | "ultraBall";
  color: string;
  imageSrc: string;
  label: string;
}>;

export const POKEROUGE_SHOP_OPTIONS = [
  {
    color: "#f8fafc",
    id: "pokeBall",
    imageSrc: "/games/pokerouge/images/poke-ball.png",
    label: "몬스터볼",
  },
  {
    color: "#3b82f6",
    id: "greatBall",
    imageSrc: "/games/pokerouge/images/great-ball.png",
    label: "슈퍼볼",
  },
  {
    color: "#facc15",
    id: "ultraBall",
    imageSrc: "/games/pokerouge/images/ultra-ball.png",
    label: "하이퍼볼",
  },
  {
    color: "#ef4444",
    id: "rogueBall",
    imageSrc: "/games/pokerouge/images/rogue-ball.png",
    label: "로그볼",
  },
  {
    color: "#a855f7",
    id: "masterBall",
    imageSrc: "/games/pokerouge/images/master-ball.png",
    label: "마스터볼",
  },
] as const satisfies readonly PokerougeShopOption[];

const MASTER_BALL_ID = "masterBall";

function shuffleOptions() {
  return [...POKEROUGE_SHOP_OPTIONS].sort(() => Math.random() - 0.5);
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function playSoundEffect(track: "pokerougeBuy" | "pokerougeSelect") {
  bgmLibrary.playSoundEffect(track).catch((error: unknown) => {
    console.error(error);
  });
}

function getSelectionDelta(key: string) {
  if (key === "ArrowDown" || key === "ArrowRight") {
    return 1;
  }

  if (key === "ArrowUp" || key === "ArrowLeft") {
    return -1;
  }

  return 0;
}

export function usePokerougeShopGame(): Readonly<{
  options: readonly PokerougeShopOption[];
  selectedIndex: number;
  selectedOption: PokerougeShopOption;
}> {
  const hasClearedRef = useRef(false);
  const [options] = useState<readonly PokerougeShopOption[]>(shuffleOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedOption = options[selectedIndex];

  const moveSelection = useCallback((delta: number) => {
    setSelectedIndex((currentIndex) => {
      const optionCount = options.length;
      const nextIndex = (currentIndex + delta + optionCount) % optionCount;

      if (nextIndex !== currentIndex) {
        playSoundEffect("pokerougeSelect");
      }

      return nextIndex;
    });
  }, [options.length]);

  const submitSelection = useCallback(() => {
    if (hasClearedRef.current || selectedOption.id !== MASTER_BALL_ID) {
      playSoundEffect("pokerougeSelect");
      return;
    }

    hasClearedRef.current = true;
    playSoundEffect("pokerougeBuy");
    dispatchClear();
  }, [selectedOption.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const delta = getSelectionDelta(event.key);
      const isSubmit = event.code === "Space" || event.key === " ";

      if (delta === 0 && !isSubmit) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (delta !== 0) {
        moveSelection(delta);
        return;
      }

      if (!event.repeat) {
        submitSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [moveSelection, submitSelection]);

  return {
    options,
    selectedIndex,
    selectedOption,
  };
}
