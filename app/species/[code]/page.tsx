"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";

interface Photo {
  id: string;
  blobUrl: string;
  spottedAt: string;
}

interface Sighting {
  speciesCode: string;
  commonName: string;
  sciName?: string;
  confidence?: number;
  description?: string;
  habitat?: string;
  funFact?: string;
  spottedAt: string;
}

interface BirdDetail {
  wiki: { extract: string; imageUrl?: string; pageUrl?: string } | null;
  sounds: { id: string; fileUrl: string; type: string; recordist?: string }[];
}

const RARITY_BADGE: Record<string, { label: string; className: string }> = {
  common: { label: "COMMON", className: "bg-gray-700 text-gray-300" },
  uncommon: { label: "UNCOMMON", className: "bg-blue-900 text-blue-300" },
  rare: { label: "RARE", className: "bg-yellow-900 text-[var(--dex-yellow)]" },
};

export default function SpeciesPage() {
  return (
    <Suspense fallback={null}>
      <SpeciesPageInner />
    </Suspense>
  );
}

function SpeciesPageInner() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const name = searchParams.get("name") || code;
  const rarity = searchParams.get("rarity") || "";

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sighting, setSighting] = useState<Sighting | null>(null);
  const [detail, setDetail] = useState<BirdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [playingSound, setPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const detailReq = fetch(`/api/bird/${code}?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .catch(() => null);
    const userReqs = user
      ? [
          fetch(`/api/photo?speciesCode=${encodeURIComponent(code)}`).then((r) => r.json()).catch(() => ({ photos: [] })),
          fetch(`/api/sighting?speciesCode=${encodeURIComponent(code)}`).then((r) => r.json()).catch(() => ({ sightings: [] })),
        ]
      : [Promise.resolve({ photos: [] }), Promise.resolve({ sightings: [] })];

    Promise.all([detailReq, ...userReqs]).then(([d, p, s]) => {
      setDetail(d);
      setPhotos(p.photos || []);
      setSighting((s.sightings || [])[0] || null);
      setLoading(false);
    });

    return () => {
      audioRef.current?.pause();
    };
  }, [code, name, user, isLoaded]);

  function playBirdSound() {
    const sound = detail?.sounds?.[0];
    if (!sound?.fileUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(sound.fileUrl);
    audioRef.current = audio;
    audio.onplay = () => setPlayingSound(true);
    audio.onended = () => setPlayingSound(false);
    audio.onerror = () => setPlayingSound(false);
    audio.play();
  }

  const badge = RARITY_BADGE[rarity];
  const description = sighting?.description || detail?.wiki?.extract || "";
  const heroImage = photos[0]?.blobUrl || detail?.wiki?.imageUrl;

  return (
    <div className="flex flex-col h-full">
      <DexTopBar />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <button
          onClick={() => router.back()}
          className="font-pixel text-xs text-gray-500 hover:text-gray-300"
        >
          ← BACK
        </button>

        {/* Header */}
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-[#161b22]">
          <div className="bg-[#DC0A2D] px-4 py-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-pixel text-white text-xs leading-relaxed uppercase">{name}</p>
              {(sighting?.sciName || detail?.wiki) && (
                <p className="text-red-200 text-xs italic mt-0.5">{sighting?.sciName || ""}</p>
              )}
            </div>
            {badge && (
              <span className={`font-pixel px-2 py-1 rounded ${badge.className}`} style={{ fontSize: "7px" }}>
                {badge.label}
              </span>
            )}
          </div>

          {heroImage && (
            <div className="relative aspect-[4/3] bg-black overflow-hidden scanlines">
              <img src={heroImage} alt={name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-4 space-y-3">
            {sighting && (
              <p className="dex-number">
                FIRST RECORDED: {new Date(sighting.spottedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
              </p>
            )}

            {loading ? (
              <p className="font-pixel text-xs text-gray-500 animate-pulse">LOADING DATA...</p>
            ) : (
              <>
                {description && (
                  <div className="bg-[#0d1117] rounded p-3 border border-gray-700">
                    <p className="dex-number mb-1">SPECIES DATA</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{description}</p>
                  </div>
                )}

                {(sighting?.habitat || sighting?.funFact) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {sighting?.habitat && (
                      <div className="bg-[#0d1117] rounded p-2 border border-gray-700">
                        <p className="dex-number mb-1">HABITAT</p>
                        <p className="text-gray-300">{sighting.habitat}</p>
                      </div>
                    )}
                    {sighting?.funFact && (
                      <div className="bg-[#0d1117] rounded p-2 border border-gray-700">
                        <p className="dex-number mb-1">FUN FACT</p>
                        <p className="text-gray-300">{sighting.funFact}</p>
                      </div>
                    )}
                  </div>
                )}

                {sighting?.description && detail?.wiki?.extract && (
                  <div className="bg-[#0d1117] rounded p-3 border border-gray-700">
                    <p className="dex-number mb-1">ENCYCLOPEDIA</p>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">{detail.wiki.extract}</p>
                    {detail.wiki.pageUrl && (
                      <a
                        href={detail.wiki.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-pixel text-[var(--dex-blue)] inline-block mt-2"
                        style={{ fontSize: "7px" }}
                      >
                        READ MORE →
                      </a>
                    )}
                  </div>
                )}

                {(detail?.sounds?.length || 0) > 0 && (
                  <button
                    onClick={playBirdSound}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-medium transition-colors
                      ${playingSound
                        ? "bg-green-900 border-green-600 text-green-300"
                        : "bg-[#0d1117] border-gray-600 text-gray-300 hover:border-green-600 hover:text-green-400"}`}
                  >
                    <span>{playingSound ? "♪♪" : "♪"}</span>
                    <span className="font-pixel text-xs">{playingSound ? "PLAYING" : "HEAR CALL"}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Photo album */}
        <div className="text-center">
          <p className="dex-number">PHOTO ALBUM</p>
        </div>

        {!user && isLoaded && (
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 text-center space-y-3">
            <p className="font-pixel text-xs text-gray-400">SIGN IN TO SEE YOUR PHOTOS</p>
          </div>
        )}

        {user && !loading && photos.length === 0 && (
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 text-center">
            <p className="font-pixel text-xs text-gray-500">NO PHOTOS YET</p>
            <p className="text-xs text-gray-600 mt-2">Identify this bird to add photos</p>
          </div>
        )}

        {photos.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelected(photo)}
                  className="aspect-square rounded-xl overflow-hidden border border-gray-700 hover:border-[var(--dex-green)] transition-colors"
                >
                  <img
                    src={photo.blobUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="font-pixel text-xs text-gray-600 text-center">
              {photos.length} PHOTO{photos.length !== 1 ? "S" : ""}
            </p>
          </>
        )}
      </main>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <img
            src={selected.blobUrl}
            alt={name}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 font-pixel text-xs text-gray-400"
          >
            ✕ CLOSE
          </button>
        </div>
      )}

      <DexBottomBar />
    </div>
  );
}
