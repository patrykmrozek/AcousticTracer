import type { Simulation } from "../api/simulation-repository";
import { useEffect, useState, useMemo } from "react";
import { simulationRepo } from "../api/simulation-repository";

export default function useModelUrl(
  idOfFile: string | undefined,
  simulation: Simulation | undefined,
  pendingFile: File | null,
): string | undefined
{
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (idOfFile !== "new" || !pendingFile) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [idOfFile, pendingFile]);

  const modelUrl = useMemo(() => {
    if (idOfFile === "new") return blobUrl ?? undefined;
    if (simulation?.inputFileId) {
      return simulationRepo.getFileUrl(simulation.inputFileId);
    }
  }, [idOfFile, blobUrl, simulation?.inputFileId]);
  return modelUrl
}
