import { useState } from "react";
import { useNavigate } from "react-router";
import {
  useCreateSimulation,
  useUpdateSimulation,
  useUploadSimulationFile,
  runRaytracer,
  simulationRepo,
} from "@/api/simulations";
import { useSceneStore } from "../stores/scene-store";
import { useUser } from "@/features/auth/context/user-store";
import type { SimDetails } from "../api/simulation-repository";
import { useErrorBoundary } from "react-error-boundary";

export interface SceneActionsResult {
  handleStartSimulation: () => Promise<void>;
  isSubmitting: boolean;
  startError: string | null;
  clearStartError: () => void;
}

export default function useSceneActions(
  simDetails: SimDetails | undefined,
): SceneActionsResult {
  const navigate = useNavigate();
  const { current } = useUser();
  const uploadMutation = useUploadSimulationFile();
  const createMutation = useCreateSimulation();
  const updateMutation = useUpdateSimulation();
  const { showBoundary } = useErrorBoundary();
  const [startError, setStartError] = useState<string | null>(null);

  const handleStartSimulation = async () => {
    const { bounds, config, pendingFile } = useSceneStore.getState();

    if (!bounds || !current?.$id) return;

    setStartError(null);

    let fileId = simDetails?.inputFileId;
    let simulationId: string | undefined;
    try {
      if (!fileId && pendingFile) {
        const uploadedFile = await uploadMutation.mutateAsync(pendingFile);
        fileId = uploadedFile.$id;
      }
      if (!fileId) throw new Error("No file ID available");

      const createdSimulation = await createMutation.mutateAsync({
        userId: current.$id,
        name: simDetails?.name || "Untitled",
        fileName: pendingFile?.name || "test",
        fileId,
        config,
      });
      simulationId = createdSimulation.$id;
    } catch (err: unknown) {
      showBoundary(err);
      return;
    }

    try {
      console.log(config);
      navigate("/dashboard");
      const raytracerResponse = await runRaytracer(config);
      useSceneStore.getState().setRayResponse(raytracerResponse);
      console.log(raytracerResponse)

      // Persist ray response as a JSON file in Appwrite Storage
      let resultFileId: string | undefined;
      if (simulationId) {
        try {
          const blob = new Blob([JSON.stringify(raytracerResponse)], {
            type: "application/json",
          });
          const resultFile = new File(
            [blob],
            `result-${simulationId}.json`,
            { type: "application/json" },
          );
          const uploaded = await simulationRepo.uploadFile(resultFile);
          resultFileId = uploaded.$id;
        } catch {
          console.warn("Failed to upload result file, status will still update");
        }
      }

      // Update simulation status to completed after successful ray response
      if (simulationId) {
        await updateMutation.mutateAsync({
          id: simulationId,
          updates: { status: "completed", resultFileId },
        });
      }
    } catch (err: unknown) {
      // Update simulation status to failed on error
      if (simulationId) {
        try {
          await updateMutation.mutateAsync({
            id: simulationId,
            updates: { status: "failed" },
          });
        } catch {
          // Swallow status-update errors to surface the original failure
        }
      }
      const message =
        err instanceof Error ? err.message : "Raytracer failed. Please retry.";
      setStartError(message);
    }
  };

  const isSubmitting = uploadMutation.isPending || createMutation.isPending;

  return {
    handleStartSimulation,
    isSubmitting,
    startError,
    clearStartError: () => setStartError(null),
  };
}
