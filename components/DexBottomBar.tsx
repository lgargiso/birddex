"use client";
import { useRouter, usePathname } from "next/navigation";

export default function DexBottomBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="dex-bottombar flex items-center justify-around px-6 py-4 sticky bottom-0 z-50">
      {/* Pokédex grid button */}
      <button
        onClick={() => router.push("/")}
        className={`flex flex-col items-center gap-1 ${pathname === "/" ? "opacity-100" : "opacity-60"}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <rect x="2" y="2" width="9" height="9" rx="1"/>
          <rect x="13" y="2" width="9" height="9" rx="1"/>
          <rect x="2" y="13" width="9" height="9" rx="1"/>
          <rect x="13" y="13" width="9" height="9" rx="1"/>
        </svg>
        <span className="font-pixel text-white" style={{fontSize:"6px"}}>DEX</span>
      </button>

      {/* Camera — big center button */}
      <button
        onClick={() => router.push("/identify")}
        className="dex-btn w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.24.07-.49.07-.58s-.03-.35-.07-.58l1.24-.97c.11-.09.14-.27.07-.39l-1.18-2.04c-.07-.12-.24-.16-.36-.12l-1.47.59c-.3-.23-.63-.43-.98-.59l-.22-1.57c-.02-.14-.14-.24-.29-.24h-2.36c-.15 0-.27.1-.29.24l-.22 1.57c-.35.16-.68.36-.98.59l-1.47-.59c-.13-.04-.29 0-.36.12L4.49 9.53c-.07.12-.03.3.08.39l1.24.97c-.04.23-.07.48-.07.58s.03.35.07.58l-1.24.97c-.11.09-.14.27-.07.39l1.18 2.04c.07.12.24.16.36.12l1.47-.59c.3.23.63.43.98.59l.22 1.57c.02.14.14.24.29.24h2.36c.15 0 .27-.1.29-.24l.22-1.57c.35-.16.68-.36.98-.59l1.47.59c.13.04.29 0 .36-.12l1.18-2.04c.07-.12.03-.3-.08-.39l-1.24-.97z"/>
        </svg>
      </button>

      {/* Profile */}
      <button
        onClick={() => router.push("/setup")}
        className={`flex flex-col items-center gap-1 ${pathname === "/setup" ? "opacity-100" : "opacity-60"}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span className="font-pixel text-white" style={{fontSize:"6px"}}>PROFILE</span>
      </button>
    </div>
  );
}
