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
uniform vec4 liveRegion;
uniform float liveOpacity;
uniform float liveTime;
uniform float liveCompact;
out vec4 color;

// Live-session light edge: a WebGL port of shaders.com's LightEdge with the
// props we used (thickness .01, softness .89, smoke .64, one .28 spot per
// colour, intensity .64, bloom .28, oklab mixing, ACES tone mapping).
const float TWO_PI = 6.28318530718;

float hash12(vec2 p) {
  uvec2 u = floatBitsToUint(p * vec2(141421356.0, 2718281828.0));
  return float((u.x ^ u.y) * 3141592653u) / 4294967295.0;
}

vec2 hash22(vec2 p) {
  uvec2 u = floatBitsToUint(p * vec2(141421356.0, 2718281828.0));
  uint h = u.x ^ u.y;
  return vec2(uvec2(h) * uvec2(3141592653u, 1618033988u)) / 4294967295.0;
}

float value12(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}

vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

vec3 toOklab(vec3 c) {
  vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619, 0.5363325363, 0.6806995451, 0.2817188376, 0.0514459929, 0.1073969566, 0.6299787005) * c;
  lms = sign(lms) * pow(abs(lms), vec3(1.0 / 3.0));
  return mat3(0.2104542553, 1.9779984951, 0.0259040371, 0.793617785, -2.428592205, 0.7827717662, -0.0040720468, 0.4505937099, -0.808675766) * lms;
}

vec3 fromOklab(vec3 lab) {
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  return mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * (lms * lms * lms);
}

vec3 aces(vec3 c) {
  c = mat3(0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * (c / 0.6);
  c = (c * (c + 0.0245786) - 0.000090537) / (c * ((c + 0.432951) * 0.983729) + 0.238081);
  return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * c, 0.0, 1.0);
}

// Signed distance (negative inside) in height units, y up. Desktop traces the
// outline of their hemisphere3D tilted 30deg: an upper half circle over a
// half-height ellipse. Phones use their plain circle.
float liveField(vec2 q) {
  if (liveCompact > 0.5) return length(q) - 0.35;
  float r = 0.89;
  float dome = q.y >= 0.0 ? max(length(q) - r, -q.y) : length(vec2(max(abs(q.x) - r, 0.0), q.y));
  vec2 axes = vec2(r, r * 0.5);
  vec2 k = q / axes;
  float gradient = length(q / (axes * axes));
  float ellipse = gradient < 1e-4 ? -axes.y : (length(k) - 1.0) * length(k) / gradient;
  return min(dome, ellipse);
}

vec4 liveEdge(vec2 uv, float aspect, float heightPx) {
  float scale = liveCompact > 0.5 ? 1.1984 : 1.0;
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) / scale;
  float t = liveTime * 1.2 + 131.0;

  float th = 0.002, softness = 0.89, smokeAmount = 0.64;
  float bd = abs(liveField(q) / scale + th * (1.0 - softness));
  float borderTh = mix(th, 3.0 * th, softness);
  float aa = 2.0 / (heightPx * scale);
  float e0 = min(mix(borderTh, -borderTh, softness), borderTh + aa);
  float e1 = max(mix(borderTh, -borderTh, softness), borderTh + aa);
  float border = pow(clamp(1.0 - smoothstep(e0, e1, bd), 0.0, 1.0), 1.0 + softness);
  vec2 suv = q * 0.5;
  float drift = 0.5 * t;
  float smoke = clamp(3.0 * value12(suv * 2.7 + drift), 0.0, 1.0) - value12(suv * 3.4 - drift);
  smoke *= pow(clamp(1.0 - smoothstep(-0.202, 0.202 + aa, bd), 0.0, 1.0), 2.0);
  border = clamp(border + clamp(30.0 * smoke * smoke * 0.5 * smokeAmount * smokeAmount, 0.0, 1.0), 0.0, 1.0);
  float angle = atan(q.y, q.x) / TWO_PI;

  vec3 stops[3] = vec3[3](toLinear(vec3(0.549, 0.839, 0.361)), toLinear(vec3(0.745, 0.749, 0.361)), toLinear(vec3(0.941, 0.659, 0.361)));
  vec3 rgb = vec3(0.0), added = vec3(0.0);
  float weight = 0.0, blended = 0.0, addedAlpha = 0.0;
  for (int i = 0; i < 3; i++) {
    float index = float(i);
    vec2 random = hash22(vec2(2.0, 40.0 + index));
    float direction = random.y < 0.5 ? -1.0 : 1.0;
    float travel = (0.1 * t + random.x * 3.0) * direction;
    float mask = 0.5 + 0.5 * (i == 1 ? cos(t) : sin(t));
    float spot = 0.05 + 0.6 * 0.28 * 0.28 + 0.05 * random.x;
    float a = fract(angle + travel);
    float sector = smoothstep(0.5 - spot, 0.5, a) * (1.0 - smoothstep(0.5, 0.5 + spot, a));
    sector = clamp(sector * mask * border * (1.0 + (1.0 + 4.0 * softness) * 0.64), 0.0, 1.0);
    float share = sector / max(weight + sector, 1e-5);
    rgb = fromOklab(mix(toOklab(rgb), toOklab(stops[i]), share));
    weight += sector;
    blended += (1.0 - blended) * sector;
    added += stops[i] * sector;
    addedAlpha += sector;
  }
  float bloom = 0.28 * 4.0;
  vec3 light = mix(rgb * blended, added, bloom);
  float alpha = clamp(mix(blended, addedAlpha, bloom), 0.0, 1.0);
  return vec4(toSrgb(aces(clamp(light / max(alpha, 1e-4), 0.0, 1.0))), alpha);
}

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
  if (liveOpacity > 0.0) {
    vec2 uv = (p - liveRegion.xy) / liveRegion.zw;
    if (all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)))) {
      vec4 light = liveEdge(vec2(uv.x, 1.0 - uv.y), liveRegion.z / liveRegion.w, liveRegion.w);
      color.rgb = mix(color.rgb, light.rgb, light.a * liveOpacity);
    }
  }
}`;

type Texture = { texture: WebGLTexture; width: number; height: number };
export type ArtworkRenderer = { setImage(url: string | null): void; setLive(box: HTMLElement | null, compact: boolean): void; destroy(): void };

export function createArtworkRenderer(canvas: HTMLCanvasElement, region: HTMLElement, onReady?: () => void, onError?: () => void): ArtworkRenderer | null {
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
  const u = Object.fromEntries(["resolution", "region", "base", "imageA", "imageB", "sizeA", "sizeB", "hasA", "hasB", "progress", "liveRegion", "liveOpacity", "liveTime", "liveCompact"].map((key) => [key, uniform(key)]));
  gl.uniform1i(u.imageA, 0);
  gl.uniform1i(u.imageB, 1);
  let live: HTMLElement | null = null;
  let liveStarted = 0;
  const loaded = new Map<string, Texture>();
  let current: Texture | null = null;
  let previous: Texture | null = null;
  let wanted: string | null = null;
  let started = 0;
  let frame = 0;
  let destroyed = false;
  let visible = true;
  let ready = false;
  let waitingForImage = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function draw(now: number) {
    frame = 0;
    if (destroyed || !gl) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const box = region.getBoundingClientRect();
    const origin = canvas.getBoundingClientRect();
    const artworkHeight = Math.ceil(box.bottom - origin.top);
    const liveBox = live?.getBoundingClientRect();
    const cssHeight = Math.ceil(Math.max(box.bottom, liveBox?.bottom ?? box.bottom) - origin.top);
    const width = Math.round(origin.width * dpr), height = Math.round(cssHeight * dpr);
    if (canvas.style.height !== `${cssHeight}px`) canvas.style.height = `${cssHeight}px`;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim().split(/\s+/).map(Number);
    const progress = !ready || reducedMotion.matches ? 1 : Math.min(1, (now - started) / 1000);
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
    // The live light edge is drawn into the artwork, so liquidGL refracts it too.
    const hasLive = liveBox && liveBox.width > 0 && liveBox.height > 0;
    gl.uniform1f(u.liveOpacity, hasLive ? Math.min(1, (now - liveStarted) / 2000) : 0);
    if (hasLive) {
      gl.uniform4f(u.liveRegion, (liveBox.left - origin.left) * dpr, (liveBox.top - origin.top) * dpr, liveBox.width * dpr, liveBox.height * dpr);
      gl.uniform1f(u.liveTime, (now - liveStarted) / 1000);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready && !waitingForImage) {
      ready = true;
      onReady?.();
    }
    canvas.dispatchEvent(new Event("artwork-frame"));
    if (progress < 1 || live) request();
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
  const contextLost = () => onError?.();
  canvas.addEventListener("webglcontextlost", contextLost);
  request();

  function showImage(image: Texture | null) {
    waitingForImage = false;
    previous = current;
    current = image;
    // The canvas fades in as a whole; only later images crossfade within it.
    started = ready ? performance.now() : performance.now() - 1000;
    request();
  }
  return {
    setLive(box, compact) {
      if (box !== live) liveStarted = performance.now();
      live = box;
      gl.uniform1f(u.liveCompact, compact ? 1 : 0);
      request();
    },
    setImage(url) {
      wanted = url;
      if (!url) return showImage(null);
      const cached = loaded.get(url);
      if (cached) return showImage(cached);
      waitingForImage = true;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onerror = () => {
        if (!destroyed && wanted === url) {
          ready = false;
          onError?.();
        }
      };
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
      canvas.removeEventListener("webglcontextlost", contextLost);
      clan.disconnect();
      removeEventListener("resize", request);
      for (const image of loaded.values()) gl.deleteTexture(image.texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
