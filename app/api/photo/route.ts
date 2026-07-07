import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageBase64, mimeType, speciesCode, commonName } = await req.json();
  if (!imageBase64 || !speciesCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Convert base64 to buffer and upload to Vercel Blob
  const buffer = Buffer.from(imageBase64, "base64");
  const ext = mimeType?.includes("png") ? "png" : "jpg";
  const filename = `${userId}/${speciesCode}/${Date.now()}.${ext}`;

  const blob = await put(filename, buffer, {
    access: "public",
    contentType: mimeType || "image/jpeg",
  });

  // Save Photo record (requires a Sighting to exist)
  try {
    const photo = await db.photo.create({
      data: { userId, speciesCode, commonName, blobUrl: blob.url },
    });
    return NextResponse.json({ photo, blobUrl: blob.url });
  } catch {
    // Sighting doesn't exist yet — return blob URL anyway so client can use it
    return NextResponse.json({ blobUrl: blob.url });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ photos: [] });

  const { searchParams } = new URL(req.url);
  const speciesCode = searchParams.get("speciesCode");
  if (!speciesCode) return NextResponse.json({ photos: [] });

  const photos = await db.photo.findMany({
    where: { userId, speciesCode },
    orderBy: { spottedAt: "desc" },
  });

  return NextResponse.json({ photos });
}
