"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";

interface DexEntry {
  speciesCode: string;
  comName: string;
  sciName: string;
  number: number;
  caught: boolean;
  familyComName?: string;
}

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [dex, setDex] = useState<DexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "caught" | "missing">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    loadDex();
  }, [isLoaded]);

  async function loadDex() {
    setLoading(true);
    try {
      const country = localStorage.getItem("birddex_country") || "US";
      const state = localStorage.getItem("birddex_state") || "NY";
      const params = country === "US" ? `country=US&state=${state}` : `country=${country}`;
      const res = await fetch(`/api/dex?${params}`);
      const data = await res.json();
      // Merge localStorage guest catches
      const guestCaught: string[] = JSON.parse(localStorage.getItem("birddex_caught_guest") || "[]");
      if (guestCaught.length > 0) {
        const guestSet = new Set(guestCaught);
        setDex(data.map((e: DexEntry) => ({ ...e, caught: e.caught || guestSet.has(e.speciesCode) })));
      } else {
        setDex(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const filtered = dex.filter((e) => {
    if (filter === "caught" && !e.caught) return false;
    if (filter === "missing" && e.caught) return false;
    if (search && !e.comName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const caughtCount = dex.filter((e) => e.caught).length;
  const pct = dex.length ? Math.round((caughtCount / dex.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <DexTopBar />

      <main className="flex-1 overflow-y-auto">
        {/* Progress bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="dex-number">BIRDDEX COMPLETION</span>
            <span className="dex-number">{caughtCount}/{dex.length} ({pct}%)</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--dex-green)] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Guest CTA */}
        {isLoaded && !user && (
          <div className="mx-4 mb-3 bg-[#161b22] border border-[var(--dex-red)] rounded-xl p-4 text-center">
            <p className="font-pixel text-xs text-white mb-3 leading-relaxed">
              SIGN IN TO SAVE<br/>YOUR SIGHTINGS
            </p>
            <SignInButton>
              <button className="dex-btn px-6 py-2 rounded-xl font-pixel text-white text-xs" style={{borderRadius:"12px"}}>
                SIGN IN
              </button>
            </SignInButton>
          </div>
        )}

        {/* Filter + search */}
        <div className="px-4 pb-2 space-y-2">
          <input
            type="text"
            placeholder="Search birds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-[var(--dex-green)]"
          />
          <div className="flex gap-2">
            {(["all", "caught", "missing"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded font-pixel text-xs transition-colors
                  ${filter === f
                    ? "bg-[var(--dex-red)] text-white"
                    : "bg-[#161b22] border border-gray-700 text-gray-400"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="font-pixel text-[var(--dex-green)] text-xs animate-pulse">LOADING DEX...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            {filtered.map((entry) => (
              <DexTile key={entry.speciesCode} entry={entry} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-10">
                <p className="font-pixel text-gray-600 text-xs">NO BIRDS FOUND</p>
              </div>
            )}
          </div>
        )}
      </main>

      <DexBottomBar />
    </div>
  );
}

function DexTile({ entry }: { entry: DexEntry }) {
  const router = useRouter();
  function handleClick() {
    if (entry.caught) {
      router.push(`/species/${entry.speciesCode}?name=${encodeURIComponent(entry.comName)}`);
    }
  }
  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border p-2 flex flex-col items-center gap-1 aspect-square justify-center cursor-pointer
        ${entry.caught ? "border-[var(--dex-green)] caught-glow bg-[#0d2818]" : "border-gray-800 bg-[#161b22]"}`}
    >
      <span className="dex-number" style={{fontSize:"7px"}}>#{entry.number.toString().padStart(3,"0")}</span>
      {/* Bird silhouette SVG placeholder */}
      <div className={`w-10 h-10 flex items-center justify-center ${entry.caught ? "" : "silhouette"}`}>
        <svg viewBox="0 0 40 40" fill="currentColor" className={entry.caught ? "text-[var(--dex-green)]" : "text-gray-600"}>
          <ellipse cx="20" cy="24" rx="10" ry="7"/>
          <circle cx="20" cy="14" r="6"/>
          <ellipse cx="29" cy="20" rx="6" ry="3" transform="rotate(-20 29 20)"/>
          <ellipse cx="11" cy="20" rx="6" ry="3" transform="rotate(20 11 20)"/>
          <line x1="17" y1="31" x2="15" y2="37" stroke="currentColor" strokeWidth="2"/>
          <line x1="23" y1="31" x2="25" y2="37" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <p className="text-center leading-tight" style={{fontSize:"8px", color: entry.caught ? "#39d353" : "#7d8590"}}>
        {entry.comName.length > 12 ? entry.comName.slice(0,11) + "…" : entry.comName}
      </p>
    </div>
  );
}
