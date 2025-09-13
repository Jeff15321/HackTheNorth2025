"use client";

import { create } from "zustand";
import * as THREE from "three";

export type SceneState = {
  selectedIndex: number | null;
  sidebarVisible: boolean;
  cameraTarget: THREE.Vector3 | null;
  idleCameraPos: THREE.Vector3;
  selectedPageId: string | null;
  // actions
  select: (index: number, target: THREE.Vector3) => void;
  showSidebar: () => void;
  hideSidebar: () => void;
  resetSelectionAndCamera: () => void;
  openPage: (pageId: string) => void;
  closePage: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  selectedIndex: null,
  sidebarVisible: false,
  cameraTarget: null,
  idleCameraPos: new THREE.Vector3(0, 0, 8),
  selectedPageId: null,
  select: (index: number, target: THREE.Vector3) =>
    set(() => ({ selectedIndex: index, cameraTarget: target, sidebarVisible: true })),
  showSidebar: () => set(() => ({ sidebarVisible: true })),
  hideSidebar: () => set(() => ({ sidebarVisible: false })),
  resetSelectionAndCamera: () =>
    set(() => ({ selectedIndex: null, cameraTarget: null, sidebarVisible: false, selectedPageId: null })),
  openPage: (pageId: string) => set(() => ({ selectedPageId: pageId })),
  closePage: () => set(() => ({ selectedPageId: null })),
}));


