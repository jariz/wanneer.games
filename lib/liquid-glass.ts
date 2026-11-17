import liquidGL, { type LiquidLens } from "liquid-gl";

const selector = ".glass, .glass-control";
const interactive = "button, a, [role='radio'], [role='tab'], .glass-control:has(input)";
const materials = {
  panel: { frost: 2.6, magnify: 1.025, opacity: .4 },
  bar: { frost: 2, magnify: 1, opacity: .55 },
  control: { frost: 1.8, magnify: 1.045, opacity: .12 },
  tooltip: { frost: 5, magnify: 1, opacity: .55 },
};

function materialFor(element: HTMLElement) {
  return element.matches('[role="tooltip"]') ? "tooltip" : element.dataset.lens === "bar" ? "bar" : element.classList.contains("glass-control") ? "control" : "panel";
}

function optics(material: keyof typeof materials) {
  // liquidGL offsets snapshot UVs, not element-local pixels, so fixed UV values
  // grow with page length. The nav gets a stronger, but still bounded, bevel.
  const size = Math.max(innerWidth, innerHeight, document.body.scrollWidth, document.body.scrollHeight);
  return material === "bar"
    ? { refraction: 20 / size, bevelDepth: 45 / size, bevelWidth: .156 }
    : { refraction: 6 / size, bevelDepth: 18 / size };
}

export function createLiquidGlass(artwork: HTMLCanvasElement) {
  const lenses = new Map<HTMLElement, LiquidLens>();
  const captureExcluded = new Set<Element>();
  const excludeHiddenText = () => {
    // The snapshot painter does not honour CSS clip on accessibility-only text,
    // including Next's route announcement inside its shadow root.
    for (const element of document.querySelectorAll('.sr-only, next-route-announcer, [data-slot="combobox-form-input"]')) {
      if (element.hasAttribute("data-liquid-ignore")) continue;
      element.setAttribute("data-liquid-ignore", "");
      captureExcluded.add(element);
    }
  };
  let tintColor = "";
  const themeTint = (opacity: number) => `rgba(${tintColor}, ${opacity})`;
  const tints = new WeakMap<LiquidLens, string | null>();
  const updateTint = (lens: LiquidLens) => {
    const material = materialFor(lens.el);
    const popup = lens.el.closest('[role="dialog"], [role="alertdialog"], [role="tooltip"], [data-slot="combobox-content"]');
    const clear = material !== "bar" && !popup && lens.el.closest('[data-glass-tone="clear"]');
    const tint = clear ? null : themeTint(popup && material === "panel" ? .55 : materials[material].opacity);
    if (tints.get(lens) === tint) return;
    lens.setTint(tint);
    tints.set(lens, tint);
  };
  let frame = 0;
  let destroyed = false;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      // v3's dynamic rasterizer ignores canvases; refresh its scene explicitly.
      liquidGL.registerDynamic([]);
    }, 100);
  };

  function sync() {
    frame = 0;
    if (destroyed) return;
    excludeHiddenText();
    tintColor = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim().split(/\s+/).join(", ");
    const elements = new Set(document.querySelectorAll<HTMLElement>(selector));
    for (const [element, lens] of lenses) {
      Object.assign(lens.options, optics(materialFor(element)));
      updateTint(lens);
      if (elements.has(element) && element.checkVisibility() && !element.matches("[data-disabled], [data-unavailable], :disabled")) continue;
      // React may have replaced a placeholder with game artwork since mounting.
      const backgroundImage = element.style.backgroundImage && element.style.backgroundImage !== "none" ? element.style.backgroundImage : null;
      lens.destroy();
      if (backgroundImage) element.style.backgroundImage = backgroundImage;
      delete element.dataset.glassRendered;
      lenses.delete(element);
    }
    const added = [...elements].filter((element) =>
      !lenses.has(element) && element.checkVisibility() &&
      !element.matches("[data-disabled], [data-unavailable], :disabled"),
    );
    updateInteraction();
    if (!added.length) return;
    for (const element of added) element.dataset.glassPending = materialFor(element);
    for (const [name, { opacity, ...material }] of Object.entries(materials)) {
      if (!added.some((element) => element.dataset.glassPending === name)) continue;
      const result = liquidGL({
        target: `[data-glass-pending="${name}"]`,
        snapshot: "body",
        content: false,
        engine: "auto",
        zIndex: -1,
        resolution: Math.min(devicePixelRatio, 1.5),
        bevelWidth: .14,
        ...optics(name as keyof typeof materials),
        aberration: 0,
        interaction: "none",
        ...material,
        tint: themeTint(opacity),
        shadow: name === "bar",
        specular: false,
        reveal: "none",
        on: {
          init(lens) {
            // liquidGL disables pointer events even with native content enabled.
            lens.el.style.pointerEvents = "";
            lens.el.dataset.glassRendered = "";
          },
        },
      });
      for (const lens of Array.isArray(result) ? result : result ? [result] : []) {
        // A batch shares its options object; hover changes must stay per-lens.
        lens.options = { ...lens.options };
        updateTint(lens);
        lenses.set(lens.el, lens);
      }
    }
    for (const element of added) delete element.dataset.glassPending;
    updateInteraction();
    refresh();
  }

  const schedule = () => {
    // Mark newly mounted announcements before the next renderer frame.
    excludeHiddenText();
    if (!frame) frame = requestAnimationFrame(sync);
  };
  const updateInteraction = () => {
    for (const [element, lens] of lenses) {
      if (!element.matches(interactive)) continue;
      const active = element.matches(":hover, :focus-within") &&
        !element.matches("[data-selected], [data-checked], [data-disabled], [data-unavailable], :disabled");
      // This is the same runtime option update used by liquidGL's own helper.
      lens.options.frost = materials[materialFor(element)].frost + (active ? 2.5 : 0);
    }
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ["class", "hidden", "open", "data-open", "data-disabled", "data-unavailable", "data-selected", "data-checked", "data-glass-tone", "data-clan"],
  });
  document.addEventListener("toggle", schedule, true);
  addEventListener("resize", schedule);
  const interactionEvents = ["pointerover", "pointerout", "focusin", "focusout"] as const;
  for (const event of interactionEvents) document.addEventListener(event, schedule);
  artwork.addEventListener("artwork-frame", refresh);
  sync();
  return () => {
    destroyed = true;
    observer.disconnect();
    clearTimeout(refreshTimer);
    artwork.removeEventListener("artwork-frame", refresh);
    document.removeEventListener("toggle", schedule, true);
    removeEventListener("resize", schedule);
    for (const event of interactionEvents) document.removeEventListener(event, schedule);
    cancelAnimationFrame(frame);
    for (const [element, lens] of lenses) {
      lens.destroy();
      delete element.dataset.glassRendered;
    }
    lenses.clear();
    for (const element of captureExcluded) element.removeAttribute("data-liquid-ignore");
    captureExcluded.clear();
  };
}
