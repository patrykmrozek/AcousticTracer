import { useEffect } from "react";
import type { Simulation } from "../api/simulation-repository";
import { simulationRepo } from "../api/simulation-repository";
import { useSceneStore } from "../stores/scene-store";

export default function useSceneSync(
  idOfFile: string | undefined,
  simulation: Simulation | undefined,
): void {

  const bounds = useSceneStore((state) => state.bounds);
  const setRayResponse = useSceneStore((state) => state.setRayResponse);
  const rayResponse = useSceneStore((state) => state.rayResponse);

  // When navigating to an existing simulation, clear the pendingFile
  // so the model URL resolves from the saved Appwrite file instead.
  useEffect(() => {
    if (idOfFile && idOfFile !== "new") {
      useSceneStore.getState().setPendingFile(null);
    }
  }, [idOfFile]);

  useEffect(() => {
    if (!bounds || !simulation?.config) return;
    if (idOfFile === "new") return;

    useSceneStore.setState({
      config: {
        fileName: simulation.fileName,
        voxelSize: simulation.config.voxelSize,
        numRays: simulation.config.numRays,
        fps: simulation.config.fps,
        material: simulation.config.material,
        selectedSource: simulation.config.selectedSource,
      },
    });
  }, [bounds, idOfFile, simulation]);

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
