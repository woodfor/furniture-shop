import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ROOM_CATEGORY_LABEL_MAP } from "@/lib/constants";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    roomCategory: string;
  }>;
};

export default async function RoomCategoryPage({ params }: PageProps) {
  const { roomCategory } = await params;
  const roomLabel = ROOM_CATEGORY_LABEL_MAP[roomCategory];

  if (!roomLabel) {
    notFound();
  }

  const payload = await getPayloadClient();
  const items = await payload.find({
    collection: "furniture",
    where: {
      roomCategory: {
        equals: roomCategory,
      },
    },
    limit: 24,
    sort: "-createdAt",
  });

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
        <h1 className="text-3xl font-semibold">{roomLabel}</h1>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.docs.map((item) => {
            const firstImage = Array.isArray(item.images) ? item.images[0] : null;
            const imageURL =
              firstImage && typeof firstImage === "object" && "url" in firstImage
                ? String(firstImage.url)
                : "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

            return (
              <Link
                key={item.id}
                href={`/${item.slug}`}
                className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-56 w-full">
                  <Image
                    src={imageURL}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-lg font-medium">{item.name}</p>
                  <p className="text-zinc-700">${item.price}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
