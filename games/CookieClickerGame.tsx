"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useCookieClickerGame } from "@/games/useCookieClickerGame";

const BACKGROUND_SRC = "/games/cookie-clicker/images/background.png";
const COOKIE_SRC = "/games/cookie-clicker/images/cookie.png";

export function CookieClickerGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    cookieCount,
    floatingClicks,
    handleCookiePointerDown,
    isPressingCookie,
    targetCookieCount,
  } = useCookieClickerGame();
  const progress = Math.min(cookieCount / targetCookieCount, 1);

  return (
    <div className="relative h-screen w-screen touch-none select-none overflow-hidden bg-[#2f1f13] text-[#fff3d6]">
      <Image
        alt=""
        className="object-cover"
        draggable={false}
        fill
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,236,174,0.16),rgba(34,20,11,0.16)_38%,rgba(18,10,6,0.66)_78%)]" />
      <div className="absolute left-0 top-0 flex w-full items-start justify-between gap-4 p-5 sm:p-7">
        <div className="min-w-44 rounded border border-[#f9d58a]/55 bg-[#1d1209]/82 px-4 py-3 shadow-[0_8px_0_rgba(0,0,0,0.22)]">
          <p className="text-xs font-black uppercase text-[#f7c66a]">
            Cookies
          </p>
          <p className="mt-1 text-4xl font-black leading-none text-white">
            {cookieCount}
          </p>
        </div>
        <div className="w-44 rounded border border-[#f9d58a]/45 bg-[#1d1209]/72 px-3 py-2 text-right shadow-[0_8px_0_rgba(0,0,0,0.2)]">
          <p className="text-xs font-black text-[#f7c66a]">목표</p>
          <p className="mt-1 text-lg font-black text-white">
            10개
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/45">
            <div
              className="h-full rounded-full bg-[#f7c66a] transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center pt-16">
        <button
          aria-label="쿠키 클릭"
          className={`relative grid size-[min(66vw,66vh,27rem)] place-items-center rounded-full outline-none transition-transform duration-75 ${
            isPressingCookie ? "scale-90" : "scale-100 hover:scale-[1.03]"
          }`}
          onPointerDown={handleCookiePointerDown}
          type="button"
        >
          <span
            aria-hidden="true"
            className="absolute inset-[5%] rounded-full bg-[#6f4421] shadow-[0_22px_0_#2b1609,0_30px_48px_rgba(0,0,0,0.48),inset_0_-18px_26px_rgba(78,39,13,0.38)]"
          />
          <Image
            alt=""
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_0_rgba(42,20,7,0.38)]"
            draggable={false}
            height={512}
            priority
            src={COOKIE_SRC}
            unoptimized
            width={512}
          />
          {floatingClicks.map((floatingClick) => (
            <span
              aria-hidden="true"
              className="cookie-clicker-plus-one pointer-events-none absolute z-20 text-4xl font-black text-white drop-shadow-[0_3px_0_#4a260d]"
              key={floatingClick.id}
              style={{
                left: floatingClick.x,
                top: floatingClick.y,
              }}
            >
              +1
            </span>
          ))}
        </button>
      </div>

      <style jsx>{`
        .cookie-clicker-plus-one {
          animation: cookie-clicker-plus-one 680ms ease-out both;
          transform: translate(-50%, -50%);
        }

        @keyframes cookie-clicker-plus-one {
          0% {
            opacity: 0;
            transform: translate(-50%, -28%) scale(0.7);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -170%) scale(1.16);
          }
        }
      `}</style>
    </div>
  );
}
