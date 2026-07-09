import { describe, expect, it } from "vitest";

import { rarityFor, toRegionCode } from "@/lib/ebird";

describe("toRegionCode", () => {
  it("formats US states and uppercases non-US countries", () => {
    expect(toRegionCode("US", "ny")).toBe("US-NY");
    expect(toRegionCode("gb")).toBe("GB");
    expect(toRegionCode("US")).toBe("US");
  });
});

describe("rarityFor", () => {
  it("prefers 7-day sightings over 30-day sightings and falls back to rare", () => {
    expect(rarityFor("amerob", new Set(["amerob"]), new Set(["amerob"]))).toBe("common");
    expect(rarityFor("mallar3", new Set(), new Set(["mallar3"]))).toBe("uncommon");
    expect(rarityFor("ruffed", new Set(), new Set())).toBe("rare");
  });
});
