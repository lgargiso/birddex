export interface BirdSound {
  id: string;
  en: string;       // English name
  url: string;      // Recording page URL
  fileUrl: string;  // Direct audio file URL
  type: string;     // "song", "call", etc.
  country: string;
  recordist: string;
}

export async function getBirdSounds(commonName: string, limit = 3): Promise<BirdSound[]> {
  try {
    const q = encodeURIComponent(commonName);
    const res = await fetch(
      `https://xeno-canto.org/api/2/recordings?query=${q}+q:A&page=1`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const recordings: BirdSound[] = (data.recordings || [])
      .slice(0, limit)
      .map((r: Record<string, string>) => ({
        id: r.id,
        en: r.en,
        url: `https://xeno-canto.org/${r.id}`,
        fileUrl: r.file
          ? (r.file.startsWith("//") ? `https:${r.file}` : r.file)
          : "",
        type: r.type || "call",
        country: r.cnt || "",
        recordist: r.rec || "",
      }))
      .filter((r: BirdSound) => r.fileUrl);
    return recordings;
  } catch {
    return [];
  }
}
