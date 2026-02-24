import { useEffect } from "react";
import type { Simulation } from "../api/simulation-repository";
import { useSceneStore } from "../stores/scene-store";

export default function useSceneSync(
  idOfFile: string | undefined,
  simulation: Simulation | undefined,
  pendingFile: File | null,
): void {

  const setVoxelSize = useSceneStore((state) => state.setVoxelSize);

  useEffect(() => {
    if (simulation?.config) {
      setVoxelSize(simulation.config.voxelSize);
    }
  }, [simulation, setVoxelSize]);
  useEffect(() => {
    if (idOfFile === "new" && pendingFile) {
      setVoxelSize(2);
    }
  }, [idOfFile, pendingFile, setVoxelSize]);
}
