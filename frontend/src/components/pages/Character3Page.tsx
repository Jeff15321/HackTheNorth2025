"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSceneStore } from "@/store/useSceneStore";
import ScribbleEditor, { ScribbleLine } from "@/components/ScribbleEditor";
import { getScribblesForImage, setScribblesForImage, getCurrentCharacterGallaryIndex, setCurrentCharacterGallaryIndex, characterGallaryData, updateCharacterGalleryData, setEntryLoading, initializeAllLoadingFalse, GalleryCategory } from "@/data/characterData";
import LoadingClapBoard from "../common/ClapboardLoading3D";
import { useBackendStore } from "@/store/backendStore";
import { DuoButton, DuoTextArea } from "@/components/duolingo";
import { useProject, useProjectData, useImageEditing } from "@/hooks/useBackendIntegration";
import type { BackendCharacter, BackendScene } from "@/data/characterData";

export default function Character3Page() {
  const router = useRouter();
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);
  const project = useProject();
  const projectData = useProjectData();
  const imageEditing = useImageEditing();

  const [activeTab, setActiveTab] = useState<GalleryCategory>("characters");
  const [backendCharacters, setBackendCharacters] = useState<BackendCharacter[]>([]);
  const [backendScenes, setBackendScenes] = useState<BackendScene[]>([]);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [imagesLoadingStatus, setImagesLoadingStatus] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef({ characters: 0, scenes: 0 });
  const lastFetchTime = useRef(0);

  // Use backend data when available, fallback to local data
  const hasBackendData = project?.currentProject && (backendCharacters.length > 0 || backendScenes.length > 0);
  const entries = hasBackendData ?
    (activeTab === "characters" ?
      backendCharacters.map(char => ({
        image: char.media_url || "/images/placeholder.jpg",
        description: `${char.metadata?.name || 'Unnamed'}\nRole: ${char.metadata?.role || 'Unknown'}\nAge: ${char.metadata?.age || 'Unknown'}\nDescription: ${char.metadata?.description || 'No description'}\nPersonality: ${char.metadata?.personality || 'No personality info'}\nBackstory: ${char.metadata?.backstory || 'No backstory'}`,
        loading: imagesLoadingStatus[char.media_url || ''] ?? true,
        id: char.id
      })) :
      backendScenes.map(scene => ({
        image: scene.media_url || "/images/placeholder.jpg",
        description: `Concise Plot: ${scene.metadata?.concise_plot || 'No plot'}\nDetailed Plot: ${scene.metadata?.detailed_plot || 'No detailed plot'}\nDialogue: ${scene.metadata?.dialogue || 'No dialogue'}`,
        loading: imagesLoadingStatus[scene.media_url || ''] ?? true,
        id: scene.id
      }))
    ) : characterGallaryData[activeTab];
  const hasEntries = entries && entries.length > 0;

  const [index, setIndex] = useState(getCurrentCharacterGallaryIndex());
  const [scribblesByIndex, setScribblesByIndex] = useState<Record<number, ScribbleLine[]>>({});
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const current = hasEntries ? (entries[index] ?? entries[0]) : undefined;
  const projectId = useBackendStore((s) => s.projectId);

  const handleRefreshImage = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Get image URL with cache-busting parameter
  const getImageUrl = useCallback((url: string) => {
    if (!url || url === '/images/placeholder.jpg') return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${refreshKey}`;
  }, [refreshKey]);

  useEffect(() => {
    initializeAllLoadingFalse();
  }, []);

  // Polling function with data comparison and throttling
  const pollData = useCallback(async () => {
    if (!project?.currentProject) return;

    // Throttle API calls to prevent excessive requests
    const now = Date.now();
    if (now - lastFetchTime.current < 5000) {
      return; // Skip if less than 5 seconds since last fetch
    }
    lastFetchTime.current = now;

    try {
      const [characters, scenes] = await Promise.all([
        projectData.refreshCharacters(),
        projectData.refreshScenes()
      ]);

      // Only update state if data has actually changed
      const currentCount = { characters: characters.length, scenes: scenes.length };
      const lastCount = lastDataRef.current;

      if (currentCount.characters !== lastCount.characters || currentCount.scenes !== lastCount.scenes) {
        console.log('Data updated:', currentCount);
        setBackendCharacters(characters);
        setBackendScenes(scenes);
        lastDataRef.current = currentCount;
      }

    } catch (error) {
      console.error('Error polling data:', error);
    }
  }, [project?.currentProject, projectData]);

  // Set up polling every 10 seconds (reduced frequency)
  useEffect(() => {
    if (!project?.currentProject) {
      // Clear data and interval when no project
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBackendCharacters([]);
      setBackendScenes([]);
      lastDataRef.current = { characters: 0, scenes: 0 };
      lastFetchTime.current = 0;
      return;
    }

    // Initial load
    pollData();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start polling every 10 seconds (reduced from 5 seconds)
    intervalRef.current = setInterval(pollData, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [project?.currentProject?.id]); // Remove pollData from dependency array to prevent recreating interval

  const goPrev = useCallback(() => {
    if (!hasEntries || !entries) return;
    setIndex((i) => {
      const next = (i - 1 + entries.length) % entries.length;
      if (!hasBackendData) {
        setCurrentCharacterGallaryIndex(next);
      }
      return next;
    });
  }, [hasEntries, entries, hasBackendData]);

  const goNext = useCallback(() => {
    if (!hasEntries || !entries) return;
    setIndex((i) => {
      const next = (i + 1) % entries.length;
      if (!hasBackendData) {
        setCurrentCharacterGallaryIndex(next);
      }
      return next;
    });
  }, [hasEntries, entries, hasBackendData]);

  async function handleSubmitCurrent() {
    const prompt = input.trim();
    if (!prompt) return;
    setInput("");
    setIsProcessing(true);
    setEntryLoading(activeTab, index, true);
    try {
      let resp: { file_path: string; description: string };

      // Use backend image editing if we have a project and current image
      if (project?.currentProject && current?.image && hasBackendData) {
        const jobId = await imageEditing.editImage({
          projectId: project.currentProject.id,
          sourceUrl: current.image,
          editPrompt: prompt,
          metadata: {
            source: 'character_gallery',
            tab: activeTab,
            index: index
          }
        });

        console.log('Image editing job started:', jobId);
        resp = {
          file_path: current.image,
          description: current.description + "\n\nEditing in progress..."
        };
      } else if (projectId) {
        // Fallback to old system
        const { sendImageWithScribbles } = await import("@/lib/imageAgent");
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

      // Only update local gallery data if not using backend data
      if (!hasBackendData) {
        updateCharacterGalleryData(activeTab, index, resp.file_path, resp.description);
      }

      setScribblesByIndex((prev) => ({ ...prev, [index]: [] }));
      setScribblesForImage(resp.file_path, []);
    } finally {
      setIsProcessing(false);
      setEntryLoading(activeTab, index, false);
    }
  }

  const handleGenerateScenes = async () => {
    if (!project?.currentProject || isGeneratingScenes) return;

    try {
      setIsGeneratingScenes(true);

      // Check if script has been enhanced
      // if (!project.currentProject.plot || project.currentProject.plot.trim() === '') {
      //   alert('Please enhance the script first to generate scenes. Go to the Script Enhancement tab.');
      //   return;
      // }

      const result = await projectData.generateScenes();

      if (result.success) {
        console.log('Scene generation started:', result.jobIds);
        // Switch to scenes tab to show progress
        setActiveTab("scenes");
      } else {
        alert('Error generating scenes: ' + result.message);
      }

    } catch (error) {
      console.error('Error generating scenes:', error);
      alert('Error generating scenes: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingScenes(false);
    }
  }

  const handleGenerateVideo = async () => {
    if (!project?.currentProject || isGeneratingVideo) return;

    try {
      setIsGeneratingVideo(true);

      const result = await projectData.generateVideo();

      if (result.success) {
        console.log('Video generation started:', result.message);
        // Navigate to timeline page using Next.js router
        reset(); // Close the current page
        router.push('/timeline'); // Redirect to timeline page
        console.log('Redirecting to /timeline page to monitor video progress');
      } else {
        alert('Error generating video: ' + result.message);
      }

    } catch (error) {
      console.error('Error generating video:', error);
      alert('Error generating video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  // Load persisted scribbles for the current image when index changes
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (entries && entries.length > 0 && entries[index]) {
      const imgSrc = entries[index].image;
      if (imgSrc && loadedKey !== imgSrc && !hasBackendData) {
        const persisted = getScribblesForImage(imgSrc);
        if (persisted && persisted.length > 0) {
          setScribblesByIndex((prev) => ({ ...prev, [index]: persisted }));
        }
        setLoadedKey(imgSrc);
      }
    }
  }, [entries, index, loadedKey, hasBackendData]);

  // Reset index when switching tabs
  useEffect(() => {
    setIndex(0);
    // Clear loading status when switching tabs
    setImagesLoadingStatus({});
  }, [activeTab]);

  // Preload images when entries change
  useEffect(() => {
    if (entries && entries.length > 0) {
      entries.forEach((entry: any) => {
        if (entry.image && entry.image !== '/images/placeholder.jpg') {
          // Initialize loading status
          if (!(entry.image in imagesLoadingStatus)) {
            setImagesLoadingStatus(prev => ({ ...prev, [entry.image]: true }));

            // Create a hidden image to preload
            const img = new Image();
            img.onload = () => {
              setImagesLoadingStatus(prev => ({ ...prev, [entry.image]: false }));
            };
            img.onerror = () => {
              setImagesLoadingStatus(prev => ({ ...prev, [entry.image]: false }));
            };
            img.src = entry.image;
          }
        }
      });
    }
  }, [entries, imagesLoadingStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-y-0 right-0 z-10 flex min-h-screen w-[70%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]">
      <div className="flex h-full w-full flex-col gap-4 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between h-9">
          <div className="flex items-center gap-3">
            <h2 className="font-feather text-[24px] text-white/95">Visual Designer</h2>
            <span className="text-white/40">{hasEntries ? `${index + 1}/${entries.length}` : "0/0"}</span>
          </div>
          <DuoButton variant="secondary" size="md" onClick={reset}>Close</DuoButton>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["characters", "scenes"] as GalleryCategory[]).map((tab) => {
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
              ) : isProcessing || current?.loading ? (
                <LoadingClapBoard />
              ) : (
                <>
                  <ScribbleEditor
                    src={getImageUrl(current?.image || '')}
                    lines={scribblesByIndex[index] || []}
                    onChangeLines={(l) => {
                      setScribblesByIndex((prev) => ({ ...prev, [index]: l }));
                      if (current?.image) setScribblesForImage(current.image, l);
                    }}
                  />
                  {/* Refresh button */}
                  <button
                    onClick={handleRefreshImage}
                    className="absolute top-6 right-6 rounded-[12px] border border-white/20 bg-white/10 px-3 py-2 text-white/80 hover:bg-white/20 hover:text-white backdrop-blur-sm transition-colors"
                    title="Refresh image (bypass cache)"
                  >
                    🔄
                  </button>
                  {/* Hidden image to preload and track loading status */}
                  {current?.image && (
                    <img
                      src={getImageUrl(current.image)}
                      style={{ display: 'none' }}
                      onLoad={() => {
                        setImagesLoadingStatus(prev => ({ ...prev, [current.image]: false }));
                      }}
                      onError={() => {
                        setImagesLoadingStatus(prev => ({ ...prev, [current.image]: false }));
                      }}
                    />
                  )}
                </>
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
              ) : isProcessing || current?.loading ? (
                <LoadingClapBoard />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{current?.description || 'No description available.'}</p>
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
              <div className="mt-3 flex justify-end gap-2">
                {activeTab === "characters" ? (
                  <DuoButton
                    size="md"
                    className="bg-[#8b5cf6] text-white shadow-[0_6px_0_#6e46d9] hover:brightness-105"
                    onClick={handleGenerateScenes}
                    disabled={isGeneratingScenes}
                  >
                    {isGeneratingScenes ? 'Generating...' : 'Generate Scenes'}
                  </DuoButton>
                ) : (
                  <DuoButton
                    size="md"
                    className="bg-[#f59e0b] text-white shadow-[0_6px_0_#d97706] hover:brightness-105"
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo || backendScenes.length === 0}
                  >
                    {isGeneratingVideo ? 'Generating...' : 'Generate Video'}
                  </DuoButton>
                )}
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


