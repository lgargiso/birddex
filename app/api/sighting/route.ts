import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface SightingInput {
  speciesCode: string;
  commonName: string;
  sciName?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  description?: string;
  habitat?: string;
  funFact?: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Ensure user exists
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  // Bulk mode — migrating guest catches from localStorage after sign-in
  if (Array.isArray(body.sightings)) {
    const inputs: SightingInput[] = body.sightings.filter(
      (s: SightingInput) => s?.speciesCode && s?.commonName
    );
    const result = await db.sighting.createMany({
      data: inputs.map((s) => ({
        userId,
        speciesCode: s.speciesCode,
        commonName: s.commonName,
        sciName: s.sciName,
      })),
      skipDuplicates: true,
    });
    return NextResponse.json({ migrated: result.count });
  }

  const { speciesCode, commonName, sciName, photoUrl, latitude, longitude, confidence, description, habitat, funFact } =
    body as SightingInput;
  if (!speciesCode || !commonName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // First sighting wins — a species is only "caught" once
  const existing = await db.sighting.findUnique({
    where: { userId_speciesCode: { userId, speciesCode } },
  });

  if (existing) {
    return NextResponse.json({ sighting: existing, isNew: false });
  }

  const sighting = await db.sighting.create({
    data: { userId, speciesCode, commonName, sciName, photoUrl, latitude, longitude, confidence, description, habitat, funFact },
  });

  return NextResponse.json({ sighting, isNew: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ sightings: [] });

  const { searchParams } = new URL(req.url);
  const speciesCode = searchParams.get("speciesCode");

  const sightings = await db.sighting.findMany({
    where: { userId, ...(speciesCode ? { speciesCode } : {}) },
    orderBy: { spottedAt: "desc" },
  });

  return NextResponse.json({ sightings });
}
