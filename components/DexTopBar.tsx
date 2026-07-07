"use client";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default function DexTopBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="dex-topbar flex items-center px-4 py-3 gap-3 sticky top-0 z-50">
      {/* Blue eye lens */}
      <div className="dex-eye w-10 h-10 rounded-full flex-shrink-0" />

      {/* LED row */}
      <div className="flex gap-1.5 flex-shrink-0">
        <div className="led-red w-2.5 h-2.5" />
        <div className="led-yellow w-2 h-2 mt-0.5" />
        <div className="led-green w-2 h-2 mt-0.5" />
      </div>

      {/* Title */}
      <span
        className="font-pixel text-white text-sm flex-1 cursor-pointer tracking-wider drop-shadow"
        onClick={() => router.push("/")}
      >
        BirdDex
      </span>

      {/* Nav */}
      <div className="flex items-center gap-3">
        {pathname !== "/" && (
          <button
            onClick={() => router.back()}
            className="text-white text-xs font-pixel opacity-80 hover:opacity-100"
          >
            ←
          </button>
        )}
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
