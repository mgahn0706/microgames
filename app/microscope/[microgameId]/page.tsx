import { notFound } from "next/navigation";
import { PracticeGameScreen } from "@/components/game-flow/PracticeGameScreen";
import { MICROGAMES } from "@/data/microgames";
import { parsePracticeSpeedMultiplier } from "@/lib/practiceSpeed";

export default async function MicrogamePracticePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ microgameId: string }>;
  searchParams: Promise<{ speed?: string | string[] }>;
}>) {
  const { microgameId } = await params;
  const { speed } = await searchParams;
  const practiceSpeedMultiplier = parsePracticeSpeedMultiplier(
    Array.isArray(speed) ? speed[0] : speed,
  );
  const microgame = MICROGAMES.find(
    (candidate) => candidate.id === microgameId,
  );

  if (!microgame) {
    notFound();
  }

  return (
    <PracticeGameScreen
      microgame={microgame}
      practiceSpeedMultiplier={practiceSpeedMultiplier}
    />
  );
}
