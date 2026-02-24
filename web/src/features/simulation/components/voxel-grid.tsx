import { useRef, useMemo, useLayoutEffect, useEffect } from "react";
import * as THREE from "three";
import { useSceneStore } from "../stores/scene-store";
export default function VoxelGrid() {
  
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Subscribe to the data this component needs
  const bounds = useSceneStore((state) => state.bounds);
  const voxelSize = useSceneStore((state) => state.config.voxelSize);
  const visible = useSceneStore((state) => state.showGrid);
  const setGridDimensions = useSceneStore((state) => state.setGridDimensions);
  const setWorldDimensions = useSceneStore((state) => state.setWorldDimensions);

  const { count, gridDims } = useMemo(() => {
    if (!bounds) {
      return { count: 0, gridDims: { nx: 0, ny: 0, nz: 0 } };
    }

    const size = new THREE.Vector3();
    bounds.getSize(size);

    const nx = Math.ceil(size.x / voxelSize);
    const ny = Math.ceil(size.y / voxelSize);
    const nz = Math.ceil(size.z / voxelSize);
    const dims = { nx, ny, nz };

    return {
      count: nx * ny * nz,
      gridDims: dims,
    };
  }, [bounds, voxelSize]);

  // Update store with computed dimensions
  useLayoutEffect(() => {
    if (!bounds) {
      setGridDimensions(null);
      setWorldDimensions(null);
      return;
    }

    const size = new THREE.Vector3();
    bounds.getSize(size);

    setWorldDimensions({ x: size.x, y: size.y, z: size.z });
    setGridDimensions(gridDims);
  }, [bounds, gridDims, setGridDimensions, setWorldDimensions]);

  useLayoutEffect(() => {
    if (!meshRef.current || !bounds) return;

    const array = meshRef.current.instanceMatrix.array;
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
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      visible={visible}
    >
      <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
      <meshStandardMaterial
        color="#00ff00"
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
