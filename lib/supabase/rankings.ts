import "server-only";

import { unstable_cache } from "next/cache";
import {
  RANKING_CACHE_TAG,
  RANKING_GAME_ID,
  RANKING_LIMIT,
  type Ranking,
} from "@/lib/rankings";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const RANKING_CACHE_SECONDS = 60;

async function fetchTopRankings(): Promise<Ranking[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("rankings")
    .select("username, best_score")
    .eq("game_id", RANKING_GAME_ID)
    .order("best_score", { ascending: false })
    .limit(RANKING_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch rankings: ${error.message}`);
  }

  return (data ?? []).flatMap((ranking) => {
    if (
      typeof ranking.username !== "string" ||
      typeof ranking.best_score !== "number"
    ) {
      return [];
    }

    return [{ score: ranking.best_score, username: ranking.username }];
  });
}

export const getTopRankings = unstable_cache(
  fetchTopRankings,
  ["main-top-rankings"],
  {
    revalidate: RANKING_CACHE_SECONDS,
    tags: [RANKING_CACHE_TAG],
  },
);
