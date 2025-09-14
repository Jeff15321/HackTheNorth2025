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
  const backgroundUrl = (instances as any)[displayIndex]?.background_path;
  return (
    <div className="min-h-screen w-full">
      <div className="h-screen w-full relative">
        <Scene3D backgroundUrl={backgroundUrl}>
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


        {/* Map toggle button - fixed bottom-left */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="fixed left-4 top-4 z-50 w-20 h-20 flex items-center justify-center rounded-xl bg-white/90 text-gray-900 shadow hover:bg-white"
          aria-label={panelOpen ? "Close map" : "Open map"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7" />
            <path d="M9 4v13" />
            <path d="M15 7v13" />
          </svg>
        </button>

        <ModelSwitcherPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSelectIndex={(idx) => { closePage(); clearFocus(); setCurrentIndex(idx); }}
          buttonLabels={instances.map((_, idx) => `${idx + 1}`)}
          pinPositions={
            [
            { top: 0.6, left: 0.30, label: "Script Writer" },
            { top: 0.35, left: 0.50, label: "Character Creator" },
            { top: 0.60, left: 0.68,label: "Director" },
          ]}
          pinColors={["#499163FF", "#CD903BFF", "#A78BFA"]}        />

        {/* Six page sidebars; all mounted, visibility toggled by selectedPageId */}
        <PagesOverlay />
      </div>
    </div>
  );
}
