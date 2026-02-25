import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../stores/scene-store";

export default function SourceMarker() {
  const pos = useSceneStore((s) => s.config.selectedSource);
  const voxelSize = useSceneStore((s) => s.config.voxelSize);
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  // Set position of source circle
  useEffect(() => {
    if (!meshRef.current || !pos) return;
    meshRef.current.position.set(pos.x, pos.y, pos.z);
  }, [pos]);

  // To keep the circle always facing the camera
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  if (!pos) return null;

  const size = Math.max(0.05, voxelSize * 0.2);

  return (
    <mesh ref={meshRef} renderOrder={999}>
      <circleGeometry args={[size, 12]} />
      <meshBasicMaterial
        color={0x2f80ed}
        transparent
        opacity={0.95}
        depthTest={false}
      />
    </mesh>
  );
}
