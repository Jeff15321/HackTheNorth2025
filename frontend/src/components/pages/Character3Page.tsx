"use client";

import { useState, useEffect } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import ScribbleEditor, { ScribbleLine } from "@/components/ScribbleEditor";
import { getScribblesForImage, setScribblesForImage, getCurrentCharacterGallaryIndex, setCurrentCharacterGallaryIndex, characterGallaryData, updateCharacterGalleryData, setEntryLoading, initializeAllLoadingFalse, GalleryCategory } from "@/data/characterData";
import { sendImageWithScribbles } from "@/lib/imageAgent";
import LoadingClapBoard from "../common/ClapboardLoading3D";
import { useBackendStore } from "@/store/backendStore";
import { DuoButton, DuoTextArea } from "@/components/duolingo";

export default function Character3Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const [activeTab, setActiveTab] = useState<GalleryCategory>("characters");
  const entries = characterGallaryData[activeTab];
  const hasEntries = entries && entries.length > 0;

  const [index, setIndex] = useState(getCurrentCharacterGallaryIndex());
  const [scribblesByIndex, setScribblesByIndex] = useState<Record<number, ScribbleLine[]>>({});
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [version, setVersion] = useState(0);
  const current = hasEntries ? (entries[index] ?? entries[0]) : undefined;
  const projectId = useBackendStore((s) => s.projectId);

  useEffect(() => {
    initializeAllLoadingFalse();
  }, []);

  function goPrev() {
    if (!hasEntries) return;
    setIndex((i) => {
      const next = (i - 1 + entries.length) % entries.length;
      setCurrentCharacterGallaryIndex(next);
      return next;
    });
  }

  function goNext() {
    if (!hasEntries) return;
    setIndex((i) => {
      const next = (i + 1) % entries.length;
      setCurrentCharacterGallaryIndex(next);
      return next;
    });
  }

  async function handleSubmitCurrent() {
    const prompt = input.trim();
    if (!prompt) return;
    setInput("");
    setIsProcessing(true);
    setEntryLoading(activeTab, index, true);
    try {
      let resp: { file_path: string; description: string };
      if (projectId) {
        const payload = {
          prompt,
          imageSrc: current?.image || "",
          lines: scribblesByIndex[index] || [],
          projectId,
        };
        resp = await sendImageWithScribbles(payload);
      } else {
        // Dummy local response for testing without a project
        await new Promise((r) => setTimeout(r, 600));
        resp = {
          file_path: current?.image || "",
          description:
            (current?.description ? current.description + "\n\n" : "") +
            `Applied change: ${prompt}`,
        };
      }
      useSceneStore.getState().setCompleted("character_3", true);
      updateCharacterGalleryData(activeTab, index, resp.file_path, resp.description);
      setScribblesByIndex((prev) => ({ ...prev, [index]: [] }));
      setScribblesForImage(resp.file_path, []);
      setVersion((v) => v + 1);
    } finally {
      setIsProcessing(false);
      setEntryLoading(activeTab, index, false);
    }
  }

  // Load persisted scribbles for the current image when index changes
  const imageForIndex = (i: number) => entries[i]?.image;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const imgSrc = imageForIndex(index);
  if (imgSrc && loadedKey !== imgSrc) {
    const persisted = getScribblesForImage(imgSrc);
    if (persisted) {
      setScribblesByIndex((prev) => ({ ...prev, [index]: persisted }));
    }
    setLoadedKey(imgSrc);
  }

  return (
    <div className="fixed inset-y-0 right-0 z-10 flex min-h-screen w-[80%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]">
      <div className="flex h-full w-full flex-col gap-4 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-feather text-[24px] text-white/95">Visual Designer</h2>
            <span className="text-white/40">{hasEntries ? `${index + 1}/${entries.length}` : "0/0"}</span>
          </div>
          <DuoButton variant="secondary" size="md" onClick={reset}>Close</DuoButton>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["characters", "objects", "scenes"] as GalleryCategory[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setIndex(0); }}
                className={[
                  "font-feather rounded-full px-4 py-2 border transition text-[14px] capitalize",
                  selected ? "border-[#2aa3ff] text-[#69c0ff]" : "border-white/12 text-white/80 hover:border-white/22 hover:text-white/90",
                  "bg-white/5"
                ].join(" ")}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content: two columns */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left column: canvas with in-frame nav arrows */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/5">
            <div className="relative flex flex-1 items-center justify-center p-3">
              {!hasEntries ? (
                <div className="text-white/60">No images available.</div>
              ) : isProcessing && characterGallaryData[activeTab][index]?.loading ? (
                <LoadingClapBoard />
              ) : (
                <ScribbleEditor
                  src={current!.image}
                  lines={scribblesByIndex[index]}
                  onChangeLines={(l) => {
                    setScribblesByIndex((prev) => ({ ...prev, [index]: l }));
                    if (current?.image) setScribblesForImage(current.image, l);
                  }}
                />
              )}
              {/* Overlay arrows */}
              {hasEntries && (
                <>
                  <button
                    onClick={goPrev}
                    aria-label="Previous"
                    className="absolute left-6 top-1/2 -translate-y-1/2 rounded-[12px] border border-white/20 bg-white/50 px-3 py-2 text-[#0e1b1d] backdrop-blur-sm"
                  >
                    ←
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next"
                    className="absolute right-6 top-1/2 -translate-y-1/2 rounded-[12px] border border-white/20 bg-white/50 px-3 py-2 text-[#0e1b1d] backdrop-blur-sm"
                  >
                    →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right column: description & prompt */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-4 text-white/95">
            <div className="mb-3 text-white/80">Description</div>
            <div className="flex-1 overflow-auto rounded-[12px] border border-white/8 bg-white/[0.03] p-3">
              {!hasEntries ? (
                <div className="text-white/60">No description available.</div>
              ) : isProcessing && characterGallaryData[activeTab][index]?.loading ? (
                <LoadingClapBoard />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{current!.description}</p>
              )}
            </div>

            <div className="mt-4">
              <DuoTextArea
                label="Describe changes"
                placeholder="e.g. Make the lighting moodier, add rain, change outfit to red…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitCurrent();
                  }
                }}
                className="min-h-24"
              />
              <div className="mt-3 flex items-center justify-end">
                <DuoButton size="md" onClick={handleSubmitCurrent} disabled={isProcessing || !input.trim()}>
                  Apply changes
                </DuoButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


