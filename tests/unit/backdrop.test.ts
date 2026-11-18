// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { Backdrop, BackdropProvider, useBackdrop } from "@/components/backdrop";
import type { Game } from "@/lib/game-types";

const first: Game = { id: 1, name: "First", cover: null, artwork: "one.jpg", artworks: ["one.jpg", "two.jpg", "two.jpg"] };
const second: Game = { id: 2, name: "Second", cover: null, artwork: "three.jpg", artworks: ["three.jpg"] };

test("slides step and autoplay per artwork, with stable backwards navigation and pinned previews", async () => {
  vi.useFakeTimers();
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, matchMedia: () => ({ matches: true }) });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let state!: ReturnType<typeof useBackdrop>;
  function Probe() {
    state = useBackdrop();
    return createElement(Backdrop);
  }
  const render = (backgrounds: Game[], featured: Game | null = null) =>
    act(async () => root.render(createElement(BackdropProvider, { backgrounds, featured } as Parameters<typeof BackdropProvider>[0], createElement(Probe))));
  try {
    await render([first, second]);
    expect(state.artwork.map((game) => game.artwork)).toEqual(["one.jpg", "two.jpg", "three.jpg"]);
    await act(async () => state.step(1));
    expect(state.active?.id).toBe(1);
    expect(state.active?.artwork).toBe("two.jpg");
    expect(container.querySelectorAll("[data-active]")).toHaveLength(1);
    expect((container.querySelector("[data-active]") as HTMLElement).style.backgroundImage).toContain("two.jpg");
    random.mockReturnValue(0.99);
    await act(async () => state.step(1));
    expect(state.active?.id).toBe(2);
    random.mockReturnValue(0);
    await act(async () => state.step(-1));
    expect(state.active?.artwork).toBe("two.jpg");
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(state.active?.artwork).toBe("three.jpg");
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(state.active?.artwork).toBe("one.jpg");
    await render([first]);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(state.active?.artwork).toBe("two.jpg");
    await render([first, second], first);
    expect(state.active?.artwork).toBe("one.jpg");
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(state.active?.artwork).toBe("one.jpg");
    await render([first, second], { ...first, artwork: "two.jpg" });
    expect(state.active?.artwork).toBe("two.jpg");
    await act(async () => state.pin(second));
    expect(state.active?.artwork).toBe("three.jpg");
    await render([], null);
    await act(async () => state.pin(null));
    expect(state.active).toBeUndefined();
    await act(async () => state.step(1));
    expect(container.querySelectorAll("[data-active]")).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    random.mockRestore();
  }
});
