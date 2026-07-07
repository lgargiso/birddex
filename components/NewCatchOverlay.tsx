"use client";

import { useEffect, useMemo } from "react";

interface NewCatchOverlayProps {
  commonName: string;
  onDone: () => void;
}

const CONFETTI_COLORS = ["#DC0A2D", "#39d353", "#FFD700", "#64b5f6", "#ffffff"];

export default function NewCatchOverlay({ commonName, onDone }: NewCatchOverlayProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  // Fixed confetti layout per mount — stable across re-renders
  const confetti = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: (i * 37 + 13) % 100,
        delay: ((i * 53) % 20) / 10,
        duration: 1.8 + ((i * 29) % 14) / 10,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 4 + (i % 3) * 3,
      })),
    []
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 overflow-hidden"
      onClick={onDone}
    >
      {confetti.map((c, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        />
      ))}
      <div className="new-catch-burst flex flex-col items-center gap-5 px-6 text-center">
        <p className="font-pixel text-[var(--dex-yellow)] text-sm leading-relaxed drop-shadow">
          ★ NEW SPECIES ★
        </p>
        <p className="font-pixel text-white text-lg leading-relaxed uppercase">
          {commonName}
        </p>
        <p className="font-pixel text-[var(--dex-green)] text-xs">
          REGISTERED TO BIRDDEX
        </p>
        <p className="font-pixel text-gray-500 text-[8px] mt-4">TAP TO CONTINUE</p>
      </div>
    </div>
  );
}
