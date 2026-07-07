"use client";

import { useEffect, useRef, useState } from "react";

interface Sound {
  id: string;
  fileUrl: string;
  type: string;
}

interface BirdCardProps {
  commonName: string;
  scientificName: string;
  speciesCode: string;
  description: string;
  habitat: string;
  funFact: string;
  photoUrl?: string;
  confidence?: number;
  wikiExtract?: string;
  wikiImageUrl?: string;
  sounds?: Sound[];
  isNew?: boolean;
  onSave?: () => void;
}

export default function BirdCard({
  commonName,
  scientificName,
  description,
  habitat,
  funFact,
  photoUrl,
  confidence = 0,
  wikiExtract,
  wikiImageUrl,
  sounds = [],
  isNew = false,
  onSave,
}: BirdCardProps) {
  const [narrating, setNarrating] = useState(false);
  const [playingSound, setPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-narrate on mount
  useEffect(() => {
    const text = `Species detected: ${commonName}. ${description} ${funFact}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 0.85;
    utter.volume = 1;
    // Pick a robotic-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Google") || v.name.includes("Fred") || v.lang === "en-US"
    );
    if (preferred) utter.voice = preferred;

    utter.onstart = () => setNarrating(true);
    utter.onend = () => setNarrating(false);

    // Small delay so card animation finishes first
    const t = setTimeout(() => window.speechSynthesis.speak(utter), 600);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
  }, [commonName, description, funFact]);

  function playBirdSound() {
    if (!sounds[0]?.fileUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(sounds[0].fileUrl);
    audioRef.current = audio;
    audio.onplay = () => setPlayingSound(true);
    audio.onended = () => setPlayingSound(false);
    audio.onerror = () => setPlayingSound(false);
    audio.play();
  }

  const displayImage = photoUrl || wikiImageUrl;
  const pct = Math.round(confidence * 100);

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-700 bg-[#161b22] ${isNew ? "new-catch" : ""}`}>
      {/* Header stripe */}
      <div className="bg-[#DC0A2D] px-4 py-2 flex items-center justify-between">
        <div>
          <p className="font-pixel text-white text-xs leading-none">{commonName}</p>
          <p className="text-red-200 text-xs italic mt-0.5">{scientificName}</p>
        </div>
        {pct > 0 && (
          <span className={`font-pixel text-xs px-2 py-0.5 rounded ${pct >= 80 ? "bg-green-700 text-green-100" : "bg-yellow-700 text-yellow-100"}`}>
            {pct}%
          </span>
        )}
      </div>

      {/* Image */}
      {displayImage && (
        <div className="relative aspect-[4/3] bg-black overflow-hidden scanlines">
          <img src={displayImage} alt={commonName} className="w-full h-full object-cover" />
          {narrating && (
            <div className="absolute bottom-2 left-2 flex gap-1 items-end">
              {[1,2,3,4].map(i => (
                <div
                  key={i}
                  className="w-1.5 bg-green-400 rounded-t"
                  style={{ height: `${8 + Math.random() * 14}px`, animation: `scan ${0.3 + i*0.1}s ease-in-out infinite alternate` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Pokédex description */}
        <div className="bg-[#0d1117] rounded p-3 border border-gray-700">
          <p className="dex-number mb-1">SPECIES DATA</p>
          <p className="text-sm text-gray-200 leading-relaxed">{description}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0d1117] rounded p-2 border border-gray-700">
            <p className="dex-number mb-1">HABITAT</p>
            <p className="text-gray-300">{habitat}</p>
          </div>
          <div className="bg-[#0d1117] rounded p-2 border border-gray-700">
            <p className="dex-number mb-1">FUN FACT</p>
            <p className="text-gray-300">{funFact}</p>
          </div>
        </div>

        {/* Wikipedia extract */}
        {wikiExtract && (
          <div className="bg-[#0d1117] rounded p-3 border border-gray-700">
            <p className="dex-number mb-1">ENCYCLOPEDIA</p>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">{wikiExtract}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {sounds.length > 0 && (
            <button
              onClick={playBirdSound}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-medium transition-colors
                ${playingSound
                  ? "bg-green-900 border-green-600 text-green-300"
                  : "bg-[#0d1117] border-gray-600 text-gray-300 hover:border-green-600 hover:text-green-400"}`}
            >
              <span>{playingSound ? "♪♪" : "♪"}</span>
              <span className="font-pixel text-xs">{playingSound ? "PLAYING" : "HEAR CALL"}</span>
            </button>
          )}
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              const text = `${commonName}. ${description} ${funFact}`;
              const u = new SpeechSynthesisUtterance(text);
              u.rate = 0.9; u.pitch = 0.85;
              u.onstart = () => setNarrating(true);
              u.onend = () => setNarrating(false);
              window.speechSynthesis.speak(u);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-medium transition-colors
              ${narrating
                ? "bg-blue-900 border-blue-600 text-blue-300"
                : "bg-[#0d1117] border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400"}`}
          >
            <span className="font-pixel text-xs">{narrating ? "SPEAKING..." : "▶ NARRATE"}</span>
          </button>
        </div>

        {/* Save to dex */}
        {onSave && (
          <button
            onClick={onSave}
            className="w-full py-3 rounded font-pixel text-xs text-white bg-[#DC0A2D] hover:bg-red-700 active:bg-red-900 transition-colors border-b-4 border-[#9B0A1F]"
          >
            + ADD TO POKÉDEX
          </button>
        )}
      </div>
    </div>
  );
}
