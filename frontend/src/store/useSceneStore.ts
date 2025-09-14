"use client";

import { create } from "zustand";
import * as THREE from "three";

export type SceneState = {
  selectedIndex: number | null;
  sidebarVisible: boolean;
  cameraTarget: THREE.Vector3 | null;
  idleCameraPos: THREE.Vector3;
  selectedPageId: string | null;
  focusedModelIndex: number | null;
  completed: Record<string, boolean>;
  glbOverrides: Record<number, string>;
  // actions
  select: (index: number, target: THREE.Vector3) => void;
  showSidebar: () => void;
  hideSidebar: () => void;
  resetSelectionAndCamera: () => void;
  openPage: (pageId: string) => void;
  closePage: () => void;
  focusModel: (index: number) => void;
  clearFocus: () => void;
  setCameraTarget: (target: THREE.Vector3 | null) => void;
  setCompleted: (pageId: string, value: boolean) => void;
  setGlbForIndex: (index: number, glbPath: string) => void;
  setGlbForFocused: (glbPath: string) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  selectedIndex: null,
  sidebarVisible: false,
  cameraTarget: null,
  idleCameraPos: new THREE.Vector3(0, 0, 8),
  selectedPageId: null,
  focusedModelIndex: null,
  completed: {},
  glbOverrides: {},
  select: (index: number, target: THREE.Vector3) =>
    set(() => ({ selectedIndex: index, cameraTarget: target, sidebarVisible: true })),
  showSidebar: () => set(() => ({ sidebarVisible: true })),
  hideSidebar: () => set(() => ({ sidebarVisible: false })),
  resetSelectionAndCamera: () =>
    set(() => ({ selectedIndex: null, cameraTarget: null, sidebarVisible: false, selectedPageId: null, focusedModelIndex: null })),
  openPage: (pageId: string) => set(() => ({ selectedPageId: pageId })),
  closePage: () => set(() => ({ selectedPageId: null })),
  focusModel: (index: number) =>
    set(() => ({ focusedModelIndex: index, sidebarVisible: false, selectedPageId: null })),
  clearFocus: () => set(() => ({ focusedModelIndex: null, cameraTarget: null })),
  setCameraTarget: (target: THREE.Vector3 | null) => set(() => ({ cameraTarget: target })),
  setCompleted: (pageId: string, value: boolean) =>
    set((state) => ({ completed: { ...state.completed, [pageId]: value } })),
  setGlbForIndex: (index: number, glbPath: string) =>
    set((state) => ({ glbOverrides: { ...state.glbOverrides, [index]: glbPath } })),
  setGlbForFocused: (glbPath: string) =>
    set((state) => {
      if (state.focusedModelIndex === null) return {} as Partial<SceneState>;
      return { glbOverrides: { ...state.glbOverrides, [state.focusedModelIndex]: glbPath } };
    }),
}));


