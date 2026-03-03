import { useRef, useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import { useSceneStore } from "../stores/scene-store";

const MAX_VOXELS = 500_000;

export default function VoxelGrid() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Subscribe to the data this component needs
  const bounds = useSceneStore((state) => state.bounds);
  const storeVoxelSize = useSceneStore((state) => state.config.voxelSize);
  const visible = useSceneStore((state) => state.showGrid);
  const setGridDimensions = useSceneStore((state) => state.setGridDimensions);

  const voxelSize = storeVoxelSize;

  const { count, gridDims } = useMemo(() => {
    if (!bounds) {
      return { count: 0, gridDims: { nx: 0, ny: 0, nz: 0 } };
    }

    const size = new THREE.Vector3();
    bounds.getSize(size);

    const nx = Math.ceil(size.x / voxelSize);
    const ny = Math.ceil(size.y / voxelSize);
    const nz = Math.ceil(size.z / voxelSize);
    const total = nx * ny * nz;
    const dims = { nx, ny, nz };

    // Safety cap: skip rendering if too many voxels
    if (total > MAX_VOXELS) {
      return { count: 0, gridDims: dims };
    }

    return {
      count: total,
      gridDims: dims,
    };
  }, [bounds, voxelSize]);

  // Update grid dimensions when gridDims change
  useLayoutEffect(() => {
    if (!bounds) {
      setGridDimensions(null);
      return;
    }
    setGridDimensions(gridDims);
  }, [bounds, gridDims, setGridDimensions]);

  useLayoutEffect(() => {
    if (!meshRef.current || !bounds) return;

    const array = meshRef.current.instanceMatrix.array as Float32Array;
    const halfSize = voxelSize / 2;
    const scale = 1; // Slight gap between voxels
    const { nx, ny, nz } = gridDims;

    let i = 0;
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const posX = bounds.min.x + x * voxelSize + halfSize;
          const posY = bounds.min.y + y * voxelSize + halfSize;
          const posZ = bounds.min.z + z * voxelSize + halfSize;

          const offset = i * 16;

          // Write matrix directly to GPU buffer (Column-major order)
          array[offset + 0] = scale; // Scale X
          array[offset + 5] = scale; // Scale Y
          array[offset + 10] = scale; // Scale Z
          array[offset + 12] = posX; // Position X
          array[offset + 13] = posY; // Position Y
          array[offset + 14] = posZ; // Position Z
          array[offset + 15] = 1; // Homogeneous coordinates

          i++;
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [bounds, voxelSize, gridDims, count]);

  if (!bounds) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        visible={visible}
      >
        <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
