"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  BGM_THEME_STORAGE_KEY,
  DEFAULT_BGM_THEME_OPTION,
  getBgmThemeOption,
} from "@/data/bgmThemes";
import { bgmLibrary } from "@/lib/bgmLibrary";

const BGM_THEME_SELECTION_EVENT = "microgames-bgm-theme-selection";

function readStoredBgmThemeId() {
  try {
    return window.localStorage.getItem(BGM_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot() {
  return getBgmThemeOption(readStoredBgmThemeId()).id;
}

function getServerSnapshot() {
  return DEFAULT_BGM_THEME_OPTION.id;
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === BGM_THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(BGM_THEME_SELECTION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(BGM_THEME_SELECTION_EVENT, onStoreChange);
  };
}

export function useBgmThemeSelection() {
  const selectedThemeId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const selectedTheme = getBgmThemeOption(selectedThemeId);

  useEffect(() => {
    bgmLibrary.setBgmTheme(selectedTheme.id);
  }, [selectedTheme.id]);

  const selectBgmTheme = useCallback((themeId: string) => {
    const nextTheme = getBgmThemeOption(themeId);

    try {
      window.localStorage.setItem(BGM_THEME_STORAGE_KEY, nextTheme.id);
    } catch {
      // Keep in-memory selection working when storage is unavailable.
    }

    bgmLibrary.setBgmTheme(nextTheme.id);
    window.dispatchEvent(new CustomEvent(BGM_THEME_SELECTION_EVENT));
  }, []);

  return {
    selectBgmTheme,
    selectedTheme,
  };
}
