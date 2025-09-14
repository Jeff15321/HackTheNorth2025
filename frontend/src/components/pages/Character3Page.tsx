"use client";

import { useMemo, useState, useEffect } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { themeCharacter1, colors } from "@/styles/colors";
import ScribbleEditor, { ScribbleLine } from "@/components/ScribbleEditor";
import { getScribblesForImage, setScribblesForImage, getCurrentCharacterGallaryIndex, setCurrentCharacterGallaryIndex, characterGallaryData, updateCharacterGalleryData, setEntryLoading, initializeAllLoadingFalse, GalleryCategory } from "@/data/characterData";
import { sendImageWithScribbles } from "@/lib/imageAgent";
import LoadingClapBoard from "../common/loading_clap_board";
import { useBackendStore } from "@/store/backendStore";

export default function Character3Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const textColor = themeCharacter1.text;
  const borderColor = themeCharacter1.border;
  const backgroundColor = themeCharacter1.background;

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
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "80%",
        background: backgroundColor,
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        boxShadow: `-8px 0 24px ${colors.shadow}`,
        padding: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        color: textColor,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["characters", "objects", "scenes"] as GalleryCategory[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setIndex(0); }}
                style={{
                  border: `1px solid ${selected ? borderColor : colors.borderLight}`,
                  padding: "6px 10px",
                  borderRadius: 16,
                  background: selected ? colors.white : "transparent",
                  color: selected ? borderColor : textColor,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <button
          style={{ border: `1px solid ${colors.borderLight}`, padding: "6px 10px", borderRadius: 6, background: colors.white }}
          onClick={reset}
        >
          Close
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 12,
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
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            background: colors.white,
            overflow: "auto",
          }}
        >
          <button
            onClick={goPrev}
            aria-label="Previous image"
            style={{
              border: "none",
              background: "transparent",
              padding: 8,
              cursor: "pointer",
              color: borderColor,
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            ▲
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            {!hasEntries ? (
              <div style={{ opacity: 0.7 }}>No images available.</div>
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
          <button
            onClick={goNext}
            aria-label="Next image"
            style={{
              border: "none",
              background: "transparent",
              padding: 8,
              cursor: "pointer",
              color: borderColor,
              borderTop: `1px solid ${colors.cardBorder}`,
            }}
          >
            ▼
          </button>
        </div>

        {/* Right column: description for current image */}
        <div
          style={{
            flex: 1,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            background: colors.white,
            color: borderColor,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{index + 1}/{entries.length}</div>
          </div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!hasEntries ? (
              <div style={{ opacity: 0.7 }}>No description available.</div>
            ) : isProcessing && characterGallaryData[activeTab][index]?.loading ? (
              <LoadingClapBoard />
            ) : (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{current!.description}</p>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${colors.cardBorder}`, paddingTop: 8, marginTop: 8, display: "flex", minHeight: 0, flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitCurrent();
                }
              }}
              placeholder="Describe changes (Enter to submit, Shift+Enter for newline)"
              style={{
                width: "100%",
                border: `1px solid ${colors.borderLight}`,
                borderRadius: 6,
                padding: "6px 10px",
                outline: "none",
                resize: "none",
                height: "100%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


