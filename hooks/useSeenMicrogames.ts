"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MICROGAMES } from "@/data/microgames";

const SEEN_MICROGAME_IDS_STORAGE_KEY = "catTower.seenMicrogameIds";
const SEEN_MICROGAME_IDS_CHANGE_EVENT = "catTower.seenMicrogameIdsChange";
const MICROGAME_ID_SET = new Set(MICROGAMES.map(({ id }) => id));

function parseSeenMicrogameIds(storedValue: string | null) {
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

function readSeenMicrogameIds() {
  if (typeof window === "undefined") {
    return [];
  }

  return parseSeenMicrogameIds(
    window.localStorage.getItem(SEEN_MICROGAME_IDS_STORAGE_KEY),
  );
}

function readSeenMicrogameIdsSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(SEEN_MICROGAME_IDS_STORAGE_KEY) ?? "";
}

function writeSeenMicrogameIds(seenMicrogameIds: readonly string[]) {
  window.localStorage.setItem(
    SEEN_MICROGAME_IDS_STORAGE_KEY,
    JSON.stringify(seenMicrogameIds),
  );
  window.dispatchEvent(new Event(SEEN_MICROGAME_IDS_CHANGE_EVENT));
}

function subscribeSeenMicrogameIds(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SEEN_MICROGAME_IDS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SEEN_MICROGAME_IDS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SEEN_MICROGAME_IDS_CHANGE_EVENT, onStoreChange);
  };
}

export function useSeenMicrogames() {
  const seenMicrogameIdsSnapshot = useSyncExternalStore(
    subscribeSeenMicrogameIds,
    readSeenMicrogameIdsSnapshot,
    () => "",
  );
  const seenMicrogameIds = useMemo(
    () => parseSeenMicrogameIds(seenMicrogameIdsSnapshot),
    [seenMicrogameIdsSnapshot],
  );

  const recordSeenMicrogameId = useCallback((microgameId: string) => {
    if (!MICROGAME_ID_SET.has(microgameId)) {
      return;
    }

    const currentSeenMicrogameIds = readSeenMicrogameIds();

    if (currentSeenMicrogameIds.includes(microgameId)) {
      return;
    }

    const nextSeenMicrogameIds = [...currentSeenMicrogameIds, microgameId];

    writeSeenMicrogameIds(nextSeenMicrogameIds);
  }, []);

  return {
    recordSeenMicrogameId,
    seenMicrogameIds,
  };
}
