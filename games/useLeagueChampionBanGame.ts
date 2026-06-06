"use client";

import { useCallback, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";
import { bgmLibrary } from "@/lib/bgmLibrary";

export type LeagueChampion = Readonly<{
  id: string;
  nameKo: string;
}>;

export const LEAGUE_CHAMPIONS = [
  { id: "garen", nameKo: "가렌" },
  { id: "galio", nameKo: "갈리오" },
  { id: "gangplank", nameKo: "갱플랭크" },
  { id: "gragas", nameKo: "그라가스" },
  { id: "graves", nameKo: "그레이브즈" },
  { id: "gnar", nameKo: "나르" },
  { id: "nami", nameKo: "나미" },
  { id: "nasus", nameKo: "나서스" },
  { id: "nautilus", nameKo: "노틸러스" },
  { id: "nocturne", nameKo: "녹턴" },
  { id: "nunuWillump", nameKo: "누누와 윌럼프" },
  { id: "nidalee", nameKo: "니달리" },
  { id: "darius", nameKo: "다리우스" },
  { id: "diana", nameKo: "다이애나" },
  { id: "draven", nameKo: "드레이븐" },
  { id: "ryze", nameKo: "라이즈" },
  { id: "rakan", nameKo: "라칸" },
  { id: "rammus", nameKo: "람머스" },
  { id: "lux", nameKo: "럭스" },
  { id: "rumble", nameKo: "럼블" },
  { id: "renekton", nameKo: "레넥톤" },
  { id: "leona", nameKo: "레오나" },
  { id: "reksai", nameKo: "렉사이" },
  { id: "rengar", nameKo: "렝가" },
  { id: "lucian", nameKo: "루시안" },
  { id: "lulu", nameKo: "룰루" },
  { id: "leblanc", nameKo: "르블랑" },
  { id: "leeSin", nameKo: "리 신" },
  { id: "riven", nameKo: "리븐" },
  { id: "lissandra", nameKo: "리산드라" },
] satisfies LeagueChampion[];

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getRandomChampion() {
  return LEAGUE_CHAMPIONS[Math.floor(Math.random() * LEAGUE_CHAMPIONS.length)];
}

function playChampionSelectSound() {
  bgmLibrary.playSoundEffect("leagueChampionSelect").catch((error: unknown) => {
    console.error(error);
  });
}

export function useLeagueChampionBanGame(): Readonly<{
  banChampion: (champion: LeagueChampion) => void;
  failByMissClick: () => void;
  hasFailed: boolean;
  selectedChampionId: string | null;
  targetChampion: LeagueChampion;
}> {
  const hasClearedRef = useRef(false);
  const hasFailedRef = useRef(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(
    null,
  );
  const [targetChampion] = useState(getRandomChampion);

  const fail = useCallback(() => {
    if (hasClearedRef.current || hasFailedRef.current) {
      return;
    }

    hasFailedRef.current = true;
    setHasFailed(true);
    dispatchFailure();
  }, []);

  const banChampion = useCallback(
    (champion: LeagueChampion) => {
      if (hasClearedRef.current || hasFailedRef.current) {
        return;
      }

      setSelectedChampionId(champion.id);
      playChampionSelectSound();

      if (champion.id !== targetChampion.id) {
        fail();
        return;
      }

      hasClearedRef.current = true;
      dispatchClear();
    },
    [fail, targetChampion.id],
  );

  return {
    banChampion,
    failByMissClick: fail,
    hasFailed,
    selectedChampionId,
    targetChampion,
  };
}
