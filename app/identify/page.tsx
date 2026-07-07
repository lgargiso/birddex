"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";
import BirdCard from "@/components/BirdCard";
import NewCatchOverlay from "@/components/NewCatchOverlay";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>(""); // data URL
  const [result, setResult] = useState<BirdResult | null>(null);
  const [detail, setDetail] = useState<BirdDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [zoomMax, setZoomMax] = useState(5);
  const hardwareZoomRef = useRef(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  // Stop the camera when leaving the page
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      // Check for hardware zoom support
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
      if (caps?.zoom && typeof caps.zoom === "object" && caps.zoom !== null) {
        const z = caps.zoom as { min?: number; max?: number };
        hardwareZoomRef.current = true;
        setZoomMax(z.max || 5);
      } else {
        hardwareZoomRef.current = false;
        setZoomMax(5); // software zoom cap
      }
      setZoom(1);
      setCameraActive(true);
    } catch {
      setCameraActive(false);
    }
  }, []);

  // Apply zoom — hardware if supported, else CSS scale (captured via canvas crop)
  const applyZoom = useCallback(async (val: number) => {
    setZoom(val);
    if (hardwareZoomRef.current && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ zoom: val } as MediaTrackConstraintSet] });
      } catch { /* ignore if not supported */ }
    }
  }, []);

  // Capture frame from video — crop for software zoom
  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (!hardwareZoomRef.current && zoom > 1) {
        // Software zoom: draw a cropped center region at full canvas size
        const sw = vw / zoom;
        const sh = vh / zoom;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vw, vh);
      } else {
        ctx.drawImage(video, 0, 0);
      }
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    setZoom(1);
    setCapturedImage(dataUrl);
    setStage("preview");
  }

  // File upload fallback
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      stopCamera();
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
      const country = localStorage.getItem("birddex_country") || "US";
      const state = localStorage.getItem("birddex_state") || "NY";

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, country, state }),
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
        setCelebrating(true);
      }
      setSaved(true);
      return;
    }

    // Signed in: save sighting, then upload photo to Vercel Blob
    const base64 = capturedImage.split(",")[1];
    const mimeType = capturedImage.split(";")[0].split(":")[1];

    // Save sighting first (establishes the record Photo FK needs)
    const res = await fetch("/api/sighting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speciesCode: result.speciesCode,
        commonName: result.commonName,
        sciName: result.scientificName,
        confidence: result.confidence,
        description: result.description,
        habitat: result.habitat,
        funFact: result.funFact,
      }),
    });
    const saveData = await res.json().catch(() => ({}));

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

    if (saveData?.isNew) setCelebrating(true);
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
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline muted autoPlay
                style={!hardwareZoomRef.current && zoom > 1
                  ? { transform: `scale(${zoom})`, transformOrigin: "center" }
                  : undefined}
              />
              {/* Crosshair overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 border-2 border-[var(--dex-green)] opacity-60 rounded">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--dex-green)]" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--dex-green)]" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--dex-green)]" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--dex-green)]" />
                </div>
              </div>
              {/* Zoom slider */}
              {cameraActive && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => applyZoom(Math.max(1, parseFloat((zoom - 0.5).toFixed(1))))}
                    className="w-7 h-7 rounded-full bg-black bg-opacity-60 text-white font-bold text-sm flex items-center justify-center border border-gray-600"
                  >−</button>
                  <input
                    type="range"
                    min={1}
                    max={zoomMax}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-[var(--dex-green)]"
                  />
                  <button
                    onClick={() => applyZoom(Math.min(zoomMax, parseFloat((zoom + 0.5).toFixed(1))))}
                    className="w-7 h-7 rounded-full bg-black bg-opacity-60 text-white font-bold text-sm flex items-center justify-center border border-gray-600"
                  >+</button>
                  <span className="font-pixel text-white bg-black bg-opacity-60 px-1.5 py-0.5 rounded" style={{fontSize:"8px"}}>
                    {zoom.toFixed(1)}×
                  </span>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {!cameraActive && (
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
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {cameraActive && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={captureFrame}
                  className="dex-btn w-20 h-20 rounded-full font-pixel text-white text-xs"
                >
                  SNAP
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="font-pixel text-gray-500 text-xs underline"
                >
                  UPLOAD INSTEAD
                </button>
              </div>
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

      {celebrating && result && (
        <NewCatchOverlay
          commonName={result.commonName}
          onDone={() => setCelebrating(false)}
        />
      )}

      <DexBottomBar />
    </div>
  );
}
