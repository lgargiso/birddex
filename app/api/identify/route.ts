import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const BirdResult = z.object({
  isBird: z.boolean(),
  commonName: z.string(),
  scientificName: z.string(),
  speciesCode: z.string(), // eBird-style code, best guess
  confidence: z.number().min(0).max(1),
  description: z.string(), // Pokédex-style entry, 2-3 sentences
  habitat: z.string(),
  funFact: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            {
              type: "text",
              text: `You are an expert ornithologist. Analyze this image and identify the bird.

Respond with ONLY valid JSON matching this schema exactly:
{
  "isBird": boolean (is there a clearly identifiable bird?),
  "commonName": "Common English name e.g. Tufted Titmouse",
  "scientificName": "e.g. Baeolophus bicolor",
  "speciesCode": "eBird-style species code e.g. tuftit (lowercase, 6 chars)",
  "confidence": 0.0-1.0,
  "description": "2-3 sentence Pokédex-style entry. Exciting, factual, vivid. Starts with the bird's name.",
  "habitat": "Primary habitat in 5 words or less",
  "funFact": "One surprising fact about this species"
}

If no bird is visible or identifiable, set isBird to false and use empty strings for other fields.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });

    const parsed = BirdResult.parse(JSON.parse(jsonMatch[0]));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("identify error:", err);
    return NextResponse.json({ error: "Identification failed" }, { status: 500 });
  }
}
