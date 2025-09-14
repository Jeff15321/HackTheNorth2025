"use client";

import { useEffect, useState } from "react";
import Hero3D from "@/components/Hero3D";
import Scene3D from "@/components/Scene3D";
import CameraRig from "@/components/CameraRig";
import { useSceneStore } from "@/store/useSceneStore";
import PagesOverlay from "@/components/pages/PagesOverlay";
import { getCharacters } from "@/data/sceneData";
import ModelSwitcherPanel from "@/components/pages/ModelSwitcherPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings, CheckCircle } from "lucide-react";
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
  const glbOverrides = useSceneStore((s) => s.glbOverrides);
  // const resetSelectionAndCamera = useSceneStore((s) => s.resetSelectionAndCamera);
  const projectId = useBackendStore((s) => s.projectId);
  const setProjectId = useBackendStore((s) => s.setProjectId);
  const createProject = useCreateProject();

  // Load projectId from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("projectId");
      if (saved && !projectId) setProjectId(saved);
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist projectId to localStorage when it changes
  useEffect(() => {
    try {
      if (projectId) localStorage.setItem("projectId", projectId);
    } catch { }
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
                glbPath={glbOverrides[currentIndex] ?? (instances as any)[currentIndex]?.glb_path}
                xRotationLock={(instances as any)[currentIndex]?.xRotationLock}
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
                  glbPath={glbOverrides[focusedModelIndex] ?? (instances as any)[focusedModelIndex]?.glb_path}
                  xRotationLock={(instances as any)[focusedModelIndex]?.xRotationLock}
                />
              </group>
            )}
          </Scene3D>

        {/* Bottom center progress bar and navigation - Duolingo style */}
        {!selectedPageId && (
          <div
            className="font-game fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
                       flex items-center gap-4
                       rounded-2xl px-6 py-3 shadow-2xl"
            style={{
              backgroundColor: 'var(--game-cream)',
              border: '2px solid var(--game-light-gray)',
              minWidth: '400px'
            }}
          >
            {/* Progress section */}
            <div className="flex items-center gap-3">
              <Badge 
                variant="secondary" 
                className="font-game border-0 px-3 py-1 text-sm"
                style={{ backgroundColor: 'var(--game-orange)', color: 'var(--game-soft-white)' }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {done}/{total}
              </Badge>
              <Progress 
                value={pct} 
                className="w-24 h-2"
              />
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={goPrev}
                variant="outline"
                size="sm"
                className="font-game rounded-xl px-3 py-2 text-sm"
                style={{ 
                  backgroundColor: 'var(--game-soft-white)', 
                  color: 'var(--game-charcoal)', 
                  border: '2px solid var(--game-light-gray)' 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--game-orange)';
                  e.currentTarget.style.color = 'var(--game-soft-white)';
                  e.currentTarget.style.borderColor = 'var(--game-orange)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--game-soft-white)';
                  e.currentTarget.style.color = 'var(--game-charcoal)';
                  e.currentTarget.style.borderColor = 'var(--game-light-gray)';
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                onClick={goNext}
                variant={nextIsComplete ? "default" : "outline"}
                size="sm"
                className="font-game border-2 rounded-xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: nextIsComplete ? 'var(--game-orange)' : 'var(--game-soft-white)',
                  color: nextIsComplete ? 'var(--game-soft-white)' : 'var(--game-charcoal)',
                  borderColor: nextIsComplete ? 'var(--game-orange)' : 'var(--game-light-gray)',
                  animation: nextIsComplete ? 'pulse 2s infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!nextIsComplete) {
                    e.currentTarget.style.backgroundColor = 'var(--game-orange)';
                    e.currentTarget.style.color = 'var(--game-soft-white)';
                    e.currentTarget.style.borderColor = 'var(--game-orange)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!nextIsComplete) {
                    e.currentTarget.style.backgroundColor = 'var(--game-soft-white)';
                    e.currentTarget.style.color = 'var(--game-charcoal)';
                    e.currentTarget.style.borderColor = 'var(--game-light-gray)';
                  }
                }}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Settings Panel Toggle - fixed bottom-left */}
        <Button
          onClick={() => setPanelOpen((v) => !v)}
          variant="outline"
          className="font-game fixed left-6 bottom-6 z-50 rounded-2xl px-6 py-3 shadow-2xl transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--game-cream)', 
            color: 'var(--game-charcoal)', 
            border: '2px solid var(--game-light-gray)' 
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          {panelOpen ? "Close Settings" : "Open Settings"}
        </Button>
        

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
