"use client";

import { useSearchParams } from "next/navigation";
import FilmPlayer from "@/components/FilmPlayer";

export default function FilmPage() {
  const searchParams = useSearchParams();
  
  // We love big buck boney video
  const defaultSrc = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const src = searchParams.get("src") || defaultSrc;
  const autoplay = searchParams.get("autoplay") === "1";
  const rate = parseFloat(searchParams.get("rate") || "1");
  
  return (
    <div className="min-h-screen bg-black">
      <FilmPlayer
        src={src}
        autoplay={autoplay}
        initialRate={rate}
      />
    </div>
  );
}
