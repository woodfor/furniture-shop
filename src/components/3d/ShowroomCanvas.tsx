"use client";

import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, MOUSE, Plane, Vector3 } from "three";
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
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone();
    const box = new Box3().setFromObject(cloned);
    const desiredMinY = 0;

    // Only lift model when its base is below the floor level.
    if (Number.isFinite(box.min.y) && box.min.y < desiredMinY) {
      cloned.position.y += desiredMinY - box.min.y;
    }

    return cloned;
  }, [gltf.scene]);
  return <primitive object={scene} />;
}

export function ShowroomCanvas({ items }: ShowroomCanvasProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(items[0] ? [items[0].id] : []);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, [number, number, number]>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragOffsetRef = useRef<[number, number, number]>([0, 0, 0]);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), -DRAG_PLANE_Y), []);
  const dragPoint = useMemo(() => new Vector3(), []);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );
  const activeItem =
    items.find((item) => item.id === activeId && selectedIds.includes(item.id)) ?? selectedItems[0];
  const selectedPosition: [number, number, number] = activeItem
    ? (positions[activeItem.id] ?? DEFAULT_POSITION)
    : DEFAULT_POSITION;
  const selectedRotation = activeItem ? (rotations[activeItem.id] ?? 0) : 0;

  useEffect(() => {
    if (selectedIds.length === 0) {
      setActiveId("");
      return;
    }

    if (!selectedIds.includes(activeId)) {
      setActiveId(selectedIds[0]);
    }
  }, [activeId, selectedIds]);

  const updatePositionForItem = (itemId: string, position: [number, number, number]) => {
    setPositions((prev) => ({
      ...prev,
      [itemId]: position,
    }));
  };

  const updateSelectedPosition = (position: [number, number, number]) => {
    if (!activeItem) return;
    updatePositionForItem(activeItem.id, position);
  };

  const updateSelectedRotation = (rotationY: number) => {
    if (!activeItem) return;
    setRotations((prev) => ({
      ...prev,
      [activeItem.id]: rotationY,
    }));
  };

  const moveFromPointerRay = (event: ThreeEvent<PointerEvent>, itemId: string) => {
    const hit = event.ray.intersectPlane(dragPlane, dragPoint);
    if (!hit) return;

    const nextX = Math.min(DRAG_LIMIT, Math.max(-DRAG_LIMIT, hit.x + dragOffsetRef.current[0]));
    const nextZ = Math.min(DRAG_LIMIT, Math.max(-DRAG_LIMIT, hit.z + dragOffsetRef.current[2]));
    updatePositionForItem(itemId, [nextX, 0, nextZ]);
  };

  const finishDrag = () => {
    setIsDragging(false);
    setDragItemId(null);
  };

  const onDragStart = (event: ThreeEvent<PointerEvent>, itemId: string) => {
    event.stopPropagation();
    setIsDragging(true);
    setDragItemId(itemId);
    setActiveId(itemId);

    const currentPosition = positions[itemId] ?? DEFAULT_POSITION;

    const hit = event.ray.intersectPlane(dragPlane, dragPoint);
    if (hit) {
      dragOffsetRef.current = [currentPosition[0] - hit.x, 0, currentPosition[2] - hit.z];
    }

    const target = event.target as PointerCaptureTarget | null;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
  };

  const onDragMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragItemId) return;
    event.stopPropagation();
    moveFromPointerRay(event, dragItemId);
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === canvasContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = async () => {
    if (!canvasContainerRef.current) return;
    try {
      await canvasContainerRef.current.requestFullscreen();
    } catch {
      // Ignore user-agent rejection and keep normal layout.
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if browser blocks exit request.
    }
  };

  if (items.length === 0) {
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
            const selected = selectedIds.includes(item.id);
            const active = activeItem?.id === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (selected) {
                    setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                  } else {
                    setSelectedIds((prev) => [...prev, item.id]);
                    setActiveId(item.id);
                  }
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium">{item.name}</p>
                  {active ? <span className="text-xs text-zinc-500">Active</span> : null}
                </div>
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
            <p className="text-lg font-semibold">{activeItem?.name ?? "No active furniture selected"}</p>
            <p className="mt-1 text-xs text-zinc-500">Displayed items: {selectedItems.length}</p>
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
              disabled={!activeItem}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Reset position
            </button>
            <button
              type="button"
              onClick={() => updateSelectedRotation(selectedRotation - ROTATION_STEP_RAD)}
              disabled={!activeItem}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Rotate left
            </button>
            <button
              type="button"
              onClick={() => updateSelectedRotation(selectedRotation + ROTATION_STEP_RAD)}
              disabled={!activeItem}
              className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Rotate right
            </button>
            {activeItem?.inquireHref ? (
              <Link
                href={activeItem.inquireHref}
                className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Inquire
              </Link>
            ) : null}
          </div>
        </div>

        <div
          ref={canvasContainerRef}
          className={`relative min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white ${
            isFullscreen ? "rounded-none border-0" : ""
          }`}
        >
          <button
            type="button"
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className="absolute right-4 top-4 z-20 inline-flex rounded-md bg-black/70 px-3 py-2 text-sm text-white hover:bg-black/80"
          >
            {isFullscreen ? "Close fullscreen" : "Fullscreen"}
          </button>
          <Canvas key={isFullscreen ? "showroom-fullscreen" : "showroom-default"} camera={{ fov: 45, position: [3.5, 2.5, 3.5] }}>
            <color attach="background" args={["#f4f4f5"]} />
            <ambientLight intensity={0.5} />
            <directionalLight intensity={1.1} position={[5, 8, 5]} />
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
              <planeGeometry args={[12, 12]} />
              <meshStandardMaterial color="#e4e4e7" />
            </mesh>
            <Suspense fallback={null}>
              <Environment preset="apartment" />
              {selectedItems.map((item) => {
                const position = positions[item.id] ?? DEFAULT_POSITION;
                const rotationY = rotations[item.id] ?? 0;

                return (
                  <group
                    key={item.id}
                    position={position}
                    rotation={[0, rotationY, 0]}
                    onPointerDown={(event) => onDragStart(event, item.id)}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                    onPointerMissed={onDragEnd}
                  >
                    <RenderModel modelUrl={item.modelUrl} />
                  </group>
                );
              })}
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
