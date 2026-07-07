"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";

interface Photo {
  id: string;
  blobUrl: string;
  spottedAt: string;
}

export default function SpeciesAlbumPage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Photo | null>(null);

  // Decode species name from query string
  const name = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("name") || code
    : code;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`/api/photo?speciesCode=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => { setPhotos(d.photos || []); setLoading(false); });
  }, [code, user]);

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

        <div className="text-center">
          <p className="font-pixel text-[var(--dex-green)] text-xs leading-relaxed uppercase">
            {name}
          </p>
          <p className="dex-number mt-1">PHOTO ALBUM</p>
        </div>

        {!user && (
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 text-center space-y-3">
            <p className="font-pixel text-xs text-gray-400">SIGN IN TO SEE YOUR PHOTOS</p>
          </div>
        )}

        {user && loading && (
          <p className="font-pixel text-xs text-gray-500 text-center animate-pulse">LOADING...</p>
        )}

        {user && !loading && photos.length === 0 && (
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 text-center">
            <p className="font-pixel text-xs text-gray-500">NO PHOTOS YET</p>
            <p className="text-xs text-gray-600 mt-2">Identify this bird to add photos</p>
          </div>
        )}

        {photos.length > 0 && (
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
        )}

        {photos.length > 0 && (
          <p className="font-pixel text-xs text-gray-600 text-center">
            {photos.length} PHOTO{photos.length !== 1 ? "S" : ""}
          </p>
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
