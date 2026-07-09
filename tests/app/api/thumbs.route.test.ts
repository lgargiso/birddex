import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWikipediaBirdMock } = vi.hoisted(() => ({
  getWikipediaBirdMock: vi.fn(),
}));

vi.mock("@/lib/wikipedia", () => ({
  getWikipediaBird: getWikipediaBirdMock,
}));

describe("app/api/thumbs POST", () => {
  beforeEach(() => {
    vi.resetModules();
    getWikipediaBirdMock.mockReset();
  });

  it("rejects non-array names", async () => {
    const { POST } = await import("@/app/api/thumbs/route");
    const req = new NextRequest("http://localhost/api/thumbs", {
      method: "POST",
      body: JSON.stringify({ names: "Robin" }),
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "names must be an array" });
  });

  it("caps to 100 string names and maps misses to null", async () => {
    getWikipediaBirdMock.mockImplementation(async (name: string) =>
      name === "Robin"
        ? { title: name, extract: "", imageUrl: "https://img.example/robin.jpg", pageUrl: "https://wiki/robin" }
        : null,
    );

    const { POST } = await import("@/app/api/thumbs/route");
    const names = ["Robin", 42, ...Array.from({ length: 100 }, (_, index) => `Bird ${index}`)];
    const req = new NextRequest("http://localhost/api/thumbs", {
      method: "POST",
      body: JSON.stringify({ names }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWikipediaBirdMock).toHaveBeenCalledTimes(99);
    expect(body).toEqual({
      thumbs: {
        Robin: "https://img.example/robin.jpg",
        ...Object.fromEntries(Array.from({ length: 98 }, (_, index) => [`Bird ${index}`, null])),
      },
    });
    expect(body.thumbs["Bird 98"]).toBeUndefined();
    expect(body.thumbs["Bird 99"]).toBeUndefined();
  });
});
