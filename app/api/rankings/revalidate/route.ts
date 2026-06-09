import { revalidateTag } from "next/cache";
import { RANKING_CACHE_TAG } from "@/lib/rankings";

export async function POST() {
  revalidateTag(RANKING_CACHE_TAG, { expire: 0 });

  return Response.json({ revalidated: true });
}
