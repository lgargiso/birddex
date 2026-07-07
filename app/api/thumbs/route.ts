import { NextRequest, NextResponse } from "next/server";
import { getWikipediaBird } from "@/lib/wikipedia";

// Batch Wikipedia thumbnails for dex tiles. Each underlying summary fetch is
// cached server-side (revalidate 24h in lib/wikipedia), so repeat calls are cheap.
export async function POST(req: NextRequest) {
  const { names } = await req.json();
  if (!Array.isArray(names)) {
    return NextResponse.json({ error: "names must be an array" }, { status: 400 });
  }
  const capped: string[] = names.slice(0, 100).filter((n) => typeof n === "string");

  const entries = await Promise.all(
    capped.map(async (name) => {
      const wiki = await getWikipediaBird(name);
      return [name, wiki?.imageUrl || null] as const;
    })
  );

  return NextResponse.json({ thumbs: Object.fromEntries(entries) });
}
