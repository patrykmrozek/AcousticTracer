import { create } from "zustand";
import * as THREE from "three";

interface SceneState {
  config: {
    fileName: string;
    voxelSize: number;
    numRays: number;
    fps: number;
    material: string;
  };
  bounds: THREE.Box3 | null;
  showGrid: boolean;
  pendingFile: File | null;

  setVoxelSize: (size: number) => void;
  setBounds: (box: THREE.Box3) => void;
  setShowGrid: (visible: boolean) => void;
  setPendingFile: (file: File | null) => void;
  setMaterial: (value: string) => void;
}

export const useSceneStore = create<SceneState>()((set, get) => ({
  config: {
    fileName: "",
    voxelSize: 2,
    numRays: 10000,
    fps: 60,
    material: "Plastic",
  },
  bounds: null,
  showGrid: true,
  pendingFile: null,

  // the actions functions to call when updating state
  setVoxelSize: (size) =>
    set((state) => ({
      config: { ...state.config, voxelSize: size },
    })),
  setBounds: (box) => set({ bounds: box }),
  setShowGrid: (visible) => set({ showGrid: visible }),
  setPendingFile: (file) =>
    set((state) => ({
      pendingFile: file,
      config: {
        ...state.config,
        fileName: file ? file.name : state.config.fileName,
      },
    })),
  setMaterial: (value) =>
    set((state) => ({
      config: {
        ...state.config,
        material: value,
      },
    })),
}));
