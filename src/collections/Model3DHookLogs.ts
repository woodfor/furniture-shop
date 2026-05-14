import type { CollectionConfig } from "payload";

import { queueFurniture3DGeneration } from "@/lib/3d/pipeline";

function getRelationId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if ("id" in value && (typeof value.id === "string" || typeof value.id === "number")) {
    return String(value.id);
  }

  return null;
}

export const Model3DHookLogs: CollectionConfig = {
  slug: "model-3d-hook-logs",
  admin: {
    useAsTitle: "triggerSource",
    defaultColumns: [
      "furniture",
      "status",
      "triggerMethod",
      "triggerTime",
      "startedAt",
      "completedAt",
    ],
    description:
      "Track 3D generation triggers and outcomes. To re-trigger, check 'retriggerNow' and save.",
  },
  fields: [
    {
      name: "furniture",
      type: "relationship",
      relationTo: "furniture",
      required: true,
    },
    {
      name: "triggerMethod",
      type: "select",
      required: true,
      options: [
        { label: "After Create", value: "after-create" },
        { label: "After Update Images", value: "after-update-images" },
        { label: "After Change", value: "after-change" },
        { label: "Manual API", value: "manual-api" },
        { label: "Manual Log Re-trigger", value: "manual-log-retrigger" },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: "triggerSource",
      type: "text",
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      options: [
        { label: "Queued", value: "queued" },
        { label: "Generating", value: "generating" },
        { label: "Ready", value: "ready" },
        { label: "Failed", value: "failed" },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: "triggerTime",
      type: "date",
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "startedAt",
      type: "date",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "completedAt",
      type: "date",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "meshyTaskId",
      type: "text",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "model3dFile",
      type: "relationship",
      relationTo: "media",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "errorReport",
      type: "textarea",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "retriggerNow",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Check and save to create a new generation run for the related furniture.",
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== "update") {
          return doc;
        }

        const wasRequested = Boolean(previousDoc && "retriggerNow" in previousDoc && previousDoc.retriggerNow);
        const isRequested = Boolean(doc.retriggerNow);

        if (!isRequested || wasRequested) {
          return doc;
        }

        const furnitureId = getRelationId(doc.furniture);
        if (!furnitureId) {
          return doc;
        }

        await queueFurniture3DGeneration({
          clearExistingModel: true,
          force: true,
          furnitureId,
          source: "cms-model-3d-hook-log",
          triggerMethod: "manual-log-retrigger",
        });

        await req.payload.update({
          collection: "model-3d-hook-logs",
          id: doc.id,
          data: {
            retriggerNow: false,
          },
        });

        return doc;
      },
    ],
  },
};
