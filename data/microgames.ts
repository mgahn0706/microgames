import type { FormInstruction } from "@/data/formInstructions";
import { FORM_INSTRUCTIONS } from "@/data/formInstructions";

export type MicrogameControl =
  | "arrowAndSpace"
  | "arrowKeys"
  | "koreanKeyboard"
  | "microphone"
  | "mouseClick"
  | "numberKeys"
  | "scroll"
  | "space"
  | "wasd";

export type MicrogameType = "boss" | "normal";
export type MicrogameCanvas =
  | "animalCrossingStamps"
  | "animalFarmReverseTyping"
  | "amongUsWires"
  | "brainAcademyBlocks"
  | "chromeDinoSpace"
  | "courseRegistrationNumber"
  | "default"
  | "geometryDashSpikes"
  | "kartriderCourse"
  | "laytonShapeMatch"
  | "maplestoryLieDetector"
  | "maplestoryRune"
  | "minecraftMining"
  | "pianoMelody"
  | "pokemonTyping"
  | "superMarioCoins"
  | "tetrisLineClear"
  | "undertaleMouse";

export type Microgame = Readonly<{
  beatCount: number;
  canvas: MicrogameCanvas;
  control: MicrogameControl;
  id: string;
  startPrompt: string;
  title: string;
  type: MicrogameType;
}>;

const FORM_INSTRUCTIONS_BY_CONTROL = {
  arrowAndSpace: FORM_INSTRUCTIONS[3],
  arrowKeys: FORM_INSTRUCTIONS[1],
  koreanKeyboard: FORM_INSTRUCTIONS[7],
  microphone: FORM_INSTRUCTIONS[8],
  mouseClick: FORM_INSTRUCTIONS[4],
  numberKeys: FORM_INSTRUCTIONS[6],
  scroll: FORM_INSTRUCTIONS[5],
  space: FORM_INSTRUCTIONS[0],
  wasd: FORM_INSTRUCTIONS[2],
} satisfies Record<MicrogameControl, FormInstruction>;

export const MICROGAMES = [
  {
    beatCount: 12,
    canvas: "pokemonTyping",
    control: "koreanKeyboard",
    id: "pokemon-name-typing",
    startPrompt: "이 포켓몬의 이름은?",
    title: "포켓몬",
    type: "normal",
  },

  {
    beatCount: 14,
    canvas: "amongUsWires",
    control: "mouseClick",
    id: "among-us-wire-task",
    startPrompt: "전선을 연결해라!",
    title: "어몽어스",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "animalCrossingStamps",
    control: "mouseClick",
    id: "animal-crossing-stamp-card",
    startPrompt: "도장을 세 번 찍어라!",
    title: "동물의 숲",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "superMarioCoins",
    control: "space",
    id: "super-mario-coin-count",
    startPrompt: "코인을 정확히 모아라!",
    title: "슈퍼 마리오",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "chromeDinoSpace",
    control: "space",
    id: "jump-gap",
    startPrompt: "점프해라!",
    title: "점프",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "geometryDashSpikes",
    control: "space",
    id: "geometry-dash-spike-dodge",
    startPrompt: "가시를 피해라!",
    title: "Geometry Dash",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "tetrisLineClear",
    control: "arrowAndSpace",
    id: "tetris-four-line-clear",
    startPrompt: "4줄 없애라!",
    title: "Tetris",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "minecraftMining",
    control: "mouseClick",
    id: "minecraft-diamond-mining",
    startPrompt: "다이아몬드를 캐라!",
    title: "Minecraft",
    type: "normal",
  },

  {
    beatCount: 10,
    canvas: "pianoMelody",
    control: "numberKeys",
    id: "piano-melody-repeat",
    startPrompt: "주어진 멜로디를 연주해라!",
    title: "Piano",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "brainAcademyBlocks",
    control: "numberKeys",
    id: "brain-academy-block-count",
    startPrompt: "블록은 몇 개?",
    title: "말랑말랑 두뇌교실",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "maplestoryLieDetector",
    control: "koreanKeyboard",
    id: "maplestory-lie-detector",
    startPrompt: "보이는 대로 입력해라!",
    title: "MapleStory",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "maplestoryRune",
    control: "arrowKeys",
    id: "maplestory-rune-sequence",
    startPrompt: "순서대로 입력해라!",
    title: "MapleStory Rune",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "laytonShapeMatch",
    control: "numberKeys",
    id: "layton-shape-match",
    startPrompt: "같은 모양을 찾아라!",
    title: "Layton",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "undertaleMouse",
    control: "arrowKeys",
    id: "undertale-bone-dodge",
    startPrompt: "피해라!",
    title: "언더테일",
    type: "normal",
  },

  {
    beatCount: 36,
    canvas: "animalFarmReverseTyping",
    control: "koreanKeyboard",
    id: "animal-farm-reverse-typing",
    startPrompt: "단어를 거꾸로 써라!",
    title: "AnimalFarm",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "kartriderCourse",
    control: "arrowKeys",
    id: "kartrider-village-canal-course",
    startPrompt: "완주해라!",
    title: "카트라이더",
    type: "boss",
  },
] satisfies Microgame[];

const NORMAL_MICROGAMES = MICROGAMES.filter(
  (microgame) => microgame.type === "normal",
);
const BOSS_MICROGAMES = MICROGAMES.filter(
  (microgame) => microgame.type === "boss",
);

function getSeededMicrogameIndex(
  roundNumber: number,
  sessionSeed: number,
  poolSize: number,
) {
  const seed = Math.sin((roundNumber + 1) * 9301 + sessionSeed * 49297);
  const normalizedSeed = seed - Math.floor(seed);

  return Math.floor(normalizedSeed * poolSize);
}

export function isBossMicrogameRound(roundNumber: number) {
  return roundNumber > 1 && (roundNumber - 1) % 12 === 0;
}

export function getMicrogamePoolForRound(roundNumber: number) {
  return isBossMicrogameRound(roundNumber)
    ? BOSS_MICROGAMES
    : NORMAL_MICROGAMES;
}

export function getMicrogameForRound(roundNumber: number, sessionSeed: number) {
  const microgamePool = getMicrogamePoolForRound(roundNumber);

  return microgamePool[
    getSeededMicrogameIndex(roundNumber, sessionSeed, microgamePool.length)
  ];
}

export function getMicrogameFormInstruction(microgame: Microgame) {
  return FORM_INSTRUCTIONS_BY_CONTROL[microgame.control];
}

export function isMicrogameClearKey(
  control: MicrogameControl,
  event: KeyboardEvent,
) {
  if (control === "arrowKeys") {
    return ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(
      event.key,
    );
  }

  if (control === "space") {
    return event.code === "Space";
  }

  if (control === "wasd") {
    return (
      ["KeyA", "KeyD", "KeyS", "KeyW"].includes(event.code) ||
      ["a", "d", "s", "w"].includes(event.key.toLowerCase())
    );
  }

  if (control === "arrowAndSpace") {
    return (
      event.code === "Space" ||
      ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)
    );
  }

  if (control === "numberKeys") {
    return /^\d$/.test(event.key);
  }

  if (control === "koreanKeyboard") {
    return /^[ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(event.key);
  }

  if (control === "microphone") {
    return event.key.length > 0;
  }

  return false;
}
