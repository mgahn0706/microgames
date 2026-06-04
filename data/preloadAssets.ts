import { FORM_INSTRUCTIONS } from "@/data/formInstructions";

export const ALL_GAME_PRELOAD_ASSETS = [
  "/images/main-elevator-1.png",
  "/images/main-elevator-2.png",
  "/images/main-elevator-fail-1.png",
  "/images/main-elevator-fail-2.png",
  "/images/main-elevator-success-1.png",
  "/images/main-elevator-success-2.png",
  "/images/game-main-logo.png",
  "/images/life-active.png",
  "/images/life-deactive.png",
  "/images/loading-spinner.png",
  ...FORM_INSTRUCTIONS.map(({ imageSrc }) => imageSrc),
  "/sounds/fail.mp3",
  "/sounds/game-over.mp3",
  "/sounds/intermission.mp3",
  "/sounds/results-and-main.mp3",
  "/sounds/success.mp3",
];
