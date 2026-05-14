import type { CollectionConfig } from "payload";

import { queueFurniture3DGeneration } from "@/lib/3d/pipeline";
import { ROOM_CATEGORY_OPTIONS } from "@/lib/constants";
import { toSlugPart } from "@/lib/slug";

function toComparableImageRef(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if ("id" in value && (typeof value.id === "string" || typeof value.id === "number")) {
    return String(value.id);
  }

  if ("url" in value && typeof value.url === "string") {
    return value.url;
  }

  return null;
}

function imageSignature(images: unknown): string {
  if (!Array.isArray(images)) return "";
  return images
    .map((image) => toComparableImageRef(image))
    .filter((item): item is string => Boolean(item))
    .join("|");
}

function canStart3DGeneration(doc: Record<string, unknown>, previousDoc?: Record<string, unknown>) {
  const status = typeof doc.model3dStatus === "string" ? doc.model3dStatus : "idle";
  if (status === "queued" || status === "generating") {
    return false;
  }

  const currentSignature = imageSignature(doc.images);
  if (!currentSignature) {
    return false;
  }

  if (!previousDoc) {
    return true;
  }

  const previousSignature = imageSignature(previousDoc.images);
  if (currentSignature !== previousSignature) {
    return true;
  }

  const has3DFile = Boolean(doc.model3dFile);
  const previouslyHad3DFile = Boolean(previousDoc.model3dFile);

  if (!has3DFile && !previouslyHad3DFile) {
    return status === "idle" || status === "failed";
  }

  return false;
}

function didImagesChange(doc: Record<string, unknown>, previousDoc?: Record<string, unknown>) {
  if (!previousDoc) return false;
  return imageSignature(doc.images) !== imageSignature(previousDoc.images);
}

function resolveDocId(doc: Record<string, unknown>): string | null {
  if (typeof doc.id === "string") return doc.id;
  if (typeof doc.id === "number") return String(doc.id);
  return null;
}

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
      name: "model3dFile",
      type: "upload",
      relationTo: "media",
      required: false,
      admin: {
        description: "Generated GLB model file.",
      },
    },
    {
      name: "model3dStatus",
      type: "select",
      required: true,
      defaultValue: "idle",
      options: [
        {
          label: "Idle",
          value: "idle",
        },
        {
          label: "Queued",
          value: "queued",
        },
        {
          label: "Generating",
          value: "generating",
        },
        {
          label: "Ready",
          value: "ready",
        },
        {
          label: "Failed",
          value: "failed",
        },
      ],
    },
    {
      name: "model3dJobId",
      type: "text",
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "model3dError",
      type: "textarea",
      required: false,
      admin: {
        readOnly: true,
      },
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
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (!doc || typeof doc !== "object") {
          return doc;
        }

        const currentDoc = doc as Record<string, unknown>;
        const previousRecord =
          previousDoc && typeof previousDoc === "object"
            ? (previousDoc as Record<string, unknown>)
            : undefined;

        const imagesChangedOnUpdate =
          operation === "update" && didImagesChange(currentDoc, previousRecord);

        // Only re-trigger on updates when images changed.
        if (operation === "update" && !imagesChangedOnUpdate) {
          return doc;
        }

        if (operation !== "update" && !canStart3DGeneration(currentDoc, previousRecord)) {
          return doc;
        }

        const furnitureId = resolveDocId(currentDoc);
        if (!furnitureId) {
          return doc;
        }

        void queueFurniture3DGeneration({
          clearExistingModel: imagesChangedOnUpdate,
          force: imagesChangedOnUpdate,
          furnitureId,
          source: imagesChangedOnUpdate ? "payload-afterUpdate-images" : "payload-afterChange",
          triggerMethod: imagesChangedOnUpdate
            ? "after-update-images"
            : operation === "create"
              ? "after-create"
              : "after-change",
        }).catch((error) => {
          const message = error instanceof Error ? error.message : "Unknown queue error";
          req.payload.logger.error(`[3d-pipeline] queue trigger failed for furniture ${furnitureId}: ${message}`);
        });

        return doc;
      },
    ],
  },
};
