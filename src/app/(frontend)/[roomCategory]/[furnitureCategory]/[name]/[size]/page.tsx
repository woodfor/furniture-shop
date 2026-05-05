import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    furnitureCategory: string;
    name: string;
    roomCategory: string;
    size: string;
  }>;
};

export default async function FurnitureDetailPage({ params }: PageProps) {
  const { furnitureCategory, name, roomCategory, size } = await params;
  const slug = `${roomCategory}/${furnitureCategory}/${name}/${size}`;

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "furniture",
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

  const item = result.docs[0];

  if (!item) {
    notFound();
  }

  const similar = await payload.find({
    collection: "furniture",
    where: {
      and: [
        {
          furnitureCategory: {
            equals: item.furnitureCategory,
          },
        },
        {
          id: {
            not_equals: item.id,
          },
        },
      ],
    },
    limit: 4,
  });

  const firstImage = Array.isArray(item.images) ? item.images[0] : null;
  const imageURL =
    firstImage && typeof firstImage === "object" && "url" in firstImage
      ? String(firstImage.url)
      : "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl space-y-10 px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border bg-white">
            <Image src={imageURL} alt={item.name} fill className="object-cover" />
          </div>
          <div className="space-y-4 rounded-2xl border bg-white p-6">
            <h1 className="text-3xl font-semibold">{item.name}</h1>
            <p className="text-xl font-medium text-zinc-900">${item.price}</p>
            <p>
              <span className="font-medium">Size:</span> {item.size}
            </p>
            <p>
              <span className="font-medium">Dimensions:</span> {item.dimensions?.widthCm ?? "-"}W x{" "}
              {item.dimensions?.depthCm ?? "-"}D x {item.dimensions?.heightCm ?? "-"}H cm
            </p>
            <p>
              <span className="font-medium">Wood type:</span> {item.woodType || "-"}
            </p>
            <p className="leading-7 text-zinc-700">{item.details}</p>
            <Link
              href="/contact-us"
              className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
            >
              Inquire this furniture
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Similar type</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {similar.docs.map((similarItem) => (
              <Link
                key={similarItem.id}
                href={`/${similarItem.slug}`}
                className="rounded-lg border bg-white p-4 shadow-sm hover:shadow"
              >
                <p className="font-medium">{similarItem.name}</p>
                <p className="text-sm text-zinc-600">${similarItem.price}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
