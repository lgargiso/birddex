import { NextRequest, NextResponse } from "next/server";
import { getWikipediaBird } from "@/lib/wikipedia";
import { getBirdSounds } from "@/lib/xenocanto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const commonName = searchParams.get("name") || code;

  const [wiki, sounds] = await Promise.all([
    getWikipediaBird(commonName),
    getBirdSounds(commonName),
  ]);

  return NextResponse.json({ wiki, sounds });
}
