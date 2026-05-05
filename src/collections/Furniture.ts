import type { CollectionConfig } from "payload";

import { ROOM_CATEGORY_OPTIONS } from "@/lib/constants";
import { toSlugPart } from "@/lib/slug";

export const Furniture: CollectionConfig = {
  slug: "furniture",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "roomCategory", "furnitureCategory", "price"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "roomCategory",
      type: "select",
      required: true,
      options: ROOM_CATEGORY_OPTIONS.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    },
    {
      name: "furnitureCategory",
      type: "text",
      required: true,
    },
    {
      name: "size",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "images",
      type: "upload",
      relationTo: "media",
      hasMany: true,
      required: true,
      minRows: 1,
      maxRows: 8,
    },
    {
      name: "dimensions",
      type: "group",
      fields: [
        {
          name: "widthCm",
          type: "number",
        },
        {
          name: "depthCm",
          type: "number",
        },
        {
          name: "heightCm",
          type: "number",
        },
      ],
    },
    {
      name: "woodType",
      type: "text",
    },
    {
      name: "details",
      type: "textarea",
      required: true,
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;

        const room = typeof data.roomCategory === "string" ? data.roomCategory : "";
        const furnitureCategory =
          typeof data.furnitureCategory === "string" ? data.furnitureCategory : "";
        const name = typeof data.name === "string" ? data.name : "";
        const size = typeof data.size === "string" ? data.size : "";

        if (room && furnitureCategory && name && size) {
          data.slug = [
            toSlugPart(room),
            toSlugPart(furnitureCategory),
            toSlugPart(name),
            toSlugPart(size),
          ].join("/");
        }

        return data;
      },
    ],
  },
};
