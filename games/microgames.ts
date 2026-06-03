import type { FormInstruction } from "@/games/formInstructions";
import { FORM_INSTRUCTIONS } from "@/games/formInstructions";

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

export type Microgame = Readonly<{
  beatCount: number;
  control: MicrogameControl;
  id: string;
  instruction: string;
  title: string;
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
    beatCount: 8,
    control: "arrowKeys",
    id: "catch-arrow",
    instruction: "방향키 중 아무 키나 눌러 엘리베이터를 붙잡으세요.",
    title: "방향 잡기",
  },
  {
    beatCount: 8,
    control: "space",
    id: "jump-gap",
    instruction: "스페이스를 눌러 틈을 뛰어넘으세요.",
    title: "점프",
  },
  {
    beatCount: 8,
    control: "mouseClick",
    id: "press-button",
    instruction: "마우스로 버튼을 클릭하세요.",
    title: "버튼 누르기",
  },
  {
    beatCount: 10,
    control: "wasd",
    id: "balance-wasd",
    instruction: "WASD 중 아무 키나 눌러 균형을 잡으세요.",
    title: "균형 잡기",
  },
  {
    beatCount: 8,
    control: "scroll",
    id: "scroll-lift",
    instruction: "마우스 휠을 굴려 엘리베이터를 올리세요.",
    title: "휠 올리기",
  },
  {
    beatCount: 12,
    control: "arrowAndSpace",
    id: "dash-jump",
    instruction: "방향키나 스페이스를 눌러 대시 점프를 성공시키세요.",
    title: "대시 점프",
  },
  {
    beatCount: 8,
    control: "numberKeys",
    id: "code-pad",
    instruction: "숫자키 중 아무 키나 눌러 비밀번호를 입력하세요.",
    title: "비밀번호",
  },
  {
    beatCount: 8,
    control: "koreanKeyboard",
    id: "type-meow",
    instruction: "한글 키를 눌러 고양이에게 신호를 보내세요.",
    title: "야옹 입력",
  },
  {
    beatCount: 8,
    control: "microphone",
    id: "call-cat",
    instruction: "임시 구현: 아무 키나 눌러 마이크 입력을 성공 처리하세요.",
    title: "고양이 부르기",
  },
] satisfies Microgame[];

function getSeededMicrogameIndex(roundNumber: number, sessionSeed: number) {
  const seed = Math.sin((roundNumber + 1) * 9301 + sessionSeed * 49297);
  const normalizedSeed = seed - Math.floor(seed);

  return Math.floor(normalizedSeed * MICROGAMES.length);
}

export function getMicrogameForRound(roundNumber: number, sessionSeed: number) {
  return MICROGAMES[getSeededMicrogameIndex(roundNumber, sessionSeed)];
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
    return ["a", "d", "s", "w"].includes(event.key.toLowerCase());
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
