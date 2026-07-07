// eBird API — species list for a region
// Region codes: US (country), US-NY (state), US-NY-109 (county)
// https://documenter.getpostman.com/view/664302/S1ENwy59

const EBIRD_BASE = "https://api.ebird.org/v2";

export interface EBirdSpecies {
  speciesCode: string;
  comName: string;
  sciName: string;
  order: string;
  familyComName: string;
  familySciName: string;
}

export type RarityTier = "common" | "uncommon" | "rare";

// Get all species ever recorded in a region
export async function getRegionSpecies(regionCode: string): Promise<EBirdSpecies[]> {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `${EBIRD_BASE}/product/spplist/${regionCode}`,
      {
        headers: { "X-eBirdApiToken": apiKey },
        next: { revalidate: 86400 * 7 }, // cache 1 week
      }
    );
    if (!res.ok) return [];
    // Returns array of species codes — need to enrich with names
    const codes: string[] = await res.json();
    return enrichSpeciesCodes(codes, apiKey);
  } catch {
    return [];
  }
}

// Get species taxonomy details for a list of codes.
// Chunked — a full state list (500+ codes) would blow past URL length limits in one request.
async function enrichSpeciesCodes(codes: string[], apiKey: string): Promise<EBirdSpecies[]> {
  const CHUNK = 150;
  const chunks: string[][] = [];
  for (let i = 0; i < codes.length; i += CHUNK) chunks.push(codes.slice(i, i + CHUNK));
  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `${EBIRD_BASE}/ref/taxonomy/ebird?species=${chunk.join(",")}&fmt=json&locale=en`,
          {
            headers: { "X-eBirdApiToken": apiKey },
            next: { revalidate: 86400 * 7 },
          }
        );
        if (!res.ok) return [] as EBirdSpecies[];
        return (await res.json()) as EBirdSpecies[];
      })
    );
    return results.flat();
  } catch {
    return [];
  }
}

// Convert country + optional US state to eBird region code
// US + state → "US-NY", any other country → ISO code e.g. "GB", "AU"
export function toRegionCode(country: string, state?: string): string {
  if (country === "US" && state) return `US-${state.toUpperCase()}`;
  return country.toUpperCase();
}

// Get recent nearby observations (for area-based dex population)
export async function getNearbySpecies(lat: number, lng: number, distKm = 50): Promise<EBirdSpecies[]> {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `${EBIRD_BASE}/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${distKm}&back=30&maxResults=200&includeProvisional=true`,
      {
        headers: { "X-eBirdApiToken": apiKey },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const obs = await res.json();
    // Dedupe by speciesCode
    const seen = new Set<string>();
    return obs
      .filter((o: EBirdSpecies) => {
        if (seen.has(o.speciesCode)) return false;
        seen.add(o.speciesCode);
        return true;
      })
      .map((o: Record<string, string>) => ({
        speciesCode: o.speciesCode,
        comName: o.comName,
        sciName: o.sciName,
        order: o.order || "",
        familyComName: o.familyComName || "",
        familySciName: o.familySciName || "",
      }));
  } catch {
    return [];
  }
}

// Species codes observed in a region within the last `back` days.
// Rarity proxy: seen in last 7 days = common, last 30 = uncommon, else rare.
export async function getRecentSpeciesCodes(regionCode: string, back: number): Promise<Set<string>> {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return new Set();
  try {
    const res = await fetch(
      `${EBIRD_BASE}/data/obs/${regionCode}/recent?back=${back}&includeProvisional=true`,
      {
        headers: { "X-eBirdApiToken": apiKey },
        next: { revalidate: 3600 * 12 },
      }
    );
    if (!res.ok) return new Set();
    const obs: { speciesCode: string }[] = await res.json();
    return new Set(obs.map((o) => o.speciesCode));
  } catch {
    return new Set();
  }
}

export function rarityFor(code: string, recent7: Set<string>, recent30: Set<string>): RarityTier {
  if (recent7.has(code)) return "common";
  if (recent30.has(code)) return "uncommon";
  return "rare";
}

// ---- Species-code resolution ----
// Claude guesses an eBird code during identify, but guesses often don't match real
// taxonomy codes — and a wrong code means the catch never lights up in the dex.
// Resolve the name against real eBird data: region list first, then full taxonomy.

let fullTaxonomyCache: { data: EBirdSpecies[]; fetchedAt: number } | null = null;
const TAXONOMY_TTL_MS = 1000 * 60 * 60 * 24 * 7;

async function getFullTaxonomy(apiKey: string): Promise<EBirdSpecies[]> {
  if (fullTaxonomyCache && Date.now() - fullTaxonomyCache.fetchedAt < TAXONOMY_TTL_MS) {
    return fullTaxonomyCache.data;
  }
  // ~17k records (~8MB) — too big for the Next data cache, so hold it in module
  // memory instead (persists across warm invocations, refetched on cold start).
  const res = await fetch(`${EBIRD_BASE}/ref/taxonomy/ebird?fmt=json&locale=en&cat=species`, {
    headers: { "X-eBirdApiToken": apiKey },
    cache: "no-store",
  });
  if (!res.ok) return fullTaxonomyCache?.data || [];
  const data = (await res.json()) as EBirdSpecies[];
  fullTaxonomyCache = { data, fetchedAt: Date.now() };
  return data;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, "").trim();
}

function matchIn(list: EBirdSpecies[], comName: string, sciName: string): EBirdSpecies | null {
  const nCom = norm(comName);
  const nSci = norm(sciName);
  return (
    list.find((s) => norm(s.sciName) === nSci && nSci !== "") ||
    list.find((s) => norm(s.comName) === nCom && nCom !== "") ||
    null
  );
}

// Resolve a bird name to its real eBird species record.
// Returns null if nothing matches (caller keeps the guessed code as last resort).
export async function resolveSpecies(
  comName: string,
  sciName: string,
  regionCode?: string
): Promise<EBirdSpecies | null> {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return null;
  try {
    if (regionCode) {
      const regional = await getRegionSpecies(regionCode);
      const hit = matchIn(regional, comName, sciName);
      if (hit) return hit;
    }
    const all = await getFullTaxonomy(apiKey);
    return matchIn(all, comName, sciName);
  } catch {
    return null;
  }
}
