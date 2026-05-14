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
  - multi-select in sidebar with simultaneous multi-furniture rendering in showroom
  - active-item model for controls while keeping all selected items visible
  - camera controls remapped to avoid conflict with left-drag moving
  - camera rotate moved to mouse middle button; left-click reserved for furniture drag
  - fullscreen toggle moved to canvas overlay with in-canvas close action
  - fullscreen exit resize regression fixed (canvas remount + fullscreen class cleanup)
- Showroom rendering and positioning fixes:
  - removed `Stage` auto-centering behavior in favor of `Environment` + explicit groups
  - floor/model overlap mitigation added for models with inconsistent origin/base
- Showroom layout adjustments completed:
  - left fixed sidebar for furniture options
  - right panel for controls + canvas
  - sidebar and canvas panel heights aligned
  - sidebar forced to stay left (no fallback stacking above canvas)
- Pipeline and trigger reliability fixes:
  - queue trigger made fire-and-forget from `furniture` `afterChange` to avoid save blocking
  - update trigger deduplicated so image updates do not double-trigger `afterChange`
  - relationship ID normalization added for Postgres numeric IDs (`model3dFile`, hook log relations)

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
