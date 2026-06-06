export type FormInstruction = Readonly<{
  alt: string;
  control: string;
  description: string;
  imageSrc: string;
  title: string;
}>;

export const FORM_INSTRUCTIONS = [
  {
    alt: "Space key control form",
    control: "space",
    description: "스페이스 입력 타이밍을 박자에 맞춰 성공시키세요.",
    imageSrc: "/games/forms/images/space.png",
    title: "스페이스",
  },
  {
    alt: "Arrow keys control form",
    control: "arrowKeys",
    description: "방향키 입력을 화면 지시에 맞춰 빠르게 처리하세요.",
    imageSrc: "/games/forms/images/arrow-keys.png",
    title: "방향키",
  },
  {
    alt: "Arrow keys and space key control form",
    control: "arrowAndSpace",
    description: "방향키와 스페이스 입력을 함께 처리하세요.",
    imageSrc: "/games/forms/images/arrow-and-space.png",
    title: "방향키 + 스페이스",
  },
  {
    alt: "Mouse click control form",
    control: "mouseClick",
    description: "마우스 클릭을 제한 시간 안에 정확히 처리하세요.",
    imageSrc: "/games/forms/images/click.png",
    title: "마우스 클릭",
  },
  {
    alt: "Mouse drag control form",
    control: "mouseDrag",
    description: "마우스를 누른 채 움직이거나 유지해 목표를 완료하세요.",
    imageSrc: "/games/forms/images/drag.png",
    title: "마우스 드래그",
  },
  {
    alt: "Mouse hold control form",
    control: "mouseHold",
    description: "마우스를 누른 채 유지해 제한 시간 안에 목표를 완료하세요.",
    imageSrc: "/games/forms/images/hold.png",
    title: "마우스 홀드",
  },
  {
    alt: "Number keys control form",
    control: "numberKeys",
    description: "숫자키를 확인하고 제한 시간 안에 입력하세요.",
    imageSrc: "/games/forms/images/number-keys.png",
    title: "숫자키",
  },
  {
    alt: "Korean keyboard control form",
    control: "koreanKeyboard",
    description: "한글 키 입력을 리듬에 맞춰 처리하세요.",
    imageSrc: "/games/forms/images/korean-keyboard.png",
    title: "한글 타자",
  },
] satisfies FormInstruction[];
