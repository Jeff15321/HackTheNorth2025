import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Utilities ----------

async function apiJson<T>(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- Types ----------

type NodeKind = "film" | "logline" | "character" | "object" | "scene";

interface OverviewNode {
  id: string;
  kind: NodeKind;
  parentId: string | null;
  orderIndex: number;
  title?: string | null;
  isStale: boolean;
  version: number;
}

interface OverviewResponse {
  project: { id: string; title: string };
  nodes: OverviewNode[];
  artifacts: {
    id: string;
    nodeId: string | null;
    kind: string; // e.g., "frame_image", "video"
    storageUrl: string;
  }[];
  stats?: any;
}

interface NodeDetailResponse {
  node: {
    id: string;
    kind: NodeKind;
    title?: string | null;
    isStale: boolean;
    version: number;
  };
  children: OverviewNode[];
  artifacts: {
    id: string;
    kind: string;
    mimeType: string;
    storageUrl: string;
    width?: number | null;
    height?: number | null;
    duration_sec?: number | null;
  }[];
  latestGenerations: { id: string; type: string; status: string }[];
}

// ---------- Component ----------

export default function FilmTimeline({ projectId, apiBase = "" }: { projectId: string; apiBase?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiJson<OverviewResponse>(`${apiBase}/projects/${projectId}/overview`);
        if (!alive) return;
        setOverview(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load overview");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, apiBase]);

  // Scenes sorted by order_index
  const scenes = useMemo(() => {
    const nodes = overview?.nodes ?? [];
    return nodes.filter(n => n.kind === "scene").sort((a, b) => a.orderIndex - b.orderIndex);
  }, [overview]);

  // Map node id -> latest frame image url from overview.artifacts if present
  const frameFromOverview = useMemo(() => {
    const map = new Map<string, string>();
    overview?.artifacts?.forEach(a => {
      if (a.kind === "frame_image" && a.nodeId) {
        // We keep the last seen; backend should return latest first ideally
        map.set(a.nodeId, a.storageUrl);
      }
    });
    return map;
  }, [overview]);

  // Auto sizing
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [vw, setVw] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [vh, setVh] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 720);
  
  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cardHeight = Math.max(360, Math.floor(vh * 0.7));
  const baseCardWidth = Math.max(340, Math.min(640, Math.floor(vw / Math.min(scenes.length || 1, 4))));

  if (loading) return <div className="w-full h-[60vh] flex items-center justify-center text-gray-500">Loading…</div>;
  if (error) return <div className="w-full h-[60vh] flex items-center justify-center text-red-500">{error}</div>;
  if (!overview) return null;

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <header className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{overview.project.title}</h1>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {scenes.length} scenes
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
              {scenes.filter(s => !s.isStale).length} ready
            </span>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div
          ref={containerRef}
          className="relative w-full overflow-x-auto"
          style={{ height: cardHeight + 80 }}
        >
          <div
            className="relative flex items-center gap-6"
            style={{ minWidth: Math.max(vw, scenes.length * (baseCardWidth + 24)) }}
          >
            {scenes.map((scene, idx) => (
              <motion.button
                key={scene.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSceneId(scene.id)}
                className={cx(
                  "flex-shrink-0 rounded-xl shadow-lg bg-white overflow-hidden",
                  scene.isStale && "ring-2 ring-amber-400"
                )}
                style={{ width: baseCardWidth, height: cardHeight }}
              >
                <div className="relative w-full h-[80%] bg-gray-100 overflow-hidden">
                  <SceneFrameImage
                    apiBase={apiBase}
                    projectId={projectId}
                    sceneId={scene.id}
                    fallbackUrl={frameFromOverview.get(scene.id)}
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    #{scene.orderIndex}
                  </div>
                  {scene.isStale && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs rounded">
                      stale
                    </div>
                  )}
                </div>
                <div className="h-[20%] p-3 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-sm font-medium">{scene.title || `Scene ${idx + 1}`}</div>
                    <div className="text-xs text-gray-500">Click for storyboard</div>
                  </div>
                  <div className="text-xs text-gray-400">{idx + 1}/{scenes.length}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedSceneId && (
          <StoryboardModal
            key={selectedSceneId}
            apiBase={apiBase}
            projectId={projectId}
            sceneId={selectedSceneId}
            onClose={() => setSelectedSceneId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Scene Frame (thumbnail) loader ----------

function SceneFrameImage({ apiBase, projectId, sceneId, fallbackUrl }: { apiBase: string; projectId: string; sceneId: string; fallbackUrl?: string }) {
  const [url, setUrl] = useState<string | undefined>(fallbackUrl);

  useEffect(() => {
    if (!fallbackUrl) {
      (async () => {
        try {
          const d = await apiJson<NodeDetailResponse>(`${apiBase}/nodes/${sceneId}`);
          const frame = d.artifacts.find((a: { kind: string; }) => a.kind === "frame_image");
          if (frame) setUrl(frame.storageUrl);
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [apiBase, sceneId, fallbackUrl]);

  if (url) {
    return <img src={url} alt="Scene frame" className="absolute inset-0 w-full h-full object-cover" />;
  }
  return <div className="absolute inset-0 flex items-center justify-center text-gray-400">No frame</div>;
}

// ---------- Storyboard Modal ----------

function StoryboardModal({ apiBase, projectId, sceneId, onClose }: { apiBase: string; projectId: string; sceneId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [node, setNode] = useState<NodeDetailResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const d = await apiJson<NodeDetailResponse>(`${apiBase}/nodes/${sceneId}`);
        setNode(d);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, sceneId]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{node?.node.title || `Scene ${sceneId.slice(-4)}`}</h2>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Close</button>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center h-32">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {node?.artifacts?.map((a, i) => (
                <div key={a.id} className="rounded-lg border overflow-hidden">
                  <div className="aspect-video bg-gray-100">
                    <img src={a.storageUrl} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 text-sm text-gray-600">
                    {a.kind.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

