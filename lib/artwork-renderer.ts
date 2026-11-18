const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform vec4 region;
uniform vec3 base;
uniform sampler2D imageA;
uniform sampler2D imageB;
uniform vec2 sizeA;
uniform vec2 sizeB;
uniform float hasA;
uniform float hasB;
uniform float progress;
uniform sampler2D effect;
uniform vec4 effectRegion;
uniform float effectOpacity;
out vec4 color;

vec3 sampleArt(sampler2D image, vec2 size, vec2 p, float zoom) {
  float aspect = region.z / region.w;
  float imageAspect = size.x / size.y;
  vec2 scale = aspect > imageAspect ? vec2(1.0, imageAspect / aspect) : vec2(aspect / imageAspect, 1.0);
  vec2 uv = ((p - region.xy) / region.zw - 0.5) * scale / zoom + 0.5;
  vec2 texels = size * scale / (region.zw * zoom);
  float lod = max(log2(max(texels.x, texels.y)), 0.0);
  float luminance = dot(textureLod(image, vec2(0.5), 20.0).rgb, vec3(0.2126, 0.7152, 0.0722));
  float dimming = 0.38 * smoothstep(0.18, 0.65, luminance);
  return textureLod(image, uv, lod).rgb * (1.0 - dimming);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  float y = clamp((p.y - region.y) / region.w, 0.0, 1.0);
  vec3 artwork = base;
  if (hasA > 0.5) artwork = sampleArt(imageA, sizeA, p, mix(1.0, 1.035, progress));
  if (hasB > 0.5) artwork = mix(artwork, sampleArt(imageB, sizeB, p, mix(1.035, 1.0, progress)), progress);
  float fade = y < 0.5 ? mix(0.0, 0.3, y * 2.0) : mix(0.3, 1.0, (y - 0.5) * 2.0);
  color = vec4(mix(artwork, base, fade), 1.0);
  if (effectOpacity > 0.0) {
    vec2 uv = (p - effectRegion.xy) / effectRegion.zw;
    if (all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)))) {
      vec4 light = texture(effect, uv);
      color.rgb = mix(color.rgb, light.rgb, light.a * effectOpacity);
    }
  }
}`;

type Texture = { texture: WebGLTexture; width: number; height: number };
export type ArtworkRenderer = { setImage(url: string | null): void; setEffect(canvas: HTMLCanvasElement | null): void; destroy(): void };

export function createArtworkRenderer(canvas: HTMLCanvasElement, region: HTMLElement): ArtworkRenderer | null {
  // liquidGL captures this canvas on later frames, after the browser has presented it.
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Artwork backdrop disabled:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = Object.fromEntries(["resolution", "region", "base", "imageA", "imageB", "sizeA", "sizeB", "hasA", "hasB", "progress", "effect", "effectRegion", "effectOpacity"].map((key) => [key, uniform(key)]));
  gl.uniform1i(u.imageA, 0);
  gl.uniform1i(u.imageB, 1);
  gl.uniform1i(u.effect, 2);
  const effectTexture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, effectTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  let effect: HTMLCanvasElement | null = null;
  let effectStarted = 0;
  const loaded = new Map<string, Texture>();
  let current: Texture | null = null;
  let previous: Texture | null = null;
  let wanted: string | null = null;
  let started = 0;
  let frame = 0;
  let destroyed = false;
  let visible = true;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function draw(now: number) {
    frame = 0;
    if (destroyed || !gl) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const box = region.getBoundingClientRect();
    const origin = canvas.getBoundingClientRect();
    const artworkHeight = Math.ceil(box.bottom - origin.top);
    const effectBox = effect?.getBoundingClientRect();
    const cssHeight = Math.ceil(Math.max(box.bottom, effectBox?.bottom ?? box.bottom) - origin.top);
    const width = Math.round(origin.width * dpr), height = Math.round(cssHeight * dpr);
    if (canvas.style.height !== `${cssHeight}px`) canvas.style.height = `${cssHeight}px`;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim().split(/\s+/).map(Number);
    const progress = reducedMotion.matches ? 1 : Math.min(1, (now - started) / 1000);
    gl.uniform2f(u.resolution, width, height);
    // Include the nav in the artwork crop instead of stretching one image row behind it.
    gl.uniform4f(u.region, (box.left - origin.left) * dpr, 0, box.width * dpr, artworkHeight * dpr);
    gl.uniform3f(u.base, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    for (const [index, image] of [progress < 1 ? previous : null, current].entries()) {
      gl.activeTexture(index ? gl.TEXTURE1 : gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, image?.texture ?? null);
      gl.uniform1f(index ? u.hasB : u.hasA, image ? 1 : 0);
      gl.uniform2f(index ? u.sizeB : u.sizeA, image?.width ?? 1, image?.height ?? 1);
    }
    gl.uniform1f(u.progress, progress);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, effectTexture);
    const hasEffect = effect && effect.width > 0 && effect.height > 0;
    gl.uniform1f(u.effectOpacity, hasEffect ? Math.min(1, (now - effectStarted) / 2000) : 0);
    if (effect && hasEffect && effectBox) {
      gl.uniform4f(u.effectRegion, (effectBox.left - origin.left) * dpr, (effectBox.top - origin.top) * dpr, effectBox.width * dpr, effectBox.height * dpr);
      // Composite the live WebGPU canvas before liquidGL samples this backdrop.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, effect);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dispatchEvent(new Event("artwork-frame"));
    if (progress < 1 || effect) request();
  }
  function request() {
    if (!frame && !destroyed && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(request);
  resize.observe(region);
  const clan = new MutationObserver(request);
  if (region.parentElement) clan.observe(region.parentElement, { attributes: true, attributeFilter: ["data-clan"] });
  addEventListener("resize", request);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
  });
  intersection.observe(region);
  document.addEventListener("visibilitychange", request);
  reducedMotion.addEventListener("change", request);
  request();

  function showImage(image: Texture | null) {
    previous = current;
    current = image;
    started = performance.now();
    request();
  }
  return {
    setEffect(source) {
      effect = source;
      effectStarted = performance.now();
      request();
    },
    setImage(url) {
      wanted = url;
      if (!url) return showImage(null);
      const cached = loaded.get(url);
      if (cached) return showImage(cached);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (destroyed) return;
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const entry = { texture, width: image.naturalWidth, height: image.naturalHeight };
        loaded.set(url, entry);
        if (wanted === url) showImage(entry);
        for (const [key, old] of loaded) {
          if (loaded.size <= 6) break;
          if (old === current || old === previous) continue;
          gl.deleteTexture(old.texture);
          loaded.delete(key);
        }
      };
      image.src = url;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", request);
      reducedMotion.removeEventListener("change", request);
      clan.disconnect();
      removeEventListener("resize", request);
      for (const image of loaded.values()) gl.deleteTexture(image.texture);
      gl.deleteTexture(effectTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
