"use client";

import { useCallback, useState } from "react";
import { MICROGAMES } from "@/data/microgames";

const SEEN_MICROGAME_IDS_STORAGE_KEY = "catTower.seenMicrogameIds";
const MICROGAME_ID_SET = new Set(MICROGAMES.map(({ id }) => id));

function readSeenMicrogameIds() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(
    SEEN_MICROGAME_IDS_STORAGE_KEY,
  );

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (value): value is string =>
        typeof value === "string" && MICROGAME_ID_SET.has(value),
    );
  } catch {
    return [];
  }
}

function writeSeenMicrogameIds(seenMicrogameIds: readonly string[]) {
  window.localStorage.setItem(
    SEEN_MICROGAME_IDS_STORAGE_KEY,
    JSON.stringify(seenMicrogameIds),
  );
}

export function useSeenMicrogames() {
  const [seenMicrogameIds, setSeenMicrogameIds] =
    useState(readSeenMicrogameIds);

  const recordSeenMicrogameId = useCallback((microgameId: string) => {
    if (!MICROGAME_ID_SET.has(microgameId)) {
      return;
    }

    setSeenMicrogameIds((currentSeenMicrogameIds) => {
      if (currentSeenMicrogameIds.includes(microgameId)) {
        return currentSeenMicrogameIds;
      }

      const nextSeenMicrogameIds = [...currentSeenMicrogameIds, microgameId];

      writeSeenMicrogameIds(nextSeenMicrogameIds);

      return nextSeenMicrogameIds;
    });
  }, []);

  return {
    recordSeenMicrogameId,
    seenMicrogameIds,
  };
}
