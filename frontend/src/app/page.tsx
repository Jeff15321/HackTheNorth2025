"use client";

import Hero3D from "@/components/Hero3D";
import Scene3D from "@/components/Scene3D";
import CameraRig from "@/components/CameraRig";
import { useSceneStore } from "@/store/useSceneStore";
import PagesOverlay from "@/components/pages/PagesOverlay";
import { getCharacters } from "@/data/sceneData";

export default function Home() {
  const spacing = 3.2;
  const instances = getCharacters(spacing);
  // Selectors retained only for future use; can be removed if unused
  // const selectedIndex = useSceneStore((s) => s.selectedIndex);
  // const sidebarVisible = useSceneStore((s) => s.sidebarVisible);
  const cameraTarget = useSceneStore((s) => s.cameraTarget);
  const idleCameraPos = useSceneStore((s) => s.idleCameraPos);
  // const resetSelectionAndCamera = useSceneStore((s) => s.resetSelectionAndCamera);
  return (
    <div className="min-h-screen w-full">
      <div className="h-screen w-full relative">
        <Scene3D>
          <CameraRig target={cameraTarget ?? undefined} zOffset={3.5} idlePosition={idleCameraPos} />
          {instances.map((inst, idx) => (
            <Hero3D
              key={idx}
              index={idx}
              position={inst.position}
              bodyColor={inst.color}
              pageId={inst.pageId}
            />
          ))}
        </Scene3D>

        {/* Six page sidebars; all mounted, visibility toggled by selectedPageId */}
        <PagesOverlay />
      </div>
    </div>
  );
}
