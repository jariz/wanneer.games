# liquid-gl 3.0.0: live canvas backdrop

Applied by pnpm through `patchedDependencies` in `pnpm-workspace.yaml`.

Upstream `registerDynamic()` always captures the full snapshot, and its dynamic
DOM rasterizer excludes canvases. Calling it during our artwork transition
repeatedly measured, painted and uploaded the entire page.

The patch adds `liquidGL.registerBackdrop(canvas)`, returning `update()` and
`destroy()`. Register before creating lenses; call `update()` after drawing.
There is one backdrop shared by all renderers. This is for a stationary canvas
whose pixels change; geometry/style changes still require a scene capture.

At scene capture, the rasterizer splits its existing paint plan around the
canvas into cached below/above layers and a live canvas operation. It preserves
paint order, clips and alpha operations, including translucent foregrounds.
Frames reuse that measured plan and composite only the expanded sampling bounds
of visible lenses, using the existing WebGL/WebGPU `uploadRegion` path.
No DOM traversal or full snapshot upload happens on `update()`. Unchanged frames
reuse the texture. Normal resize/content captures rebuild the cached layers.

The app invalidates static layers on observed DOM changes and image loads.
Artwork frame events only increment the backdrop version. Disposing the glass
releases the registration and renderer-owned layer canvases.

`tests/browser/liquid-gl.spec.ts` checks changing WebGL canvas pixels, foreground
alpha, background outside the canvas, zero captures during animation, idle
upload suppression, explicit recapture, resize and cleanup on both backends
(WebGPU skips when no adapter is available).

When upgrading liquid-gl, review its rasterizer and renderer changes before
regenerating this patch; remove it if upstream gains an equivalent canvas API.
