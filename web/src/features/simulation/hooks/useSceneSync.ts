import { useEffect } from "react";
import type { Simulation } from "../api/simulation-repository";
import { simulationRepo } from "../api/simulation-repository";
import { useSceneStore } from "../stores/scene-store";

export default function useSceneSync(
  _idOfFile: string | undefined,
  simulation: Simulation | undefined,
  _pendingFile: File | null,
): void {
  void _idOfFile;
  void _pendingFile;

  const setVoxelSize = useSceneStore((state) => state.setVoxelSize);
  const setRayResponse = useSceneStore((state) => state.setRayResponse);
  const rayResponse = useSceneStore((state) => state.rayResponse);

  // When loading a saved simulation, restore its voxel size
  useEffect(() => {
    if (simulation?.config) {
      setVoxelSize(simulation.config.voxelSize);
    }
  }, [simulation, setVoxelSize]);

  // When loading a completed simulation, fetch its stored ray response
  useEffect(() => {
    if (
      simulation?.status === "completed" &&
      simulation.resultFileId &&
      !rayResponse
    ) {
      const url = simulationRepo.getFileUrl(simulation.resultFileId);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch ray response");
          return res.json();
        })
        .then((data) => setRayResponse(data))
        .catch((err) =>
          console.error("Could not load stored ray response:", err),
        );
    }
  }, [simulation, rayResponse, setRayResponse]);
}
