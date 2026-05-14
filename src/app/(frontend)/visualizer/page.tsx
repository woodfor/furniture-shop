import { ShowroomCanvas } from "@/components/3d/ShowroomCanvas";
import { SiteHeader } from "@/components/site-header";
import { getPayloadClient } from "@/lib/payload";

function getDocId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (!("id" in value)) return null;
  if (typeof value.id === "string" || typeof value.id === "number") {
    return String(value.id);
  }
  return null;
}

function getUploadUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (!("url" in value)) return null;
  return typeof value.url === "string" && value.url.length > 0 ? value.url : null;
}

function getFirstUploadUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const url = getUploadUrl(entry);
    if (url) return url;
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function VisualizerPage() {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "furniture",
    where: {
      and: [
        {
          model3dStatus: {
            equals: "ready",
          },
        },
        {
          model3dFile: {
            exists: true,
          },
        },
      ],
    },
    depth: 1,
    limit: 24,
    sort: "-updatedAt",
  });

  const items = result.docs
    .map((item) => {
      const modelUrl = getUploadUrl(item.model3dFile);
      const id = getDocId(item);

      if (!modelUrl || !id) {
        return null;
      }

      return {
        id,
        imageUrl: getFirstUploadUrl(item.images),
        inquireHref: typeof item.slug === "string" ? `/${item.slug}` : null,
        modelUrl,
        name: typeof item.name === "string" && item.name.length > 0 ? item.name : "Untitled furniture",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">3D Room Visualizer</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Explore generated furniture models in a single room scene. Select an item to preview and orbit.
          </p>
        </div>
        <ShowroomCanvas items={items} />
      </main>
    </>
  );
}
