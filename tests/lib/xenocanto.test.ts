import { afterEach, describe, expect, it, vi } from "vitest";

import { getBirdSounds } from "@/lib/xenocanto";

describe("getBirdSounds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps recordings, normalizes protocol-relative URLs, filters empty files, and respects the limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recordings: [
          { id: "1", en: "Robin", file: "//cdn.example/robin.mp3", type: "song", cnt: "US", rec: "Alice" },
          { id: "2", en: "Robin", file: "", cnt: "US", rec: "Bob" },
          { id: "3", en: "Robin", file: "https://cdn.example/call.mp3", cnt: "CA", rec: "Carol" },
          { id: "4", en: "Robin", file: "https://cdn.example/ignored.mp3", cnt: "GB", rec: "Dave" },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getBirdSounds("American Robin", 3)).resolves.toEqual([
      {
        id: "1",
        en: "Robin",
        url: "https://xeno-canto.org/1",
        fileUrl: "https://cdn.example/robin.mp3",
        type: "song",
        country: "US",
        recordist: "Alice",
      },
      {
        id: "3",
        en: "Robin",
        url: "https://xeno-canto.org/3",
        fileUrl: "https://cdn.example/call.mp3",
        type: "call",
        country: "CA",
        recordist: "Carol",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://xeno-canto.org/api/2/recordings?query=American%20Robin+q:A&page=1",
      { next: { revalidate: 86400 } },
    );
  });
});
