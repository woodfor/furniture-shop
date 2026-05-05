import configPromise from "@payload-config";
import { cache } from "react";
import { getPayload } from "payload";

export const getPayloadClient = cache(async () => getPayload({ config: configPromise }));

export const getSiteSettings = cache(async () => {
  const payload = await getPayloadClient();

  try {
    return await payload.findGlobal({
      slug: "site-settings",
    });
  } catch {
    return null;
  }
});
