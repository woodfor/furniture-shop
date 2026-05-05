import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getPayloadClient, getSiteSettings } from "@/lib/payload";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const payload = await getPayloadClient();
  const settings = await getSiteSettings();

  const furnitureResult = await payload.find({
    collection: "furniture",
    limit: 12,
    sort: "-createdAt",
  });

  const heroVideoURL =
    typeof settings?.heroVideoURL === "string" && settings.heroVideoURL.length > 0
      ? settings.heroVideoURL
      : "https://cdn.pixabay.com/video/2021/09/09/88185-605677686_large.mp4";

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl space-y-14 px-6 py-8">
        <section className="overflow-hidden rounded-2xl border bg-black">
          <video
            className="h-[50vh] w-full object-cover opacity-85"
            src={heroVideoURL}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
          />
        </section>

        <section className="rounded-2xl border bg-white px-8 py-10 text-center">
          <p className="text-3xl font-semibold tracking-tight text-zinc-900">
            Low price, customisable, all included services
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Featured Furniture</h2>
            <Link href="/contact-us" className="text-sm text-zinc-600 hover:text-zinc-900">
              Need custom design?
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {furnitureResult.docs.map((item) => {
              const firstImage = Array.isArray(item.images) ? item.images[0] : null;
              const imageURL =
                firstImage && typeof firstImage === "object" && "url" in firstImage
                  ? String(firstImage.url)
                  : "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

              return (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative h-56 w-full">
                    <Image
                      src={imageURL}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium text-zinc-900">${item.price}</p>
                  </CardContent>
                  <CardFooter className="gap-3">
                    <Link
                      href={`/${item.slug}`}
                      className="rounded-md border px-4 py-2 text-sm hover:bg-zinc-100"
                    >
                      View details
                    </Link>
                    <Link
                      href="/contact-us"
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      Inquire
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
