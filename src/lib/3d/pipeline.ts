import { createImageTo3DTask, waitForImageTo3DResult } from "@/lib/3d/meshy";
import { getPayloadClient } from "@/lib/payload";

const runningJobs = new Set<string>();
const FURNITURE_READ_RETRY_COUNT = 5;
const FURNITURE_READ_RETRY_DELAY_MS = 400;

type TriggerMethod =
  | "after-create"
  | "after-update-images"
  | "after-change"
  | "manual-api"
  | "manual-log-retrigger";

type QueueArgs = {
  clearExistingModel?: boolean;
  createLogEntry?: boolean;
  force?: boolean;
  furnitureId: string;
  hookLogId?: string;
  source: string;
  triggerMethod?: TriggerMethod;
};

type QueueResult = {
  accepted: boolean;
  hookLogId?: string;
  reason?: string;
};

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toDocId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function toRelationshipId(value: string): string | number {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function extractUploadUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (!("url" in value)) return null;
  return asNonEmptyString(value.url);
}

function getPublicSiteUrl(): string | null {
  const candidates = [
    process.env.MODEL3D_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value.replace(/\/+$/, "");
    }
  }

  return null;
}

function isDataUri(value: string): boolean {
  return value.startsWith("data:image/");
}

function isLikelyPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return true;
  }

  if (host.startsWith("10.") || host.startsWith("192.168.")) {
    return true;
  }

  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

function getInternalFetchBaseUrl(): string {
  return getPublicSiteUrl() ?? "http://localhost:3000";
}

function toAbsoluteImageUrl(input: string): string | null {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  if (input.startsWith("/")) {
    return `${getInternalFetchBaseUrl().replace(/\/+$/, "")}${input}`;
  }

  return null;
}

async function imageUrlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image for Meshy (${response.status}) from ${url}`);
  }

  const contentTypeHeader = response.headers.get("content-type");
  const contentType =
    contentTypeHeader && contentTypeHeader.startsWith("image/")
      ? contentTypeHeader
      : "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

async function toMeshyImageInput(input: string): Promise<string> {
  if (isDataUri(input)) {
    return input;
  }

  const absoluteUrl = toAbsoluteImageUrl(input);
  if (!absoluteUrl) {
    throw new Error(`Unsupported image URL format: ${input}`);
  }

  try {
    const parsed = new URL(absoluteUrl);
    if (!isLikelyPrivateHost(parsed.hostname)) {
      return absoluteUrl;
    }
  } catch {
    throw new Error(`Invalid image URL: ${absoluteUrl}`);
  }

  return imageUrlToDataUri(absoluteUrl);
}

function normalizeImageUrl(input: string): string | null {
  if (isDataUri(input)) {
    return input;
  }

  return toAbsoluteImageUrl(input);
}

function extractImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => extractUploadUrl(image))
    .map((url) => (url ? normalizeImageUrl(url) : null))
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);
}

function buildR2Prefix(furnitureId: string, taskId: string): string {
  const basePrefix = process.env.MODEL3D_R2_PREFIX?.trim() || "media/3d";
  return `${basePrefix.replace(/\/+$/, "")}/${furnitureId}/${taskId}`;
}

function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_BUCKET &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}

async function downloadBinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated model (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function toSafeFileName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "furniture-model";
}

async function setFurnitureStatus(
  furnitureId: string,
  data: {
    model3dError?: string;
    model3dFile?: string | number | null;
    model3dJobId?: string;
    model3dStatus: "queued" | "generating" | "ready" | "failed";
  },
) {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "furniture",
    id: furnitureId,
    data,
  });
}

async function safeSetFurnitureStatus(
  furnitureId: string,
  data: {
    model3dError?: string;
    model3dFile?: string | number | null;
    model3dJobId?: string;
    model3dStatus: "queued" | "generating" | "ready" | "failed";
  },
) {
  try {
    await setFurnitureStatus(furnitureId, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown status update error.";
    console.warn(`[3d-pipeline] failed to update status for ${furnitureId}: ${message}`);
  }
}

async function waitForFurnitureById(furnitureId: string) {
  const payload = await getPayloadClient();

  for (let attempt = 0; attempt < FURNITURE_READ_RETRY_COUNT; attempt += 1) {
    try {
      const furniture = await payload.findByID({
        collection: "furniture",
        id: furnitureId,
        depth: 1,
      });

      if (furniture) {
        return furniture;
      }
    } catch {
      // Ignore transient not-found errors when create transaction has not fully committed.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, FURNITURE_READ_RETRY_DELAY_MS);
    });
  }

  throw new Error(`Furniture ${furnitureId} not found after retries.`);
}

async function createHookLog(args: {
  furnitureId: string;
  source: string;
  triggerMethod: TriggerMethod;
}): Promise<string | undefined> {
  try {
    const payload = await getPayloadClient();
    const log = await payload.create({
      collection: "model-3d-hook-logs",
      data: {
        errorReport: "",
        furniture: toRelationshipId(args.furnitureId),
        status: "queued",
        triggerMethod: args.triggerMethod,
        triggerSource: args.source,
        triggerTime: new Date().toISOString(),
      },
    });

    return toDocId(log.id) ?? undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown hook log creation error.";
    console.warn(`[3d-pipeline] failed to create hook log for ${args.furnitureId}: ${message}`);
    return undefined;
  }
}

async function safeUpdateHookLog(
  hookLogId: string | undefined,
  data: {
    completedAt?: string;
    errorReport?: string;
    meshyTaskId?: string;
    model3dFile?: string | number | null;
    startedAt?: string;
    status?: "queued" | "generating" | "ready" | "failed";
    triggerTime?: string;
  },
) {
  if (!hookLogId) return;

  try {
    const payload = await getPayloadClient();
    await payload.update({
      collection: "model-3d-hook-logs",
      id: hookLogId,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown hook log update error.";
    console.warn(`[3d-pipeline] failed to update hook log ${hookLogId}: ${message}`);
  }
}

async function executeGenerationJob({ furnitureId, force, hookLogId, source }: QueueArgs) {
  const payload = await getPayloadClient();

  try {
    await safeSetFurnitureStatus(furnitureId, {
      model3dStatus: "generating",
      model3dError: "",
    });
    await safeUpdateHookLog(hookLogId, {
      errorReport: "",
      startedAt: new Date().toISOString(),
      status: "generating",
    });

    const furniture = await waitForFurnitureById(furnitureId);

    if (!force && furniture.model3dFile && furniture.model3dStatus === "ready") {
      return;
    }

    const imageUrls = extractImageUrls(furniture.images);
    if (imageUrls.length === 0) {
      throw new Error(
        "At least one valid image URL is required for 3D generation.",
      );
    }

    const meshyImageInputs = await Promise.all(
      imageUrls.map((imageUrl) => toMeshyImageInput(imageUrl)),
    );
    const taskId = await createImageTo3DTask(meshyImageInputs);
    await safeUpdateHookLog(hookLogId, {
      meshyTaskId: taskId,
    });
    const modelUrl = await waitForImageTo3DResult(taskId);
    const binary = await downloadBinary(modelUrl);
    const safeName = toSafeFileName(asNonEmptyString(furniture.name) ?? "furniture");

    const mediaData: Record<string, unknown> = {
      alt: `${furniture.name ?? "Furniture"} generated 3D model`,
    };

    if (isR2Configured()) {
      mediaData.prefix = buildR2Prefix(furnitureId, taskId);
    }

    const mediaDoc = await payload.create({
      collection: "media",
      data: mediaData,
      file: {
        data: binary,
        mimetype: "model/gltf-binary",
        name: `${safeName}-${taskId}.glb`,
        size: binary.byteLength,
      },
    });

    const mediaId = toDocId(mediaDoc.id);
    if (!mediaId) {
      throw new Error("Unable to resolve created media id.");
    }

    const relationshipMediaId = toRelationshipId(mediaId);

    await safeSetFurnitureStatus(furnitureId, {
      model3dStatus: "ready",
      model3dError: "",
      model3dFile: relationshipMediaId,
      model3dJobId: taskId,
    });
    await safeUpdateHookLog(hookLogId, {
      completedAt: new Date().toISOString(),
      errorReport: "",
      meshyTaskId: taskId,
      model3dFile: relationshipMediaId,
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown 3D generation error.";
    await safeSetFurnitureStatus(furnitureId, {
      model3dStatus: "failed",
      model3dError: `[${source}] ${message}`,
    });
    await safeUpdateHookLog(hookLogId, {
      completedAt: new Date().toISOString(),
      errorReport: `[${source}] ${message}`,
      status: "failed",
    });
  } finally {
    runningJobs.delete(furnitureId);
  }
}

export async function queueFurniture3DGeneration(args: QueueArgs): Promise<QueueResult> {
  const furnitureId = args.furnitureId.trim();
  if (!furnitureId) {
    return { accepted: false, reason: "Missing furnitureId." };
  }

  if (runningJobs.has(furnitureId)) {
    return {
      accepted: false,
      reason: "Generation is already running for this furniture item.",
    };
  }

  runningJobs.add(furnitureId);
  const triggerMethod = args.triggerMethod ?? "after-change";
  const hookLogId =
    args.createLogEntry === false
      ? args.hookLogId
      : await createHookLog({
          furnitureId,
          source: args.source,
          triggerMethod,
        });

  setTimeout(() => {
    void safeSetFurnitureStatus(furnitureId, {
      model3dStatus: "queued",
      model3dError: "",
      model3dFile: args.clearExistingModel ? null : undefined,
      model3dJobId: args.clearExistingModel ? "" : undefined,
    })
      .then(() =>
        safeUpdateHookLog(hookLogId, {
          errorReport: "",
          status: "queued",
          triggerTime: new Date().toISOString(),
        }),
      )
      .then(() => executeGenerationJob({ ...args, furnitureId, hookLogId }))
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown queue setup error.";
        console.warn(`[3d-pipeline] queue setup failed for ${furnitureId}: ${message}`);
        runningJobs.delete(furnitureId);
      });
  }, 0);

  return { accepted: true, hookLogId };
}
