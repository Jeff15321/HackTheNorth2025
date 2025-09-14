"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useProject, useProjectData } from "@/hooks/useBackendIntegration";
import { getCurrentProject, getCurrentProjectId } from "@/data/projectData";
import type { BackendScene } from "@/data/characterData";
import LoadingClapBoard from "@/components/common/ClapboardLoading3D";

type SceneCard = {
  id: string;
  title: string;
  date: string;
  image: string;
  durationSec: number;
  frames: { title: string; description: string; video_url?: string; image_url?: string; status?: string; progress?: number }[];
};

interface VideoFrame {
  id: string;
  scene_id: string;
  video_url?: string;
  image_url?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  metadata?: {
    duration?: number;
    scene_order?: number;
    frame_order?: number;
    dialogue?: string;
    detailed_plot?: string;
    concise_plot?: string;
    veo3_prompt?: string;
    summary?: string;
    split_reason?: string;
  };
}

export default function TimelinePage() {
  // Backend integration
  const projectData = useProjectData();

  // Backend data state
  const [backendScenes, setBackendScenes] = useState<BackendScene[]>([]);
  const [videoFrames, setVideoFrames] = useState<VideoFrame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTime = useRef(0);

  // Enhanced polling function to get project ID and fetch all frames
  const pollData = useCallback(async () => {
    // Get current project ID
    const currentProject = getCurrentProject();
    const projectId = getCurrentProjectId();

    console.log('Timeline: Current project ID:', projectId);
    console.log('Timeline: Current project:', currentProject);

    if (!projectId || !currentProject) {
      console.log('Timeline: No project ID found, skipping data fetch');
      return;
    }

    // Throttle API calls to every 5 seconds to match polling interval
    const now = Date.now();
    if (now - lastFetchTime.current < 4500) { // Slight buffer to ensure clean 5s intervals
      return;
    }
    lastFetchTime.current = now;

    try {
      console.log('Timeline: Fetching frames data for project:', projectId);

      // Focus on getting complete status with all frames
      const completeStatus = await projectData.getCompleteStatus();
      console.log('Timeline: Complete status:', completeStatus);

      // Also get scenes for metadata
      const scenes = await projectData.refreshScenes();
      setBackendScenes(scenes);

      // Process frames from the complete status
      const frames: VideoFrame[] = [];

      if (completeStatus.frames && completeStatus.frames.length > 0) {
        console.log('Timeline: Processing frames from complete status:', completeStatus.frames.length);

        completeStatus.frames.forEach((frame: any, index: number) => {
          // Determine frame status based on available data
          let status: 'pending' | 'generating' | 'completed' | 'failed' = 'pending';
          let progress = 0;

          if (frame.video_url) {
            status = 'completed';
            progress = 100;
          } else if (frame.media_url) {
            // Frame has its own generated image
            status = 'generating';
            progress = 50; // Image exists, video pending
          }

          console.log('Timeline: Processing frame:', {
            id: frame.id,
            scene_id: frame.scene_id,
            has_video_url: !!frame.video_url,
            has_media_url: !!frame.media_url,
            media_url: frame.media_url,
            metadata: frame.metadata
          });

          frames.push({
            id: frame.id || `frame-${index}`,
            scene_id: frame.scene_id || '',
            video_url: frame.video_url,
            image_url: frame.media_url, // Use frame's media_url as the image
            status,
            progress,
            metadata: {
              duration: frame.metadata?.duration || 8,
              scene_order: frame.metadata?.scene_order || frame.metadata?.frame_order || index + 1,
              dialogue: frame.metadata?.dialogue,
              detailed_plot: frame.metadata?.detailed_plot || frame.metadata?.summary,
              concise_plot: frame.metadata?.concise_plot || frame.metadata?.summary
            }
          });
        });
      } else {
        console.log('Timeline: No frames found in complete status');
        // If no frames exist yet, create placeholder frames from scenes
        scenes.forEach((scene, index) => {
          frames.push({
            id: `placeholder-frame-${scene.id}`,
            scene_id: scene.id,
            video_url: undefined,
            image_url: scene.media_url,
            status: 'pending',
            progress: 0,
            metadata: {
              duration: 8,
              scene_order: scene.metadata?.scene_order || index + 1,
              dialogue: scene.metadata?.dialogue,
              detailed_plot: scene.metadata?.detailed_plot,
              concise_plot: scene.metadata?.concise_plot
            }
          });
        });
      }

      console.log('Timeline: Total frames processed:', frames.length);
      console.log('Timeline: Frames with video_url:', frames.filter(f => f.video_url).length);
      console.log('Timeline: Frames with image_url:', frames.filter(f => f.image_url).length);

      setVideoFrames(frames);

      // Frames processed successfully - videoFrames state updated

    } catch (error) {
      console.error('Timeline: Error polling data:', error);
    }
  }, [projectData]);

  // Set up polling and initial data fetch
  useEffect(() => {
    const projectId = getCurrentProjectId();
    console.log('Timeline: useEffect triggered with project ID:', projectId);

    if (!projectId) {
      console.log('Timeline: No project ID, clearing data');
      setBackendScenes([]);
      setVideoFrames([]);
      setIsLoading(false);
      return;
    }

    console.log('Timeline: Starting data fetch for project:', projectId);
    setIsLoading(true);

    // Initial data fetch
    pollData().finally(() => {
      console.log('Timeline: Initial data fetch completed');
      setIsLoading(false);
    });

    // Start polling every 5 seconds to fetch latest frame data
    console.log('Timeline: Starting polling every 5 seconds');
    intervalRef.current = setInterval(() => {
      console.log('Timeline: Polling interval triggered - refetching latest frame data');
      pollData();
    }, 5000);

    return () => {
      console.log('Timeline: Cleaning up polling interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollData]);

  // Convert backend data to SceneCard format - organize frames by scenes
  const scenes: SceneCard[] = useMemo(() => {
    const currentProjectId = getCurrentProjectId();
    const hasBackendData = currentProjectId && videoFrames.length > 0;

    if (hasBackendData) {
      console.log('Timeline: Converting frames to SceneCard format:', videoFrames.length);

      // Group frames by scene_id
      const sceneGroups = new Map<string, VideoFrame[]>();

      videoFrames.forEach(frame => {
        const sceneId = frame.scene_id || 'unknown';
        if (!sceneGroups.has(sceneId)) {
          sceneGroups.set(sceneId, []);
        }
        sceneGroups.get(sceneId)!.push(frame);
      });

      // Convert each group to a scene
      return Array.from(sceneGroups.entries()).map(([sceneId, sceneFrames], sceneIndex) => {
        // Sort frames by frame_order (metadata.frame_order)
        sceneFrames.sort((a, b) => {
          const aOrder = a.metadata?.frame_order || a.metadata?.scene_order || 0;
          const bOrder = b.metadata?.frame_order || b.metadata?.scene_order || 0;
          return aOrder - bOrder;
        });

        // Find the corresponding scene data for this scene_id
        const sceneData = backendScenes.find(s => s.id === sceneId);

        console.log('Timeline: Converting scene group:', {
          sceneId,
          sceneFrames: sceneFrames.length,
          firstFrameImageUrl: sceneFrames[0]?.image_url,
          sceneDataMediaUrl: sceneData?.media_url,
          frames: sceneFrames.map(f => ({ id: f.id, image_url: f.image_url, status: f.status }))
        });

        return {
          id: sceneId,
          title: `Scene ${sceneData?.metadata?.scene_order || sceneIndex + 1}`,
          date: sceneData?.created_at ? new Date(sceneData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          image: sceneFrames[0]?.image_url || sceneData?.media_url || "/images/placeholder.jpg", // Prefer first frame's image
          durationSec: sceneFrames.reduce((sum, frame) => sum + (frame.metadata?.duration || 8), 0),
          frames: sceneFrames.map((frame, frameIndex) => ({
            title: `Frame ${frameIndex + 1}`,
            description: frame.metadata?.concise_plot || frame.metadata?.detailed_plot || frame.metadata?.summary || 'Generated frame',
            video_url: frame.video_url,
            image_url: frame.image_url, // Individual frame image
            status: frame.status,
            progress: frame.progress
          }))
        };
      }).sort((a, b) => {
        // Sort scenes by the scene metadata order from backend scenes
        const aSceneData = backendScenes.find(s => s.id === a.id);
        const bSceneData = backendScenes.find(s => s.id === b.id);
        const aOrder = aSceneData?.metadata?.scene_order || 999;
        const bOrder = bSceneData?.metadata?.scene_order || 999;
        return aOrder - bOrder;
      });
    }

    // Fallback to mock data if no backend data
    return [
      {
        id: "s1",
        title: "Scene 1",
        date: "2025-09-14",
        image: "/images/cat1.jpg",
        durationSec: 8,
        frames: [
          { title: "Frame A", description: "No backend data - generate scenes and frames first" },
        ],
      },
    ];
  }, [backendScenes, videoFrames]);

  const currentProjectId = getCurrentProjectId();
  const hasBackendData = currentProjectId && (backendScenes.length > 0 || videoFrames.length > 0);

  console.log('Timeline render:', {
    currentProjectId,
    hasBackendData,
    scenesCount: backendScenes.length,
    framesCount: videoFrames.length,
    isLoading
  });

  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [modalFrame, setModalFrame] = useState<{
    frame: any;
    fullFrame: VideoFrame;
    scene: any;
  } | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [showStitchingModal, setShowStitchingModal] = useState(false);

  // Function to generate final video - always shows permanent loading modal
  const handleGenerateVideo = () => {
    // Show the modal with permanent loading immediately
    setShowStitchingModal(true);
    setIsStitching(true);

    // Optionally trigger actual video generation in background
    const currentProjectId = getCurrentProjectId();
    if (currentProjectId) {
      // Get all video URLs from completed frames
      const videoUrls = videoFrames
        .filter(frame => frame.video_url && frame.status === 'completed')
        .sort((a, b) => (a.metadata?.frame_order || 0) - (b.metadata?.frame_order || 0))
        .map(frame => frame.video_url!)
        .filter(Boolean);

      if (videoUrls.length > 0) {
        console.log('Generating final video with:', videoUrls);

        // Start video generation in background (but keep modal open regardless)
        fetch('/api/jobs/video-stitching', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: currentProjectId,
            video_urls: videoUrls,
            output_name: `final_video_${new Date().toISOString().split('T')[0]}`,
            options: {
              fps: 30,
              quality: 'high'
            }
          })
        })
        .then(response => response.json())
        .then(result => {
          console.log('Video generation started:', result.job_id);
        })
        .catch(error => {
          console.error('Error starting video generation:', error);
        });
      }
    }

    // Modal stays open permanently regardless of success/failure
  };

  const completedVideosCount = videoFrames.filter(f => f.video_url && f.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#0f1b20] text-white">
      {/* Top bar with centered movie title */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1b20]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 relative flex items-center justify-between">
          <div className="text-white/70 font-feather">Script › Characters › <span className="text-white">Scenes</span></div>
          <div className="absolute left-1/2 -translate-x-1/2 font-feather text-[22px]">
            {currentProjectId ? `Project ${currentProjectId.substring(0, 8)}...` : 'Timeline'}
          </div>

          {/* Generate Video Button */}
          <div className="flex items-center gap-3">
            {completedVideosCount > 0 && (
              <div className="text-xs text-white/60">
                {completedVideosCount} videos ready
              </div>
            )}
            <button
              onClick={handleGenerateVideo}
              className="font-feather rounded-[18px] px-4 py-2 text-sm border transition-all border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30"
            >
              🎬 Generate Video ({completedVideosCount})
            </button>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="mx-auto mt-6 max-w-6xl rounded-[28px] border border-white/10 bg-white/5 p-6">

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingClapBoard />
          </div>
        ) : !hasBackendData ? (
          <div className="text-center py-20 text-white/60">
            <div className="text-xl mb-2">No project data found</div>
            <div className="text-sm">Generate scenes and characters first to see timeline data</div>
          </div>
        ) : (
          <div className="space-y-10">
            {scenes.map((scene) => (
              <section key={scene.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-feather text-[20px]">{scene.title}</div>
                  <div className="text-sm text-white/60">{scene.frames.length} frames • {scene.durationSec}s</div>
                </div>
                <div className="h-px w-full bg-white/10 mb-4" />
                <div className="grid grid-cols-2 gap-6">
                  {scene.frames.map((frame, frameIndex) => {
                    const isSelected = selectedFrame === `${scene.id}-${frameIndex}`;
                    const frameId = `${scene.id}-${frameIndex}`;

                    return (
                      <div
                        key={frameIndex}
                        className={`rounded-[22px] border p-4 cursor-pointer transition-all ${
                          isSelected ? "border-[#2aa3ff] bg-white/8" : "border-white/12 bg-white/5 hover:border-white/20"
                        }`}
                        onClick={() => setSelectedFrame(isSelected ? null : frameId)}
                        onDoubleClick={() => {
                          const fullFrame = videoFrames.find(vf =>
                            vf.scene_id === scene.id &&
                            (vf.metadata?.frame_order === frameIndex || frameIndex === 0)
                          );
                          if (fullFrame) {
                            setModalFrame({ frame, fullFrame, scene });
                          }
                        }}
                      >
                        {/* Video/Image Display */}
                        <div className="aspect-video w-full overflow-hidden rounded-[14px] bg-black/40 relative mb-3">
                          {frame.video_url ? (
                            <video
                              src={frame.video_url}
                              className="w-full h-full object-cover"
                              muted
                              controls
                            />
                          ) : frame.image_url && frame.image_url !== '/images/placeholder.jpg' ? (
                            <img
                              src={frame.image_url}
                              alt={frame.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                              {frame.status === 'generating' ? 'Generating...' : 'No preview'}
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="absolute top-2 right-2 text-xs bg-black/70 rounded px-2 py-1">
                            {frame.status === 'completed' ? '✅' : frame.status === 'generating' ? '🎬' : frame.status === 'failed' ? '❌' : '⏳'}
                          </div>
                        </div>

                        <div className="font-feather text-[18px] mb-2">{frame.title}</div>

                        {/* Frame Metadata */}
                        <div className="space-y-2 text-sm">
                          {frame.description && (
                            <div>
                              <div className="text-white/60 font-medium">Summary:</div>
                              <div className="text-white/80 text-xs">{frame.description}</div>
                            </div>
                          )}

                          {/* Display all frame metadata from schemas */}
                          {(() => {
                            // Find the actual frame data that corresponds to this display frame
                            const fullFrame = videoFrames.find(vf =>
                              vf.scene_id === scene.id &&
                              (vf.metadata?.frame_order === frameIndex || frameIndex === 0)
                            );

                            if (!fullFrame?.metadata) return null;

                            const metadata = fullFrame.metadata;

                            return (
                              <div className="space-y-2">
                                {metadata.dialogue && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Dialogue:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2">{metadata.dialogue}</div>
                                  </div>
                                )}

                                {metadata.detailed_plot && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Detailed Plot:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2">{metadata.detailed_plot}</div>
                                  </div>
                                )}

                                {metadata.concise_plot && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Concise Plot:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2">{metadata.concise_plot}</div>
                                  </div>
                                )}

                                {/* Frame-specific metadata from frameGenerationSchema */}
                                {(fullFrame.metadata as any)?.veo3_prompt && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Veo3 Prompt:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2 max-h-20 overflow-y-auto">
                                      {(fullFrame.metadata as any).veo3_prompt}
                                    </div>
                                  </div>
                                )}

                                {(fullFrame.metadata as any)?.summary && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Frame Summary:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2">{(fullFrame.metadata as any).summary}</div>
                                  </div>
                                )}

                                {(fullFrame.metadata as any)?.split_reason && (
                                  <div>
                                    <div className="text-white/60 font-medium text-xs">Split Reason:</div>
                                    <div className="text-white/80 text-xs bg-black/20 rounded p-2">{(fullFrame.metadata as any).split_reason}</div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-white/50">
                                  <span>Duration: {metadata.duration || 8}s</span>
                                  <span>Frame: {(metadata as any).frame_order || frameIndex}</span>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between text-xs text-white/50 mt-3 pt-2 border-t border-white/10">
                            <span>Status: {frame.status || 'pending'}</span>
                            <span>{frame.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Frame Detail Modal */}
      {modalFrame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1b20] border border-white/20 rounded-[28px] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0f1b20] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-feather text-[24px] text-white">
                  {modalFrame.scene.title} • {modalFrame.frame.title}
                </h2>
                <p className="text-white/60 text-sm mt-1">
                  Status: {modalFrame.frame.status || 'pending'} • {modalFrame.frame.progress || 0}%
                </p>
              </div>
              <button
                onClick={() => setModalFrame(null)}
                className="text-white/60 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Video/Image Display */}
              <div className="aspect-video w-full rounded-[14px] bg-black/40 overflow-hidden">
                {modalFrame.fullFrame.video_url ? (
                  <video
                    src={modalFrame.fullFrame.video_url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                  />
                ) : modalFrame.fullFrame.image_url ? (
                  <div className="w-full h-full relative">
                    <img
                      src={modalFrame.fullFrame.image_url}
                      alt={modalFrame.frame.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-black/70 rounded-lg px-4 py-2 text-white text-sm">
                        🎬 Video generating...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏳</div>
                      <div>Generating frame...</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-feather text-[18px] text-white">Frame Details</h3>

                  {modalFrame.frame.description && (
                    <div>
                      <div className="text-white/60 font-medium text-sm mb-2">Summary:</div>
                      <div className="text-white/80 text-sm bg-black/20 rounded-lg p-3">
                        {modalFrame.frame.description}
                      </div>
                    </div>
                  )}

                  {modalFrame.fullFrame.metadata?.dialogue && (
                    <div>
                      <div className="text-white/60 font-medium text-sm mb-2">Dialogue:</div>
                      <div className="text-white/80 text-sm bg-black/20 rounded-lg p-3">
                        {modalFrame.fullFrame.metadata.dialogue}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Duration:</span>
                    <span className="text-white/80">{modalFrame.fullFrame.metadata?.duration || 8}s</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Frame Order:</span>
                    <span className="text-white/80">{modalFrame.fullFrame.metadata?.frame_order || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-feather text-[18px] text-white">Generation Details</h3>

                  {modalFrame.fullFrame.metadata?.detailed_plot && (
                    <div>
                      <div className="text-white/60 font-medium text-sm mb-2">Detailed Plot:</div>
                      <div className="text-white/80 text-sm bg-black/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {modalFrame.fullFrame.metadata.detailed_plot}
                      </div>
                    </div>
                  )}

                  {(modalFrame.fullFrame.metadata as any)?.veo3_prompt && (
                    <div>
                      <div className="text-white/60 font-medium text-sm mb-2">Video Prompt:</div>
                      <div className="text-white/80 text-sm bg-black/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {(modalFrame.fullFrame.metadata as any).veo3_prompt}
                      </div>
                    </div>
                  )}

                  {(modalFrame.fullFrame.metadata as any)?.summary && (
                    <div>
                      <div className="text-white/60 font-medium text-sm mb-2">Frame Summary:</div>
                      <div className="text-white/80 text-sm bg-black/20 rounded-lg p-3">
                        {(modalFrame.fullFrame.metadata as any).summary}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Generation Modal - Video Loading Style */}
      {showStitchingModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          {/* Close Button */}
          <button
            onClick={() => setShowStitchingModal(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-2xl z-10"
          >
            ×
          </button>

          {/* Video Loading Interface */}
          <div className="text-center">
            {/* Loading Spinner */}
            <div className="relative mb-6">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>

            {/* Simple Text */}
            <div className="text-white text-xl font-medium mb-2">
              Generating video...
            </div>
            <div className="text-white/60 text-sm">
              This may take a few minutes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
