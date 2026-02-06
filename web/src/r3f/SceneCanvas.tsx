import { Canvas } from "@react-three/fiber";
import { Stage, OrbitControls, Gltf } from "@react-three/drei";
import { Suspense } from "react";

interface SceneCanvasProps {
  modelUrl: string | null;
}

function Model({ url }: { url: string }) {
  return <Gltf src={url} castShadow receiveShadow />;
}

export default function SceneCanvas({ modelUrl }: SceneCanvasProps) {
  if (!modelUrl) return null;

  return (
    <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5} adjustCamera={true} shadows>
          <Model url={modelUrl} />
        </Stage>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
}
