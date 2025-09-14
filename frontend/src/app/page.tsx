"use client";

import { useEffect, useState } from "react";
import Hero3D from "@/components/Hero3D";
import Scene3D from "@/components/Scene3D";
import CameraRig from "@/components/CameraRig";
import { useSceneStore } from "@/store/useSceneStore";
import PagesOverlay from "@/components/pages/PagesOverlay";
import { getCharacters } from "@/data/sceneData";
import ModelSwitcherPanel from "@/components/pages/ModelSwitcherPanel";
import * as THREE from "three";
import { useBackendStore } from "@/store/backendStore";
import { useCreateProject } from "@/hooks/useCreateProject";

export default function Home() {
  const spacing = 3.2;
  const instances = getCharacters(spacing);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Selectors retained only for future use; can be removed if unused
  // const selectedIndex = useSceneStore((s) => s.selectedIndex);
  // const sidebarVisible = useSceneStore((s) => s.sidebarVisible);
  const cameraTarget = useSceneStore((s) => s.cameraTarget);
  const idleCameraPos = useSceneStore((s) => s.idleCameraPos);
  const focusedModelIndex = useSceneStore((s) => s.focusedModelIndex);
  const clearFocus = useSceneStore((s) => s.clearFocus);
  const setCameraTarget = useSceneStore((s) => s.setCameraTarget);
  const completed = useSceneStore((s) => s.completed);
  const selectedPageId = useSceneStore((s) => s.selectedPageId);
  const closePage = useSceneStore((s) => s.closePage);
  const openPage = useSceneStore((s) => s.openPage);
  const focusModel = useSceneStore((s) => s.focusModel);
  const [panelOpen, setPanelOpen] = useState(false);
  // const resetSelectionAndCamera = useSceneStore((s) => s.resetSelectionAndCamera);
  const projectId = useBackendStore((s) => s.projectId);
  const setProjectId = useBackendStore((s) => s.setProjectId);
  const createProject = useCreateProject();

  // Load projectId from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("projectId");
      if (saved && !projectId) setProjectId(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist projectId to localStorage when it changes
  useEffect(() => {
    try {
      if (projectId) localStorage.setItem("projectId", projectId);
    } catch {}
  }, [projectId]);


  // Update camera target to focused model position (original + focusedOffset) in an effect
  // to avoid updating state during render.
  useEffect(() => {
    if (focusedModelIndex !== null) {
      const inst = instances[focusedModelIndex];
      if (inst) {
        const x = inst.position[0];
        const y = inst.position[1];
        const target = new THREE.Vector3(x, y, 0);
        if (!cameraTarget || !cameraTarget.equals(target)) {
          setCameraTarget(target);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedModelIndex, instances]);

  function goNext() {
    const len = instances.length;
    if (!selectedPageId) {
      closePage();
      setCurrentIndex((prev) => (prev + 1) % len);
    } else {
      const current = (focusedModelIndex ?? currentIndex);
      const next = (current + 1) % len;
      focusModel(next);
      openPage(instances[next].pageId);
    }
  }

  function goPrev() {
    const len = instances.length;
    if (!selectedPageId) {
      closePage();
      setCurrentIndex((prev) => (prev - 1 + len) % len);
    } else {
      const current = (focusedModelIndex ?? currentIndex);
      const prev = (current - 1 + len) % len;
      focusModel(prev);
      openPage(instances[prev].pageId);
    }
  }

  const total = instances.length;
  const done = instances.reduce((acc, inst) => acc + (completed[inst.pageId] ? 1 : 0), 0);
  const pct = (done / total) * 100;
  const displayIndex = (focusedModelIndex ?? currentIndex);
  const nextIsComplete = !!completed[instances[displayIndex]?.pageId];
  const backgroundUrl = focusedModelIndex !== null ? (instances as any)[focusedModelIndex]?.background_path : undefined;
  return (
    <div className="min-h-screen w-full">
      {!projectId ? (
        <div className="min-h-screen w-full flex items-center justify-center">
          <button
            onClick={async () => {
              try {
                const title = "My Film Project";
                const summary = "Created from homepage";
                const p = await createProject.mutateAsync({ title, summary });
                setProjectId(p.id);
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error("Create project failed", e);
              }
            }}
            className="px-6 py-3 rounded-lg bg-gray-900 text-white shadow hover:bg-gray-800"
            disabled={createProject.isPending}
          >
            {createProject.isPending ? "Creating…" : "Create Project"}
          </button>
        </div>
      ) : (
        <div className="h-screen w-full relative">
          <Scene3D backgroundUrl={"/background/background1.png"}>
            <CameraRig target={cameraTarget ?? undefined} zOffset={6} idlePosition={idleCameraPos} />
            {focusedModelIndex === null ? (
              <Hero3D
                index={currentIndex}
                position={instances[currentIndex].position}
                pageId={instances[currentIndex].pageId}
                zoomActive={!!selectedPageId}
                glbPath={(instances as any)[currentIndex]?.glb_path}
              />
            ) : (
              // Render only the focused model centered at origin for emphasis
              <group >
                <Hero3D
                  index={focusedModelIndex}
                  position={(() => {
                    const inst = instances[focusedModelIndex];
                    const x = inst.position[0];
                    const y = inst.position[1];
                    return [x, y, 0] as [number, number, number];
                  })()}
                  pageId={instances[focusedModelIndex]?.pageId}
                  zoomActive={!!selectedPageId}
                  glbPath={(instances as any)[focusedModelIndex]?.glb_path}
                />
              </group>
            )}
          </Scene3D>

          {/* Top-left progress bar and navigation */}
          <div style={{ position: "fixed", top: 12, left: 12, zIndex: 50, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 200, height: 10, background: "rgba(255,255,255,0.6)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#10B981" }} />
            </div>
            <span style={{ color: "#111", fontSize: 12 }}>{done}/{total}</span>
            <button onClick={goPrev} className="px-2 py-1 rounded bg-white/90 text-gray-900 shadow hover:bg-white">Prev</button>
            <button onClick={goNext} className={`px-2 py-1 rounded bg-white/90 text-gray-900 shadow hover:bg-white ${nextIsComplete ? "animate-pulse" : ""}`}>Next</button>
          </div>

          {/* Toggle Button - fixed bottom-left */}
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="fixed left-4 bottom-4 z-50 px-4 py-2 rounded-lg bg-white/90 text-gray-900 shadow hover:bg-white"
          >
            {panelOpen ? "Close Panel" : "Open Panel"}
          </button>

          <ModelSwitcherPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            onSelectIndex={(idx) => { closePage(); clearFocus(); setCurrentIndex(idx); }}
            onShowAll={() => clearFocus()}
            buttonLabels={instances.map((_, idx) => `Show Character ${idx + 1}`)}
          />

          {/* Six page sidebars; all mounted, visibility toggled by selectedPageId */}
          <PagesOverlay />
        </div>
      )}
    </div>
  );
}
