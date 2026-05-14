"use client";

import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";

export type ShowroomItem = {
  id: string;
  imageUrl: string | null;
  inquireHref: string | null;
  modelUrl: string;
  name: string;
};

type ShowroomCanvasProps = {
  items: ShowroomItem[];
};

function RenderModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useGLTF(modelUrl);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  return <primitive object={scene} />;
}

export function ShowroomCanvas({ items }: ShowroomCanvasProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selectedItem) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">
        No generated 3D furniture is available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
      <aside className="h-[640px] overflow-y-auto rounded-2xl border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Furniture</h2>
        <div className="space-y-3">
          {items.map((item) => {
            const selected = item.id === selectedItem.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <p className="mb-2 font-medium">{item.name}</p>
                <div className="relative h-24 w-full overflow-hidden rounded-lg border bg-zinc-100">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="280px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">No preview</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
          <div>
            <p className="text-sm text-zinc-500">Current selection</p>
            <p className="text-lg font-semibold">{selectedItem.name}</p>
          </div>
          {selectedItem.inquireHref ? (
            <Link
              href={selectedItem.inquireHref}
              className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Inquire
            </Link>
          ) : null}
        </div>

        <div className="h-[580px] overflow-hidden rounded-2xl border bg-white">
          <Canvas camera={{ fov: 45, position: [3.5, 2.5, 3.5] }}>
            <color attach="background" args={["#f4f4f5"]} />
            <ambientLight intensity={0.5} />
            <directionalLight intensity={1.1} position={[5, 8, 5]} />
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
              <planeGeometry args={[12, 12]} />
              <meshStandardMaterial color="#e4e4e7" />
            </mesh>
            <Suspense fallback={null}>
              <Stage intensity={0.65} environment="apartment">
                <RenderModel modelUrl={selectedItem.modelUrl} />
              </Stage>
            </Suspense>
            <OrbitControls makeDefault enablePan enableZoom />
          </Canvas>
        </div>
      </section>
    </div>
  );
}
