"use client";

import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { MOUSE, Plane, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";

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

const DRAG_PLANE_Y = 0;
const DRAG_LIMIT = 4.8;
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const ROTATION_STEP_RAD = Math.PI / 12;

type PointerCaptureTarget = EventTarget & {
  releasePointerCapture?: (pointerId: number) => void;
  setPointerCapture?: (pointerId: number) => void;
};

function RenderModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useGLTF(modelUrl);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  return <primitive object={scene} />;
}

export function ShowroomCanvas({ items }: ShowroomCanvasProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [positions, setPositions] = useState<Record<string, [number, number, number]>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const dragOffsetRef = useRef<[number, number, number]>([0, 0, 0]);
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), -DRAG_PLANE_Y), []);
  const dragPoint = useMemo(() => new Vector3(), []);
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedPosition: [number, number, number] = selectedItem
    ? (positions[selectedItem.id] ?? DEFAULT_POSITION)
    : DEFAULT_POSITION;
  const selectedRotation = selectedItem ? (rotations[selectedItem.id] ?? 0) : 0;

  const updateSelectedPosition = (position: [number, number, number]) => {
    if (!selectedItem) return;
    setPositions((prev) => ({
      ...prev,
      [selectedItem.id]: position,
    }));
  };

  const updateSelectedRotation = (rotationY: number) => {
    if (!selectedItem) return;
    setRotations((prev) => ({
      ...prev,
      [selectedItem.id]: rotationY,
    }));
  };

  const moveFromPointerRay = (event: ThreeEvent<PointerEvent>) => {
    const hit = event.ray.intersectPlane(dragPlane, dragPoint);
    if (!hit) return;

    const nextX = Math.min(DRAG_LIMIT, Math.max(-DRAG_LIMIT, hit.x + dragOffsetRef.current[0]));
    const nextZ = Math.min(DRAG_LIMIT, Math.max(-DRAG_LIMIT, hit.z + dragOffsetRef.current[2]));
    updateSelectedPosition([nextX, 0, nextZ]);
  };

  const finishDrag = () => {
    setIsDragging(false);
  };

  const onDragStart = (event: ThreeEvent<PointerEvent>) => {
    if (!selectedItem) return;
    event.stopPropagation();
    setIsDragging(true);

    const hit = event.ray.intersectPlane(dragPlane, dragPoint);
    if (hit) {
      dragOffsetRef.current = [selectedPosition[0] - hit.x, 0, selectedPosition[2] - hit.z];
    }

    const target = event.target as PointerCaptureTarget | null;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
  };

  const onDragMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    event.stopPropagation();
    moveFromPointerRay(event);
  };

  const onDragEnd = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    event.stopPropagation();
    finishDrag();
    const target = event.target as PointerCaptureTarget | null;
    if (target?.releasePointerCapture) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleWindowPointerUp = () => {
      finishDrag();
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isDragging]);

  if (!selectedItem) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">
        No generated 3D furniture is available yet.
      </div>
    );
  }

  return (
    <div className="grid h-[640px] grid-cols-[320px_1fr] gap-6">
      <aside className="h-full overflow-y-auto rounded-2xl border bg-white p-4">
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

      <section className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
          <div>
            <p className="text-sm text-zinc-500">Current selection</p>
            <p className="text-lg font-semibold">{selectedItem.name}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Position X/Z: {selectedPosition[0].toFixed(2)} / {selectedPosition[2].toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Rotation Y: {((selectedRotation * 180) / Math.PI).toFixed(0)}°
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSelectedPosition(DEFAULT_POSITION)}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Reset position
            </button>
            <button
              type="button"
              onClick={() => updateSelectedRotation(selectedRotation - ROTATION_STEP_RAD)}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Rotate left
            </button>
            <button
              type="button"
              onClick={() => updateSelectedRotation(selectedRotation + ROTATION_STEP_RAD)}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Rotate right
            </button>
            {selectedItem.inquireHref ? (
              <Link
                href={selectedItem.inquireHref}
                className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Inquire
              </Link>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white">
          <Canvas camera={{ fov: 45, position: [3.5, 2.5, 3.5] }}>
            <color attach="background" args={["#f4f4f5"]} />
            <ambientLight intensity={0.5} />
            <directionalLight intensity={1.1} position={[5, 8, 5]} />
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
              <planeGeometry args={[12, 12]} />
              <meshStandardMaterial color="#e4e4e7" />
            </mesh>
            <Suspense fallback={null}>
              <Stage adjustCamera={false} intensity={0.65} environment="apartment">
                <group
                  position={selectedPosition}
                  rotation={[0, selectedRotation, 0]}
                  onPointerDown={onDragStart}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  onPointerMissed={onDragEnd}
                >
                  <RenderModel modelUrl={selectedItem.modelUrl} />
                </group>
              </Stage>
            </Suspense>
            <OrbitControls
              makeDefault
              enabled={!isDragging}
              enablePan
              enableZoom
              mouseButtons={
                {
                  LEFT: undefined,
                  MIDDLE: MOUSE.ROTATE,
                  RIGHT: MOUSE.PAN,
                } as never
              }
            />
          </Canvas>
        </div>
      </section>
    </div>
  );
}
