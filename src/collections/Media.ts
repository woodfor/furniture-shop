import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*", "video/*", "model/gltf-binary", ".glb"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: false,
    },
  ],
};
