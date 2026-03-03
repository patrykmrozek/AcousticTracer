import { useEffect } from "react";
import type { Simulation } from "../api/simulation-repository";
import { simulationRepo } from "../api/simulation-repository";
import { useSceneStore } from "../stores/scene-store";

export default function useSceneSync(
  idOfFile: string | undefined,
  simulation: Simulation | undefined,
  _pendingFile: File | null,
): void {
  void _pendingFile;

  const setVoxelSize = useSceneStore((state) => state.setVoxelSize);
  const setPendingFile = useSceneStore((state) => state.setPendingFile);
  const setRayResponse = useSceneStore((state) => state.setRayResponse);
  const rayResponse = useSceneStore((state) => state.rayResponse);

  // Clear pendingFile when navigating to an existing (saved) simulation
  useEffect(() => {
    if (idOfFile && idOfFile !== "new") {
      setPendingFile(null);
    }
  }, [idOfFile, setPendingFile]);

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
