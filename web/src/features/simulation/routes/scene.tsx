import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  useCreateSimulation,
  useSimulationDetail,
  useUploadSimulationFile,
  runRaytracer,
} from "@/api/simulations";
import SceneCanvas from "../components/scene-viewer";
import SimDetails from "../components/sim-details";
import ConfigPanel from "../components/config-panel";
import * as THREE from "three";
import { useSceneStore } from "../stores/scene-store";
import { useMemo, useEffect } from "react";
import { useUser } from "@/features/auth/context/user-store";
import { simulationRepo } from "@/api/simulations";

export default function Scene() {
  const { idOfFile } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { current } = useUser();
  const uploadMutation = useUploadSimulationFile();
  const createMutation = useCreateSimulation();

  const { data: simulation, isLoading, error } = useSimulationDetail(idOfFile);

  // Use store for state
  const setVoxelSize = useSceneStore((state) => state.setVoxelSize);
  const setBounds = useSceneStore((state) => state.setBounds);
  const pendingFile = useSceneStore((state) => state.pendingFile);

  // Sync loaded simulation config to store
  useEffect(() => {
    if (simulation?.config) {
      setVoxelSize(simulation.config.voxelSize);
    }
  }, [simulation, setVoxelSize]);

  console.log("Pending file: ", pendingFile);

  const simDetails = useMemo(() => {
    if (idOfFile === "new") {
      return {
        name: searchParams.get("name") || "New Simulation",
        status: "staging" as const,
        inputFileId: null,
      };
    }
    return simulation;
  }, [idOfFile, searchParams, simulation]);

  console.log("IdOfFile: ", idOfFile);
  const modelUrl = useMemo(() => {
    if (idOfFile === "new" && pendingFile) {
      setVoxelSize(0.5);
      return URL.createObjectURL(pendingFile);
    }
    if (simulation?.inputFileId) {
      return simulationRepo.getFileUrl(simulation.inputFileId);
    }
  }, [idOfFile, pendingFile, simulation]);

  console.log("Model URL: ", modelUrl);

  // Use store for bounds and config
  const bounds = useSceneStore((state) => state.bounds);
  const config = useSceneStore((state) => state.config);

  const handleStartSimulation = async () => {
    if (!bounds || !current?.$id) return;
    try {
      let fileId = simDetails?.inputFileId;

      if (!fileId && pendingFile) {
        const uploadedFile = await uploadMutation.mutateAsync(pendingFile);
        fileId = uploadedFile.$id;
      }
      if (!fileId) throw new Error("No file ID available");

      const size = new THREE.Vector3();
      bounds.getSize(size);

      await createMutation.mutateAsync({
        userId: current.$id,
        name: simDetails?.name || "Untitled",
        fileName: "test",
        fileId,
        config,
        dimensions: { x: size.x, y: size.y, z: size.z },
      });
      console.log(await runRaytracer(config));
      navigate("/dashboard");
    } catch (err: any) {
      alert(`Failed to start simulation: ${err.message}`);
      console.error("Sim start failed: ", err);
    }
  };

  const isSubmitting = uploadMutation.isPending || createMutation.isPending;
  console.log("Sim details", simDetails?.status);
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <header className="flex-none flex items-center p-4 gap-4 bg-bg-primary border-b border-white/5 relative z-20">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent font-medium"
          onClick={() => navigate("/dashboard")}
        >
          <span>←</span> Back
        </button>
        <h1 className="text-xl font-bold text-text-primary m-0">
          {simDetails?.name || "Scene Viewer"}
          {simDetails?.status === "staging" && (
            <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
              Draft
            </span>
          )}
        </h1>

        <div className="ml-auto flex items-center gap-4">
          {/* Staging Actions */}
          {simDetails?.status === "staging" && (
            <button
              onClick={handleStartSimulation}
              disabled={isLoading || isSubmitting || !bounds}
              className="px-4 py-2 bg-button-primary text-white text-sm font-semibold rounded hover:bg-button-hover disabled:opacity-50 disabled:cursor-wait"
            >
              {isSubmitting ? "Starting..." : "Run Simulation"}
            </button>
          )}
          <SimDetails simDetails={simDetails} />
        </div>
      </header>
      <main className="flex-1 p-4 w-5/6 h-full min-h-0 relative">
        <div className="w-full h-full bg-bg-card rounded-xl shadow-md overflow-hidden relative flex items-center justify-center border border-border-primary">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-card/80 backdrop-blur">
              <div className="text-text-primary px-4 py-2 rounded shadow-lg border border-border-primary font-medium bg-bg-card">
                Initializing Scene...
              </div>
            </div>
          )}
          {isSubmitting && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-wait">
              <div className="text-text-primary px-4 py-2 rounded shadow-lg border border-border-primary font-medium bg-bg-card">
                Building Simulation...
              </div>
            </div>
          )}
          {error && (
            <div className="text-danger bg-red-500/10 px-4 py-2 rounded font-medium">
              {error.message}
            </div>
          )}
          {!isLoading && !error && modelUrl && (
            <div className="w-full h-full relative">
              <div className="absolute top-4 left-4 w-50 z-10">
                <ConfigPanel isEditable={simDetails?.status === "staging"} />
              </div>
              <SceneCanvas modelUrl={modelUrl} />
              <div></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
