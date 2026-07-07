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
    return enrichSpeciesCodes(codes.slice(0, 400), apiKey);
  } catch {
    return [];
  }
}

// Get species taxonomy details for a list of codes
async function enrichSpeciesCodes(codes: string[], apiKey: string): Promise<EBirdSpecies[]> {
  try {
    const codesStr = codes.join(",");
    const res = await fetch(
      `${EBIRD_BASE}/ref/taxonomy/ebird?species=${codesStr}&fmt=json&locale=en`,
      {
        headers: { "X-eBirdApiToken": apiKey },
        next: { revalidate: 86400 * 7 },
      }
    );
    if (!res.ok) return [];
    return await res.json();
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
