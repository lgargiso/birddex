import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { speciesCode, commonName, sciName, photoUrl, latitude, longitude, confidence } =
    await req.json();

  // Ensure user exists
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  // Upsert — first sighting wins, don't overwrite with lower confidence
  const existing = await db.sighting.findUnique({
    where: { userId_speciesCode: { userId, speciesCode } },
  });

  if (existing) {
    return NextResponse.json({ sighting: existing, isNew: false });
  }

  const sighting = await db.sighting.create({
    data: { userId, speciesCode, commonName, sciName, photoUrl, latitude, longitude, confidence },
  });

  return NextResponse.json({ sighting, isNew: true });
}
