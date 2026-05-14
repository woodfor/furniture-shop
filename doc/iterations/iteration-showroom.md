# Iteration Progress - Showroom

## Scope

Deliver an MVP for AI-generated 3D furniture assets and an interactive showroom experience, integrated with Payload CMS and Next.js frontend.

## Completed

- 3D pipeline data model added to `furniture` collection:
  - `model3dFile`
  - `model3dStatus` (`idle | queued | generating | ready | failed`)
  - `model3dJobId`
  - `model3dError`
- Auto-trigger logic implemented in `furniture` hook:
  - create can trigger generation
  - update triggers generation when `images` change
  - image-change update can clear old model reference before regeneration
- Meshy integration implemented:
  - create Image-to-3D task
  - poll task result
  - download generated GLB
  - upload GLB back into Payload `media`
  - write model relation back to `furniture`
- Meshy request compatibility fixes implemented:
  - switch endpoint convention to OpenAPI v1 behavior
  - support `image_url` payload format
  - fallback to data URI when source image URL is not publicly reachable
- R2 key-prefix strategy implemented:
  - media base prefix configurable via `R2_MEDIA_PREFIX`
  - 3D asset prefix configurable via `MODEL3D_R2_PREFIX`
- Internal trigger API added:
  - `POST /api/3d/generate` with `x-3d-secret` authorization
- CMS monitoring page added via collection:
  - `model-3d-hook-logs`
  - records trigger source/method, status, timestamps, Meshy task id, error report
  - supports manual re-trigger using `retriggerNow`
- Frontend 3D experience added:
  - furniture detail page includes 3D preview section
  - `/visualizer` page added as interactive showroom
  - selectable furniture list from CMS records with ready 3D model
- Showroom interactions implemented:
  - drag-to-move furniture on floor plane
  - per-item position memory
  - rotate left/right controls (15° step)
  - per-item rotation memory
  - reset position action
  - camera controls remapped to avoid conflict with left-drag moving
  - auto camera reframe disabled during object movement
- Showroom layout adjustments completed:
  - left fixed sidebar for furniture options
  - right panel for controls + canvas
  - sidebar and canvas panel heights aligned

## Validation Status

- `npm run build`: pass after each major change
- Lint checks for changed files: pass

## Environment Variables Introduced

- `MODEL3D_INTERNAL_SECRET`
- `MODEL3D_R2_PREFIX`
- `MODEL3D_PUBLIC_BASE_URL`
- `MESHY_API_KEY`
- `MESHY_BASE_URL`
- `MESHY_IMAGE_TO_3D_PATH`
- `MESHY_POLL_INTERVAL_MS`
- `MESHY_MAX_POLL_ATTEMPTS`
- `R2_MEDIA_PREFIX`

## Notes

- Meshy generation reliability depends on valid image input and API credits.
- For local development, `MODEL3D_PUBLIC_BASE_URL` is required when image URLs are relative.
- Hook logs should be used as the first troubleshooting entry point for pipeline failures.
