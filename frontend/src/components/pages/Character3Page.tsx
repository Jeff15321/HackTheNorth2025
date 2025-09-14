"use client";

import { useMemo, useState, useEffect } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import ScribbleEditor, { ScribbleLine } from "@/components/ScribbleEditor";
import { getScribblesForImage, setScribblesForImage, getCurrentCharacterGallaryIndex, setCurrentCharacterGallaryIndex, characterGallaryData, updateCharacterGalleryData, setEntryLoading, initializeAllLoadingFalse, GalleryCategory } from "@/data/characterData";
import { sendImageWithScribbles } from "@/lib/imageAgent";
import LoadingClapBoard from "../common/loading_clap_board";
import { useBackendStore } from "@/store/backendStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronUp, ChevronDown, Send } from "lucide-react";

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
    if (!projectId) {
      console.error("Project ID is not set. Please create/select a project first.");
      return;
    }
    setInput("");
    const payload = {
      prompt,
      imageSrc: current?.image || "",
      lines: scribblesByIndex[index] || [],
      projectId,
    };
    setIsProcessing(true);
    setEntryLoading(activeTab, index, true);
    try {
      const resp = await sendImageWithScribbles(payload);
      // Mark completed on first successful response
      useSceneStore.getState().setCompleted("character_3", true);
      // Replace current entry with returned values
      updateCharacterGalleryData(activeTab, index, resp.file_path, resp.description);
      // Clear scribbles for new image path
      setScribblesByIndex((prev) => ({ ...prev, [index]: [] }));
      setScribblesForImage(resp.file_path, []);
      setVersion((v) => v + 1);
    } finally {
      setIsProcessing(false);
      setEntryLoading(activeTab, index, false);
    }
  }

  // Load persisted scribbles for the current image when index changes
  // and seed into state for the editor.
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
    <div
      className="font-game"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "80%",
        background: "var(--game-soft-white)",
        borderLeft: "1px solid var(--game-light-gray)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.1)",
        padding: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: "var(--game-charcoal)",
        borderRadius: "16px 0 0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {(["characters", "objects", "scenes"] as GalleryCategory[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Button
                key={tab}
                variant={selected ? "default" : "outline"}
                onClick={() => { setActiveTab(tab); setIndex(0); }}
                className="font-game"
                style={{
                  background: selected ? "var(--game-orange)" : "transparent",
                  color: selected ? "var(--game-soft-white)" : "var(--game-charcoal)",
                  border: selected ? "2px solid var(--game-orange)" : "2px solid var(--game-light-gray)",
                  borderRadius: 12,
                  textTransform: "capitalize",
                  fontSize: 16,
                  fontWeight: 500,
                  padding: "8px 16px",
                }}
              >
                {tab}
              </Button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-var(--game-charcoal) hover:bg-var(--game-orange) hover:text-var(--game-soft-white)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 16,
          minHeight: 0,
        }}
      >
        {/* Left column: vertical image scroller with arrows */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            background: "var(--game-cream)",
            overflow: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Button
            onClick={goPrev}
            variant="ghost"
            aria-label="Previous image"
            className="font-game"
            style={{
              border: "none",
              background: "transparent",
              padding: 12,
              color: "var(--game-charcoal)",
              borderBottom: "2px solid var(--game-light-gray)",
              borderRadius: "16px 16px 0 0",
              height: 48,
            }}
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            {!hasEntries ? (
              <div className="font-game" style={{ opacity: 0.7, color: "var(--game-dark-gray)" }}>No images available.</div>
            ) : isProcessing && characterGallaryData[activeTab][index]?.loading ? (
              <LoadingClapBoard />
            ) : (
              <ScribbleEditor
                src={current!.image}
                width={420}
                lines={scribblesByIndex[index]}
                onChangeLines={(l) => {
                  setScribblesByIndex((prev) => ({ ...prev, [index]: l }));
                  if (current?.image) setScribblesForImage(current.image, l);
                }}
              />
            )}
          </div>
          <Button
            onClick={goNext}
            variant="ghost"
            aria-label="Next image"
            className="font-game"
            style={{
              border: "none",
              background: "transparent",
              padding: 12,
              color: "var(--game-charcoal)",
              borderTop: "2px solid var(--game-light-gray)",
              borderRadius: "0 0 16px 16px",
              height: 48,
            }}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>

        {/* Right column: description for current image */}
        <div
          style={{
            flex: 1,
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="font-game-bold" style={{ fontSize: 18, color: "var(--game-charcoal)" }}>
              {index + 1}/{entries.length}
            </div>
          </div>
          
          {/* Description area - takes up most space */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            {!hasEntries ? (
              <div className="font-game" style={{ opacity: 0.7, color: "var(--game-dark-gray)" }}>No description available.</div>
            ) : isProcessing && characterGallaryData[activeTab][index]?.loading ? (
              <LoadingClapBoard />
            ) : (
              <p className="font-game" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 16 }}>{current!.description}</p>
            )}
          </div>
          
          {/* Input area - fixed height at bottom */}
          <div style={{ display: "flex", gap: 12, alignItems: "stretch", height: 48 }}>
            <Textarea
              className="font-game"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitCurrent();
                }
              }}
              placeholder="Describe changes to the image... (Enter to submit, Shift+Enter for newline)"
              style={{
                flex: 1,
                height: 48,
                border: "2px solid var(--game-light-gray)",
                borderRadius: 12,
                padding: "8px 12px",
                outline: "none",
                resize: "none",
                background: "var(--game-soft-white)",
                color: "var(--game-charcoal)",
                fontSize: 14,
                lineHeight: 1.4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--game-orange)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(246, 183, 142, 0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--game-light-gray)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            />
            <Button
              className="font-game"
              onClick={handleSubmitCurrent}
              disabled={!input.trim() || isProcessing}
              style={{
                height: 48,
                padding: "0 16px",
                background: isProcessing ? "var(--game-light-gray)" : "var(--game-orange)",
                color: "var(--game-soft-white)",
                border: "2px solid var(--game-orange)",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                boxShadow: "0 4px 12px rgba(246, 183, 142, 0.3)",
                transition: "all 0.2s ease",
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


