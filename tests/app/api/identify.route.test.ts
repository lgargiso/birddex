import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { anthropicCreateMock, resolveSpeciesMock, toRegionCodeMock } = vi.hoisted(() => ({
  anthropicCreateMock: vi.fn(),
  resolveSpeciesMock: vi.fn(),
  toRegionCodeMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: anthropicCreateMock,
    };
  },
}));

vi.mock("@/lib/ebird", () => ({
  resolveSpecies: resolveSpeciesMock,
  toRegionCode: toRegionCodeMock,
}));

describe("app/api/identify POST", () => {
  beforeEach(() => {
    vi.resetModules();
    anthropicCreateMock.mockReset();
    resolveSpeciesMock.mockReset();
    toRegionCodeMock.mockReset();
  });

  it("returns 400 when no image payload is provided", async () => {
    const { POST } = await import("@/app/api/identify/route");
    const req = new NextRequest("http://localhost/api/identify", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No image provided" });
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("parses embedded JSON and overwrites guessed species fields with resolved taxonomy", async () => {
    anthropicCreateMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: [
            "Here you go:",
            "```json",
            JSON.stringify({
              isBird: true,
              commonName: "Guessed Robin",
              scientificName: "Guessus robin",
              speciesCode: "guess1",
              confidence: 0.73,
              description: "A lively backyard visitor.",
              habitat: "Woodland edge",
              funFact: "Builds mud-lined nests",
            }),
            "```",
          ].join("\n"),
        },
      ],
    });
    toRegionCodeMock.mockReturnValue("US-NY");
    resolveSpeciesMock.mockResolvedValue({
      speciesCode: "amerob",
      comName: "American Robin",
      sciName: "Turdus migratorius",
    });

    const { POST } = await import("@/app/api/identify/route");
    const req = new NextRequest("http://localhost/api/identify", {
      method: "POST",
      body: JSON.stringify({
        imageBase64: "abc123",
        mimeType: "image/png",
        country: "US",
        state: "ny",
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      isBird: true,
      commonName: "American Robin",
      scientificName: "Turdus migratorius",
      speciesCode: "amerob",
      confidence: 0.73,
      description: "A lively backyard visitor.",
      habitat: "Woodland edge",
      funFact: "Builds mud-lined nests",
    });
    expect(toRegionCodeMock).toHaveBeenCalledWith("US", "ny");
    expect(resolveSpeciesMock).toHaveBeenCalledWith("Guessed Robin", "Guessus robin", "US-NY");
  });
});
