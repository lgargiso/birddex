import { afterEach, describe, expect, it, vi } from "vitest";

import { getWikipediaBird } from "@/lib/wikipedia";

describe("getWikipediaBird", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes names for the API and falls back to a constructed page URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Black-capped Chickadee",
        extract: "A small North American songbird.",
        thumbnail: { source: "https://img.example/chickadee.jpg" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getWikipediaBird("Black-capped Chickadee")).resolves.toEqual({
      title: "Black-capped Chickadee",
      extract: "A small North American songbird.",
      imageUrl: "https://img.example/chickadee.jpg",
      pageUrl: "https://en.wikipedia.org/wiki/Black-capped_Chickadee",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://en.wikipedia.org/api/rest_v1/page/summary/Black-capped_Chickadee",
      { next: { revalidate: 86400 } },
    );
  });

  it("returns null when the Wikipedia API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(getWikipediaBird("Not A Bird")).resolves.toBeNull();
  });
});
