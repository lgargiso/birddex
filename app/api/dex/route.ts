import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRegionSpecies, getNearbySpecies, getRecentSpeciesCodes, rarityFor, toRegionCode } from "@/lib/ebird";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "US";
  const state = searchParams.get("state") || undefined;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const regionCode = toRegionCode(country, state);

  const [species, recent7, recent30] = await Promise.all([
    lat && lng
      ? getNearbySpecies(parseFloat(lat), parseFloat(lng))
      : getRegionSpecies(regionCode),
    getRecentSpeciesCodes(regionCode, 7),
    getRecentSpeciesCodes(regionCode, 30),
  ]);

  // If logged in, merge caught status + the user's own photo per species
  const caughtCodes = new Set<string>();
  const photoBySpecies = new Map<string, string>();
  if (userId) {
    const [sightings, photos] = await Promise.all([
      db.sighting.findMany({
        where: { userId },
        select: { speciesCode: true },
      }),
      db.photo.findMany({
        where: { userId },
        orderBy: { spottedAt: "desc" },
        select: { speciesCode: true, blobUrl: true },
      }),
    ]);
    for (const s of sightings) caughtCodes.add(s.speciesCode);
    for (const p of photos) {
      if (!photoBySpecies.has(p.speciesCode)) photoBySpecies.set(p.speciesCode, p.blobUrl);
    }
  }

  const dex = species.map((s, i) => ({
    ...s,
    number: i + 1,
    caught: caughtCodes.has(s.speciesCode),
    rarity: rarityFor(s.speciesCode, recent7, recent30),
    photoUrl: photoBySpecies.get(s.speciesCode) || null,
  }));

  return NextResponse.json(dex);
}
