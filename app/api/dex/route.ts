import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRegionSpecies, getNearbySpecies, toRegionCode } from "@/lib/ebird";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "US";
  const state = searchParams.get("state") || undefined;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  let species: Awaited<ReturnType<typeof getNearbySpecies>> = [];
  if (lat && lng) {
    species = await getNearbySpecies(parseFloat(lat), parseFloat(lng));
  } else {
    species = await getRegionSpecies(toRegionCode(country, state));
  }

  // If logged in, merge caught status
  let caughtCodes = new Set<string>();
  if (userId) {
    const sightings = await db.sighting.findMany({
      where: { userId },
      select: { speciesCode: true },
    });
    caughtCodes = new Set(sightings.map((s) => s.speciesCode));
  }

  const dex = species.map((s, i) => ({
    ...s,
    number: i + 1,
    caught: caughtCodes.has(s.speciesCode),
  }));

  return NextResponse.json(dex);
}
