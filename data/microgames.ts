import type { FormInstruction } from "@/data/formInstructions";
import { FORM_INSTRUCTIONS } from "@/data/formInstructions";

export type MicrogameControl =
  | "arrowAndSpace"
  | "arrowKeys"
  | "koreanKeyboard"
  | "mouseClick"
  | "mouseDrag"
  | "mouseHold"
  | "numberKeys"
  | "space";

export type MicrogameType = "boss" | "normal";
export type MicrogameCanvas =
  | "animalCrossingStamps"
  | "animalFarmReverseTyping"
  | "amongUsWires"
  | "brainAcademyBlocks"
  | "chromeDinoSpace"
  | "cookieRun"
  | "courseRegistrationNumber"
  | "default"
  | "geometryDashSpikes"
  | "halliGalliBoss"
  | "hancomTyping"
  | "kartriderCourse"
  | "laytonShapeMatch"
  | "leagueChampionBan"
  | "maplestoryLieDetector"
  | "maplestoryRune"
  | "minecraftMining"
  | "pianoMelody"
  | "pokemonTyping"
  | "superMarioCoins"
  | "tetrisLineClear"
  | "undertaleMouse"
  | "zeldaCircleDraw";

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
  arrowAndSpace: getFormInstructionByControl("arrowAndSpace"),
  arrowKeys: getFormInstructionByControl("arrowKeys"),
  koreanKeyboard: getFormInstructionByControl("koreanKeyboard"),
  mouseClick: getFormInstructionByControl("mouseClick"),
  mouseDrag: getFormInstructionByControl("mouseDrag"),
  mouseHold: getFormInstructionByControl("mouseHold"),
  numberKeys: getFormInstructionByControl("numberKeys"),
  space: getFormInstructionByControl("space"),
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
    control: "mouseDrag",
    id: "among-us-wire-task",
    startPrompt: "연결해라!",
    title: "어몽어스",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "animalCrossingStamps",
    control: "mouseClick",
    id: "animal-crossing-stamp-card",
    startPrompt: "찍어라!",
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
    canvas: "cookieRun",
    control: "arrowAndSpace",
    id: "cookie-run-obstacle-dodge",
    startPrompt: "달려라!",
    title: "Cookie Run",
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
    canvas: "hancomTyping",
    control: "koreanKeyboard",
    id: "hancom-word-typing",
    startPrompt: "단어를 입력해라!",
    title: "한컴",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "zeldaCircleDraw",
    control: "mouseDrag",
    id: "zelda-circle-draw",
    startPrompt: "동그라미를 그려라!",
    title: "Zelda",
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
    control: "mouseHold",
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
    startPrompt: "연주해라!",
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
    startPrompt: "입력해라!",
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
    beatCount: 12,
    canvas: "leagueChampionBan",
    control: "mouseClick",
    id: "league-of-legend-champion-ban",
    startPrompt: "챔피언을 밴해라!",
    title: "League of Legend",
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
    canvas: "halliGalliBoss",
    control: "mouseClick",
    id: "halli-galli-bell-boss",
    startPrompt: "과일이 5개일 때 종을 쳐라!",
    title: "Halli Galli",
    type: "boss",
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

function getFormInstructionByControl(control: MicrogameControl) {
  const formInstruction = FORM_INSTRUCTIONS.find(
    (instruction) => instruction.control === control,
  );

  if (!formInstruction) {
    throw new Error(`Missing form instruction for control: ${control}`);
  }

  return formInstruction;
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

  return false;
}
