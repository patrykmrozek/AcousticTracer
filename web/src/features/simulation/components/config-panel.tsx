import { useSceneStore } from "../stores/scene-store";
import { useMemo, useState, useEffect } from "react";

/** Local-state number input, had to do as conflicts between dragging and typing */
function SourceInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const round3 = (n: number) => parseFloat(n.toFixed(3));
  const [local, setLocal] = useState<string | number>(round3(value));

  useEffect(() => {
    setLocal(round3(value));
  }, [value]);

  return (
    <input
      type="number"
      step="0.1"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={() => setLocal(round3(value))}
      className="p-2 rounded bg-bg-primary text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

interface ConfigPanelProps {
  mode?: "staging" | "completed";
}

export default function ConfigPanel({ mode = "staging" }: ConfigPanelProps) {
  const voxelSize = useSceneStore((state) => state.config.voxelSize);
  const setVoxelSize = useSceneStore((state) => state.setVoxelSize);
  const showGrid = useSceneStore((state) => state.showGrid);
  const setShowGrid = useSceneStore((state) => state.setShowGrid);
  const showTexture = useSceneStore((state) => state.showTexture);
  const setShowTexture = useSceneStore((state) => state.setShowTexture);
  const wireframe = useSceneStore((state) => state.wireframe);
  const setWireframe = useSceneStore((state) => state.setWireframe);

  // extra controls available in scene-store
  const material = useSceneStore((state) => state.config.material);
  const setMaterial = useSceneStore((state) => state.setMaterial);
  const setPendingFile = useSceneStore((state) => state.setPendingFile);
  const selectedSource = useSceneStore((state) => state.config.selectedSource);
  const setSelectedSource = useSceneStore((state) => state.setSelectedSource);
  const bounds = useSceneStore((state) => state.bounds);
  const worldDimensions = useSceneStore((state) => state.worldDimensions);
  const numRays = useSceneStore((state) => state.config.numRays);
  const setNumRays = useSceneStore((state) => state.setNumRays);
  const fps = useSceneStore((state) => state.config.fps);
  const setFps = useSceneStore((state) => state.setFps);

  // Dynamic voxel size range based on world dimensions
  const voxelRange = useMemo(() => {
    if (!worldDimensions) return { min: 0.1, max: 2.0, step: 0.1 };
    const maxDim = Math.max(
      worldDimensions.x,
      worldDimensions.y,
      worldDimensions.z,
    );
    const min = Math.max(0.01, +(maxDim / 100).toFixed(2));
    const max = +(maxDim / 3).toFixed(1);
    const step = +((max - min) / 100).toFixed(4);
    return { min, max, step };
  }, [worldDimensions]);

  // Precompute discrete voxel sizes where the grid dimensions actually change
  const discreteSteps = useMemo(() => {
    if (!worldDimensions) return [];
    const { min, max, step } = voxelRange;
    const steps: number[] = [];
    let prevKey = "";
    for (let v = min; v <= max + step * 0.5; v += step) {
      const s = Math.min(v, max);
      const nx = Math.ceil(worldDimensions.x / s);
      const ny = Math.ceil(worldDimensions.y / s);
      const nz = Math.ceil(worldDimensions.z / s);
      const key = `${nx},${ny},${nz}`;
      if (key !== prevKey) {
        steps.push(+s.toFixed(4));
        prevKey = key;
      }
    }
    return steps;
  }, [worldDimensions, voxelRange]);

  // Find the closest discrete step index for the current voxel size
  const sliderIndex = useMemo(() => {
    if (discreteSteps.length === 0) return 0;
    let closest = 0;
    let minDist = Math.abs(discreteSteps[0] - voxelSize);
    for (let i = 1; i < discreteSteps.length; i++) {
      const dist = Math.abs(discreteSteps[i] - voxelSize);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  }, [discreteSteps, voxelSize]);

  // Estimated voxel count at current slider value
  const estimatedVoxels = useMemo(() => {
    if (!worldDimensions) return 0;
    const nx = Math.ceil(worldDimensions.x / voxelSize);
    const ny = Math.ceil(worldDimensions.y / voxelSize);
    const nz = Math.ceil(worldDimensions.z / voxelSize);
    return nx * ny * nz;
  }, [worldDimensions, voxelSize]);

  const MAX_VOXELS = 500_000;
  const isOverLimit = estimatedVoxels > MAX_VOXELS;

  // When a new model loads (bounds change), reset voxel size to midpoint
  // Skip for saved simulations — their voxel size is restored from Appwrite
  useEffect(() => {
    if (!bounds || mode === "completed" || discreteSteps.length === 0) return;
    const midIndex = Math.floor(discreteSteps.length / 2);
    setVoxelSize(discreteSteps[midIndex]);
  }, [bounds, mode, discreteSteps]);

  // Clamp a value to bounds on a given axis
  const clampToBounds = (value: number, axis: "x" | "y" | "z"): number => {
    if (!bounds) return value;
    return Math.max(bounds.min[axis], Math.min(bounds.max[axis], value));
  };

  return (
    <div className="bg-bg-card p-4 rounded-lg border border-border-primary w-full min-h-0 flex-1 overflow-auto">
      <h3 className="text-text-primary font-bold mb-2">Config Panel</h3>

      {/* Voxel Size — always visible */}
      <div className="mb-4">
        <label className="text-text-secondary text-xs block mb-1">
          Voxel Size: {voxelSize}m
        </label>
        {mode === "staging" && discreteSteps.length > 0 && (
          <>
            <input
              type="range"
              min={0}
              max={discreteSteps.length - 1}
              step={1}
              value={sliderIndex}
              onChange={(e) =>
                setVoxelSize(discreteSteps[parseInt(e.target.value)])
              }
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
              <span>{discreteSteps[0]}m</span>
              <span>{discreteSteps[discreteSteps.length - 1]}m</span>
            </div>
            <div
              className={`text-[10px] mt-1 ${isOverLimit ? "text-danger font-semibold" : "text-text-secondary"}`}
            >
              {estimatedVoxels.toLocaleString()} voxels
              {isOverLimit && " May be slow"}
            </div>
          </>
        )}
      </div>
      {/* Grid Toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Show Voxel Grid</span>
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(e) => setShowGrid(e.target.checked)}
          className="accent-button-primary scale-125"
        />
      </div>

      {/* Texture Toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Show Texture</span>
        <input
          type="checkbox"
          checked={showTexture}
          onChange={(e) => setShowTexture(e.target.checked)}
          className="accent-button-primary scale-125"
        />
      </div>

      {/* Wireframe Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">Wireframe</span>
        <input
          type="checkbox"
          checked={wireframe}
          onChange={(e) => setWireframe(e.target.checked)}
          className="accent-button-primary scale-125"
        />
      </div>

      {/* Material Select — staging only */}
      {mode !== "staging" ? null : (
        <>
          <div className="mb-4">
            <label className="text-text-secondary text-xs block mb-1">
              Material
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full p-2 rounded bg-bg-primary text-text-primary"
            >
              <option>Plastic</option>
              <option>Metal</option>
              <option>Wood</option>
              <option>Glass</option>
            </select>
          </div>

          {/* File upload for pending file */}
          <div className="mb-4">
            <label className="text-text-secondary text-xs block mb-1">
              Replace Model
            </label>
            <input
              type="file"
              accept=".glb"
              onChange={(e) => {
                const file =
                  e.target.files && e.target.files[0]
                    ? e.target.files[0]
                    : null;
                setPendingFile(file);
              }}
              className="w-full"
            />
          </div>

          {/* Selected Source controls */}
          <div className="mb-4">
            <div className="text-text-secondary text-xs block mb-1">
              Source Position
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SourceInput
                value={selectedSource.position.x}
                onChange={(v) =>
                  setSelectedSource(
                    {
                      x: clampToBounds(v, "x"),
                      y: selectedSource.position.y,
                      z: selectedSource.position.z,
                    },
                    selectedSource.direction,
                  )
                }
              />
              <SourceInput
                value={selectedSource.position.y}
                onChange={(v) =>
                  setSelectedSource(
                    {
                      x: selectedSource.position.x,
                      y: clampToBounds(v, "y"),
                      z: selectedSource.position.z,
                    },
                    selectedSource.direction,
                  )
                }
              />
              <SourceInput
                value={selectedSource.position.z}
                onChange={(v) =>
                  setSelectedSource(
                    {
                      x: selectedSource.position.x,
                      y: selectedSource.position.y,
                      z: clampToBounds(v, "z"),
                    },
                    selectedSource.direction,
                  )
                }
              />
            </div>
          </div>

          {/* Source Direction (read-only) */}
          <div className="mb-4">
            <div className="text-text-secondary text-xs block mb-1">
              Source Direction
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                readOnly
                value={selectedSource.direction.x.toFixed(2)}
                className="w-full p-2 rounded bg-bg-primary text-text-primary text-center cursor-default"
              />
              <input
                type="text"
                readOnly
                value={selectedSource.direction.y.toFixed(2)}
                className="w-full p-2 rounded bg-bg-primary text-text-primary text-center cursor-default"
              />
              <input
                type="text"
                readOnly
                value={selectedSource.direction.z.toFixed(2)}
                className="w-full p-2 rounded bg-bg-primary text-text-primary text-center cursor-default"
              />
            </div>
          </div>

          {/* Number of Rays */}
          <div className="mb-2">
            <label className="text-text-secondary text-xs block mb-1">
              Number of Rays
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              step="10"
              value={numRays}
              onChange={(e) =>
                setNumRays(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full p-2 rounded bg-bg-primary text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* FPS */}
          <div className="mb-4">
            <label className="text-text-secondary text-xs block mb-1">
              FPS: {fps}
            </label>
            <input
              type="range"
              min="1"
              max="120"
              step="1"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* Grid Stats Info */}
      <GridStats />
    </div>
  );
}

function GridStats() {
  const gridDimensions = useSceneStore((state) => state.gridDimensions);
  const worldDimensions = useSceneStore((state) => state.worldDimensions);
  if (!gridDimensions || !worldDimensions) return null;

  const { nx, ny, nz } = gridDimensions;
  const { x, y, z } = worldDimensions;

  return (
    <div className="p-3 bg-black/20 rounded border border-white/5 text-xs font-mono text-text-secondary">
      <div className="text-text-primary font-semibold">World Dimensions:</div>
      <div>
        {x.toLocaleString()} x {y.toLocaleString()} x {z.toLocaleString()}
      </div>
      <div className="text-text-primary font-semibold">Grid Dimensions:</div>
      <div>
        {nx} x {ny} x {nz}
      </div>
    </div>
  );
}
