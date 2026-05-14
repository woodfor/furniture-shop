import { NextResponse } from "next/server";
import { z } from "zod";

import { queueFurniture3DGeneration } from "@/lib/3d/pipeline";

const requestSchema = z.object({
  furnitureId: z.string().min(1),
  force: z.boolean().optional(),
});

function getSecretFromRequest(request: Request): string | null {
  const value = request.headers.get("x-3d-secret");
  return value && value.trim().length > 0 ? value : null;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.MODEL3D_INTERNAL_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { message: "Missing MODEL3D_INTERNAL_SECRET environment variable." },
      { status: 500 },
    );
  }

  const providedSecret = getSecretFromRequest(request);
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
    }

    const result = await queueFurniture3DGeneration({
      furnitureId: parsed.data.furnitureId,
      force: parsed.data.force,
      source: "api-3d-generate",
      triggerMethod: "manual-api",
    });

    if (!result.accepted) {
      return NextResponse.json({ message: result.reason ?? "Request was not accepted." }, { status: 409 });
    }

    return NextResponse.json({ message: "queued" }, { status: 202 });
  } catch {
    return NextResponse.json({ message: "Failed to queue 3D generation job." }, { status: 500 });
  }
}
