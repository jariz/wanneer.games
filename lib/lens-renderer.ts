// Renders the page backdrop in WebGL and every [data-lens] element on top of it as a glass lens:
// refracting rim with a chromatic fringe, frosted interior and a specular edge.

const maxLenses = 16;
const fadeDuration = 1000;
const fadeZoom = 1.035;

const vertexSource = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const fragmentSource = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec4 uRegion;
uniform vec3 uCanvas;
uniform sampler2D uImageA;
uniform sampler2D uImageB;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform float uHasA;
uniform float uHasB;
uniform float uMix;
uniform int uCount;
uniform vec4 uRects[${maxLenses}];
uniform float uRadii[${maxLenses}];
uniform float uRims[${maxLenses}];

out vec4 outColor;

vec2 coverUv(vec2 p, vec2 size, float zoom) {
  vec2 local = (p - uRegion.xy) / uRegion.zw;
  float regionAspect = uRegion.z / uRegion.w;
  float imageAspect = size.x / size.y;
  vec2 scale = regionAspect > imageAspect ? vec2(1.0, imageAspect / regionAspect) : vec2(regionAspect / imageAspect, 1.0);
  return (local - 0.5) * scale / zoom + 0.5;
}

// Mip level for a 1:1 texel-to-pixel mapping. Sampled with textureLod, because scene() runs inside
// per-pixel branches where the implicit derivatives texture() relies on are undefined.
float coverLod(vec2 size, float zoom) {
  float regionAspect = uRegion.z / uRegion.w;
  float imageAspect = size.x / size.y;
  vec2 scale = regionAspect > imageAspect ? vec2(1.0, imageAspect / regionAspect) : vec2(regionAspect / imageAspect, 1.0);
  vec2 texelsPerPixel = size * scale / (uRegion.zw * zoom);
  return max(log2(max(texelsPerPixel.x, texelsPerPixel.y)), 0.0);
}

// Matches the CSS fallback: saturate(.5) brightness(.55).
vec3 grade(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, 0.5) * 0.55;
}

vec3 scene(vec2 p, float bias) {
  // Above the region the image's top row extends, so the navbar's frost and refraction never sample empty space.
  p.y = max(p.y, uRegion.y);
  vec2 local = (p - uRegion.xy) / uRegion.zw;
  if (local.y > 1.0) return uCanvas;
  vec3 image = uCanvas;
  float zoomA = mix(1.0, ${fadeZoom}, uMix);
  float zoomB = mix(${fadeZoom}, 1.0, uMix);
  if (uHasA > 0.5) image = grade(textureLod(uImageA, coverUv(p, uSizeA, zoomA), coverLod(uSizeA, zoomA) + bias).rgb);
  if (uHasB > 0.5) image = mix(image, grade(textureLod(uImageB, coverUv(p, uSizeB, zoomB), coverLod(uSizeB, zoomB) + bias).rgb), uMix);
  float x = clamp(local.x, 0.0, 1.0);
  image = mix(image, uCanvas, x < 0.5 ? mix(0.9, 0.5, x * 2.0) : mix(0.5, 0.2, (x - 0.5) * 2.0));
  image = mix(image, uCanvas, local.y > 0.5 ? mix(0.3, 1.0, (local.y - 0.5) * 2.0) : 0.3);
  return image;
}

// Eight taps around a blurry mip level give a soft frost without visible blocks.
vec3 frosted(vec2 p) {
  float r = 11.0 * uDpr;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * 0.785398;
    sum += scene(p + vec2(cos(angle), sin(angle)) * r, 4.2);
  }
  return sum * 0.125;
}

float roundedRect(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  int hit = -1;
  for (int i = 0; i < ${maxLenses}; i++) {
    if (i >= uCount) break;
    vec4 rect = uRects[i];
    if (roundedRect(p - rect.xy - rect.zw * 0.5, rect.zw * 0.5, uRadii[i]) < 0.0) hit = i;
  }
  if (hit < 0) {
    outColor = vec4(scene(p, 0.0), 1.0);
    return;
  }

  vec4 rect = uRects[hit];
  vec2 center = rect.xy + rect.zw * 0.5;
  vec2 halfSize = rect.zw * 0.5;
  float radius = uRadii[hit];
  float edge = -roundedRect(p - center, halfSize, radius);
  vec2 e = vec2(1.0, 0.0);
  vec2 normal = normalize(vec2(
    roundedRect(p + e.xy - center, halfSize, radius) - roundedRect(p - e.xy - center, halfSize, radius),
    roundedRect(p + e.yx - center, halfSize, radius) - roundedRect(p - e.yx - center, halfSize, radius)
  ) + 1e-5);

  // Bending is strongest at the rim and fades out towards the flat middle of the glass.
  float band = min(min(halfSize.x, halfSize.y), 26.0 * uDpr);
  float bend = pow(1.0 - clamp(edge / band, 0.0, 1.0), 3.0);
  vec2 shift = normal * bend * 24.0 * uDpr;
  vec3 color = vec3(
    frosted(p + shift * 1.15).r,
    frosted(p + shift).g,
    frosted(p + shift * 0.85).b
  );

  color = color * 1.05 + 0.006;
  float light = pow(max(dot(normal, normalize(vec2(-0.55, -0.85))), 0.0), 2.0);
  float rim = 1.0 - smoothstep(0.0, 2.5 * uDpr, edge);
  color += light * (rim * 0.32 + bend * 0.07) * uRims[hit];
  outColor = vec4(color, 1.0);
}`;

type Texture = { texture: WebGLTexture; width: number; height: number };

export type LensRenderer = { setImage: (url: string | null) => void; destroy: () => void };

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

export function createLensRenderer(canvas: HTMLCanvasElement, region: HTMLElement): LensRenderer | null {
  const context = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!context) return null;
  const gl: WebGL2RenderingContext = context;

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  } catch (error) {
    console.warn("Glass backdrop disabled:", error);
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
  const u = {
    resolution: uniform("uResolution"), dpr: uniform("uDpr"), region: uniform("uRegion"), canvas: uniform("uCanvas"),
    imageA: uniform("uImageA"), imageB: uniform("uImageB"), sizeA: uniform("uSizeA"), sizeB: uniform("uSizeB"),
    hasA: uniform("uHasA"), hasB: uniform("uHasB"), mix: uniform("uMix"),
    count: uniform("uCount"), rects: uniform("uRects"), radii: uniform("uRadii"), rims: uniform("uRims"),
  };
  gl.uniform1i(u.imageA, 0);
  gl.uniform1i(u.imageB, 1);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const textures = new Map<string, Promise<Texture | null>>();
  const loaded = new Map<string, Texture>();
  let previous: Texture | null = null;
  let current: Texture | null = null;
  let fadeStart = 0;
  let wanted: string | null = null;
  let frame = 0;
  let renderUntil = 0;
  let destroyed = false;

  function load(url: string) {
    let pending = textures.get(url);
    if (!pending) {
      pending = new Promise<Texture | null>((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          if (destroyed) return resolve(null);
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
          resolve(entry);
        };
        image.onerror = () => resolve(null);
        image.src = url;
      });
      textures.set(url, pending);
    }
    return pending;
  }

  function request(duration = 0) {
    renderUntil = Math.max(renderUntil, performance.now() + duration);
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    frame = 0;
    const dpr = Math.min(devicePixelRatio, 2);
    const width = Math.round(innerWidth * dpr);
    const height = Math.round(innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);

    const regionBox = region.getBoundingClientRect();
    const [r, g, b] = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim().split(/\s+/).map(Number);
    const fade = reducedMotion.matches ? 1 : Math.min(1, (now - fadeStart) / fadeDuration);

    const rects = new Float32Array(maxLenses * 4);
    const radii = new Float32Array(maxLenses);
    const rims = new Float32Array(maxLenses);
    let count = 0;
    for (const element of document.querySelectorAll<HTMLElement>("[data-lens]")) {
      if (count === maxLenses) break;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight) continue;
      rects.set([box.left * dpr, box.top * dpr, box.width * dpr, box.height * dpr], count * 4);
      // Bars (the navbar) span the viewport edge, where a rim highlight would just draw a line.
      rims[count] = element.dataset.lens === "bar" ? 0 : 1;
      radii[count] = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, box.width / 2, box.height / 2) * dpr;
      count++;
    }

    gl.uniform2f(u.resolution, width, height);
    gl.uniform1f(u.dpr, dpr);
    gl.uniform4f(u.region, regionBox.left * dpr, regionBox.top * dpr, regionBox.width * dpr, regionBox.height * dpr);
    gl.uniform3f(u.canvas, (r || 0) / 255, (g || 0) / 255, (b || 0) / 255);
    gl.uniform1i(u.count, count);
    gl.uniform4fv(u.rects, rects);
    gl.uniform1fv(u.radii, radii);
    gl.uniform1fv(u.rims, rims);

    // A fades out while B fades in; without a previous image the new one simply appears.
    const outgoing = fade < 1 ? previous : null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, outgoing?.texture ?? null);
    gl.uniform1f(u.hasA, outgoing ? 1 : 0);
    gl.uniform2f(u.sizeA, outgoing?.width ?? 1, outgoing?.height ?? 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, current?.texture ?? null);
    gl.uniform1f(u.hasB, current ? 1 : 0);
    gl.uniform2f(u.sizeB, current?.width ?? 1, current?.height ?? 1);
    gl.uniform1f(u.mix, outgoing ? fade : 1);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (now < renderUntil) frame = requestAnimationFrame(draw);
  }

  // Layout can move lenses without any event we could listen to, so keep drawing briefly after anything changes.
  const onChange = () => request(400);
  const onAnimation = () => request(1200);
  const resizeObserver = new ResizeObserver(onChange);
  resizeObserver.observe(document.body);
  const mutationObserver = new MutationObserver(onChange);
  mutationObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "data-clan", "data-selected", "data-open", "hidden"] });
  addEventListener("scroll", onChange, { passive: true, capture: true });
  addEventListener("resize", onChange);
  document.addEventListener("transitionrun", onAnimation);
  document.addEventListener("animationstart", onAnimation);
  request(400);

  return {
    setImage(url) {
      wanted = url;
      if (!url) {
        previous = current;
        current = null;
        fadeStart = performance.now();
        request(fadeDuration);
        return;
      }
      load(url).then((texture) => {
        if (destroyed || wanted !== url || !texture || texture === current) return;
        previous = current;
        current = texture;
        fadeStart = performance.now();
        request(fadeDuration + 50);
      });
      // Keep at most the textures in use plus a few recent ones.
      for (const [key, texture] of loaded) {
        if (loaded.size <= 6) break;
        if (texture === current || texture === previous || key === url) continue;
        gl.deleteTexture(texture.texture);
        loaded.delete(key);
        textures.delete(key);
      }
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      removeEventListener("scroll", onChange, { capture: true });
      removeEventListener("resize", onChange);
      document.removeEventListener("transitionrun", onAnimation);
      document.removeEventListener("animationstart", onAnimation);
      // The canvas hands the same context to the next renderer (e.g. React's dev remount), so free resources but keep it alive.
      for (const texture of loaded.values()) gl.deleteTexture(texture.texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
