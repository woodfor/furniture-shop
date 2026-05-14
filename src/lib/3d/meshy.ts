type MeshyTaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";

type StartTaskResponse = {
  id?: string;
  result?: string;
  task_id?: string;
};

type PollTaskResponse = {
  id?: string;
  status?: string;
  state?: string;
  model_url?: string;
  glb_url?: string;
  model_urls?: {
    glb?: string;
  };
  output?: {
    model_url?: string;
    glb?: string;
  };
  error?: string;
  message?: string;
};

const DEFAULT_MESHY_BASE_URL = "https://api.meshy.ai/openapi/v1";
const DEFAULT_MESHY_POLL_INTERVAL_MS = 6000;
const DEFAULT_MESHY_MAX_POLL_ATTEMPTS = 50;

function getMeshyApiKey() {
  return process.env.MESHY_API_KEY;
}

function getMeshyBaseUrl() {
  const configured = process.env.MESHY_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured.replace(/\/+$/, "") : DEFAULT_MESHY_BASE_URL;
}

function getImageTo3dPath() {
  return process.env.MESHY_IMAGE_TO_3D_PATH?.trim() || "/image-to-3d";
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toStatus(value: unknown): MeshyTaskStatus | null {
  const status = asString(value)?.toUpperCase();
  if (!status) return null;
  if (status === "PENDING" || status === "IN_PROGRESS" || status === "SUCCEEDED" || status === "FAILED") {
    return status;
  }
  return null;
}

async function requestMeshy<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = getMeshyApiKey();
  if (!apiKey) {
    throw new Error("Missing MESHY_API_KEY.");
  }

  const response = await fetch(`${getMeshyBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meshy request failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  return (await response.json()) as T;
}

function extractTaskId(response: StartTaskResponse): string {
  const id = asString(response.id) ?? asString(response.result) ?? asString(response.task_id);
  if (!id) {
    throw new Error("Meshy response did not include a task id.");
  }
  return id;
}

function extractModelUrl(response: PollTaskResponse): string | null {
  return (
    asString(response.model_url) ??
    asString(response.glb_url) ??
    asString(response.model_urls?.glb) ??
    asString(response.output?.model_url) ??
    asString(response.output?.glb)
  );
}

export async function createImageTo3DTask(imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 0) {
    throw new Error("No image URLs were provided for Meshy generation.");
  }

  const response = await requestMeshy<StartTaskResponse>(getImageTo3dPath(), {
    method: "POST",
    body: JSON.stringify({
      image_url: imageUrls[0],
      target_formats: ["glb"],
      should_texture: true,
    }),
  });

  return extractTaskId(response);
}

export async function waitForImageTo3DResult(taskId: string): Promise<string> {
  const pollIntervalMs = Number(process.env.MESHY_POLL_INTERVAL_MS ?? DEFAULT_MESHY_POLL_INTERVAL_MS);
  const maxPollAttempts = Number(
    process.env.MESHY_MAX_POLL_ATTEMPTS ?? DEFAULT_MESHY_MAX_POLL_ATTEMPTS,
  );
  const path = `${getImageTo3dPath().replace(/\/+$/, "")}/${taskId}`;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const response = await requestMeshy<PollTaskResponse>(path, {
      method: "GET",
    });

    const status = toStatus(response.status) ?? toStatus(response.state);
    if (status === "SUCCEEDED") {
      const modelUrl = extractModelUrl(response);
      if (!modelUrl) {
        throw new Error("Meshy task succeeded but no model URL was returned.");
      }
      return modelUrl;
    }

    if (status === "FAILED") {
      const message = asString(response.error) ?? asString(response.message) ?? "Unknown Meshy error.";
      throw new Error(message);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }

  throw new Error(`Meshy task timed out after ${maxPollAttempts} polling attempts.`);
}
