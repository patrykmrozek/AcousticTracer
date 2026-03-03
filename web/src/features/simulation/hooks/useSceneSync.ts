import { useEffect } from "react";
import type { Simulation } from "../api/simulation-repository";
import { useSceneStore } from "../stores/scene-store";

/**
 * Syncs a loaded simulation's config into the Zustand scene store and
 * resets ephemeral state (ray response, frame index) when the route
 * changes.
 *
 * Ray-response fetching has been moved to `useRayResponse` (TanStack
 * Query) so the data is cached in-memory and revisits are instant.
 */
export default function useSceneSync(
  idOfFile: string | undefined,
  simulation: Simulation | undefined,
  _pendingFile?: File | null,
): void {
  const bounds = useSceneStore((state) => state.bounds);

  // When the simulation ID changes, reset scene state so stale data from
  // a previously viewed simulation doesn't persist.
  useEffect(() => {
    if (idOfFile && idOfFile !== "new") {
      useSceneStore.getState().setPendingFile(null);
    }

    // Clear the previous ray response and frame index.
    useSceneStore.setState({ rayResponse: null, frameIndex: 0 });
  }, [idOfFile]);

  // Sync the saved config into the store once the model's bounds are known.
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
}
