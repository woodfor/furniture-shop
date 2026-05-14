"use client";

import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

type ModelViewerProps = {
  modelUrl: string;
};

function LoadedModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useGLTF(modelUrl);
  return <primitive object={gltf.scene} />;
}

export function ModelViewer({ modelUrl }: ModelViewerProps) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border bg-white">
      <Canvas camera={{ fov: 45, position: [2.8, 2.2, 2.8] }}>
        <color attach="background" args={["#f8fafc"]} />
        <ambientLight intensity={0.45} />
        <directionalLight intensity={1.2} position={[5, 8, 5]} />
        <Suspense fallback={null}>
          <Stage intensity={0.6} environment="city">
            <LoadedModel modelUrl={modelUrl} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault enablePan enableZoom />
      </Canvas>
    </div>
  );
}
