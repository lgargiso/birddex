"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";
import BirdCard from "@/components/BirdCard";

interface BirdResult {
  isBird: boolean;
  commonName: string;
  scientificName: string;
  speciesCode: string;
  confidence: number;
  description: string;
  habitat: string;
  funFact: string;
}

interface BirdDetail {
  wiki: { extract: string; imageUrl?: string } | null;
  sounds: { id: string; fileUrl: string; type: string }[];
}

type Stage = "camera" | "preview" | "scanning" | "result" | "error";

export default function IdentifyPage() {
  const { user } = useUser();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("camera");
  const [capturedImage, setCapturedImage] = useState<string>(""); // data URL
  const [result, setResult] = useState<BirdResult | null>(null);
  const [detail, setDetail] = useState<BirdDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Fall back to file upload if camera denied
    }
  }, []);

  // Capture frame from video
  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCapturedImage(dataUrl);
    setStage("preview");
  }

  // File upload fallback
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setStage("preview");
    };
    reader.readAsDataURL(file);
  }

  // Send to Claude
  async function identify() {
    if (!capturedImage) return;
    setStage("scanning");
    try {
      const base64 = capturedImage.split(",")[1];
      const mimeType = capturedImage.split(";")[0].split(":")[1];

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data: BirdResult = await res.json();

      if (!data.isBird) {
        setError("No bird detected. Try a clearer photo of a bird.");
        setStage("error");
        return;
      }

      setResult(data);

      // Fetch Wikipedia + sounds in parallel
      const detailRes = await fetch(
        `/api/bird/${data.speciesCode}?name=${encodeURIComponent(data.commonName)}`
      );
      const detailData: BirdDetail = await detailRes.json();
      setDetail(detailData);
      setStage("result");
    } catch {
      setError("Something went wrong. Try again.");
      setStage("error");
    }
  }

  // Save sighting + photo
  async function saveSighting() {
    if (!result) return;

    if (!user) {
      // Guest: mark as caught in localStorage only (no photo storage)
      const caught: string[] = JSON.parse(localStorage.getItem("birddex_caught_guest") || "[]");
      if (!caught.includes(result.speciesCode)) {
        caught.push(result.speciesCode);
        localStorage.setItem("birddex_caught_guest", JSON.stringify(caught));
      }
      setSaved(true);
      return;
    }

    // Signed in: upload photo to Vercel Blob, then save sighting
    const base64 = capturedImage.split(",")[1];
    const mimeType = capturedImage.split(";")[0].split(":")[1];

    // Save sighting first (establishes the record Photo FK needs)
    await fetch("/api/sighting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speciesCode: result.speciesCode,
        commonName: result.commonName,
        sciName: result.scientificName,
        confidence: result.confidence,
      }),
    });

    // Upload photo to blob
    await fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType,
        speciesCode: result.speciesCode,
        commonName: result.commonName,
      }),
    });

    setSaved(true);
  }

  return (
    <div className="flex flex-col h-full">
      <DexTopBar />

      <main className="flex-1 overflow-y-auto scanlines screen-glow">
        {/* Camera stage */}
        {stage === "camera" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
            <p className="font-pixel text-[var(--dex-green)] text-xs text-center leading-relaxed">
              POINT CAMERA<br/>AT A BIRD
            </p>
            <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border-2 border-gray-700">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay onCanPlay={() => {}} />
              {/* Crosshair overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 border-2 border-[var(--dex-green)] opacity-60 rounded">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--dex-green)]" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--dex-green)]" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--dex-green)]" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--dex-green)]" />
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4">
              <button
                onClick={() => { startCamera(); }}
                className="dex-btn px-6 py-3 rounded-xl font-pixel text-white text-xs"
                style={{borderRadius:"12px"}}
              >
                CAMERA
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-6 py-3 rounded-xl font-pixel text-gray-300 text-xs border border-gray-600 bg-[#161b22]"
              >
                UPLOAD
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            {videoRef.current && (
              <button
                onClick={captureFrame}
                className="dex-btn w-20 h-20 rounded-full font-pixel text-white text-xs"
              >
                SNAP
              </button>
            )}
          </div>
        )}

        {/* Preview stage */}
        {stage === "preview" && capturedImage && (
          <div className="p-4 space-y-4">
            <p className="font-pixel text-[var(--dex-green)] text-xs text-center">ANALYZING SUBJECT</p>
            <div className="rounded-xl overflow-hidden border-2 border-gray-700">
              <img src={capturedImage} alt="Captured" className="w-full object-cover" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCapturedImage(""); setStage("camera"); }}
                className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-pixel text-xs"
              >
                RETAKE
              </button>
              <button
                onClick={identify}
                className="flex-1 py-3 rounded-xl dex-btn font-pixel text-white text-xs"
                style={{borderRadius:"12px"}}
              >
                IDENTIFY!
              </button>
            </div>
          </div>
        )}

        {/* Scanning stage */}
        {stage === "scanning" && capturedImage && (
          <div className="p-4 space-y-4">
            <p className="font-pixel text-[var(--dex-green)] text-xs text-center animate-pulse">
              SCANNING...
            </p>
            <div className="relative rounded-xl overflow-hidden border-2 border-[var(--dex-green)] scanning">
              <img src={capturedImage} alt="Scanning" className="w-full object-cover opacity-70" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-pixel animate-pulse">CROSS-REFERENCING DATABASE</p>
            </div>
          </div>
        )}

        {/* Result stage */}
        {stage === "result" && result && (
          <div className="p-4 space-y-4">
            {saved && (
              <div className="bg-green-900 border border-green-600 rounded-lg p-3 text-center">
                <p className="font-pixel text-green-300 text-xs">✓ ADDED TO YOUR DEX!</p>
              </div>
            )}
            <BirdCard
              commonName={result.commonName}
              scientificName={result.scientificName}
              speciesCode={result.speciesCode}
              description={result.description}
              habitat={result.habitat}
              funFact={result.funFact}
              photoUrl={capturedImage}
              confidence={result.confidence}
              wikiExtract={detail?.wiki?.extract}
              wikiImageUrl={detail?.wiki?.imageUrl}
              sounds={detail?.sounds || []}
              isNew={!saved}
              onSave={!saved ? saveSighting : undefined}
            />
            <button
              onClick={() => { setStage("camera"); setCapturedImage(""); setResult(null); setSaved(false); }}
              className="w-full py-3 rounded-xl border border-gray-600 text-gray-300 font-pixel text-xs"
            >
              IDENTIFY ANOTHER
            </button>
          </div>
        )}

        {/* Error stage */}
        {stage === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
            <p className="font-pixel text-red-400 text-xs text-center">{error}</p>
            <button
              onClick={() => { setStage("camera"); setCapturedImage(""); setError(""); }}
              className="dex-btn px-6 py-3 rounded-xl font-pixel text-white text-xs"
              style={{borderRadius:"12px"}}
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </main>

      <DexBottomBar />
    </div>
  );
}
