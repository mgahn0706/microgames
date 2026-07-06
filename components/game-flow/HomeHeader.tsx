"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BGM_THEME_OPTIONS } from "@/data/bgmThemes";
import { useBgmThemeSelection } from "@/hooks/useBgmThemeSelection";

export type HomeView = "home" | "howToPlay" | "microscope";
export type NavigationView = HomeView | "ranking";

const HOME_NAV_ITEMS = [
  { href: "/", label: "홈", view: "home" },
  { href: "/how-to-play", label: "게임 방법", view: "howToPlay" },
  { href: "/microscope", label: "도감", view: "microscope" },
  { href: "/ranking", label: "랭킹", view: "ranking" },
] as const;

export function HomeHeader({
  currentView,
  isStarting = false,
}: Readonly<{
  currentView: NavigationView;
  isStarting?: boolean;
}>) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { selectBgmTheme, selectedTheme } = useBgmThemeSelection();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 ${
        isStarting ? "main-screen-exit-up" : ""
      }`}
    >
      <nav className="w-full bg-white/10 px-2 py-3 shadow-[0_0_28px_rgba(103,232,249,0.18)] backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <Link
            className="flex shrink-0 items-center gap-2 px-1 text-sm font-black tracking-normal text-cyan-50 drop-shadow-[0_0_12px_rgba(103,232,249,0.72)] sm:px-3 sm:text-base"
            href="/"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="size-7 object-contain drop-shadow-[0_0_10px_rgba(103,232,249,0.5)]"
              height={28}
              src="/games/game-flow/images/timer.png"
              unoptimized
              width={28}
            />
            <span className="hidden sm:inline">캣타워 오르기</span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="grid grid-cols-4 gap-1 rounded-md border border-white/10 bg-black/20 p-1">
              {HOME_NAV_ITEMS.map((item) => {
                const isActive = currentView === item.view;

                return (
                  <Link
                    className={`rounded px-2 py-2 text-center text-[0.68rem] font-black transition sm:min-w-20 sm:px-3 sm:text-sm ${
                      isActive
                        ? "bg-cyan-100 text-black shadow-[0_0_18px_rgba(103,232,249,0.38)]"
                        : "text-cyan-50/78 hover:bg-white/10 hover:text-white"
                    }`}
                    href={item.href}
                    key={item.view}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="relative">
              <button
                aria-expanded={isSettingsOpen}
                aria-label="설정 열기"
                className={`grid size-10 place-items-center rounded-md border bg-black/20 text-cyan-50/82 transition hover:bg-white/10 hover:text-white ${
                  isSettingsOpen
                    ? "border-cyan-100/65 text-cyan-50 shadow-[0_0_18px_rgba(103,232,249,0.34)]"
                    : "border-white/10"
                }`}
                onClick={() => {
                  setIsSettingsOpen((currentValue) => !currentValue);
                }}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5H9v2.5Z" />
                  <path d="M9 16V5l10-2v11" />
                  <path d="M19 14a2.5 2.5 0 1 1-2.5-2.5H19V14Z" />
                </svg>
              </button>
              {isSettingsOpen ? (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-cyan-100/25 bg-slate-950/95 p-3 text-cyan-50 shadow-[0_0_26px_rgba(103,232,249,0.24)] backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-normal text-cyan-100/62">
                    BGM 테마
                  </p>
                  <div className="mt-2 grid gap-1">
                    {BGM_THEME_OPTIONS.map((option) => {
                      const isSelected = selectedTheme.id === option.id;

                      return (
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm font-black transition ${
                            isSelected
                              ? "border-cyan-100/70 bg-cyan-100 text-black"
                              : "border-white/10 bg-white/[0.03] text-cyan-50/82 hover:bg-white/10 hover:text-white"
                          }`}
                          key={option.id}
                        >
                          <input
                            checked={isSelected}
                            className="size-4 accent-cyan-200"
                            name="bgm-theme"
                            onChange={() => {
                              selectBgmTheme(option.id);
                            }}
                            type="radio"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
