export interface WikiBird {
  title: string;
  extract: string;
  imageUrl?: string;
  pageUrl: string;
}

export async function getWikipediaBird(commonName: string): Promise<WikiBird | null> {
  try {
    const encoded = encodeURIComponent(commonName.replace(/ /g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      extract: data.extract || "",
      imageUrl: data.thumbnail?.source,
      pageUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`,
    };
  } catch {
    return null;
  }
}
