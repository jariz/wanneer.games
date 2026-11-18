// @vitest-environment jsdom
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAgent } from "@ui-sdk/react/agent";
import { expect, test, vi } from "vitest";
vi.mock("@/app/planning-actions", () => ({ findPlanningGames: vi.fn() }));
import { CuratorEditor } from "@/app/artworks/curator";
import { exportCuration, type CuratorDraft } from "@/lib/artwork-curation";

test("the agent can discover curator controls and persist a selection", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: class { observe() {} unobserve() {} disconnect() {} } });
  Element.prototype.getAnimations = () => [];
  Element.prototype.checkVisibility = () => true;
  Element.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  HTMLElement.prototype.showPopover = () => {};
  HTMLElement.prototype.hidePopover = () => {};
  const agent = createAgent();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const initial: CuratorDraft = { version: 1, games: [{
    id: 1, name: "Example game", candidates: [{ imageId: "ar1", kind: "artwork" }, { imageId: "ar2", kind: "artwork" }], selected: [],
  }] };
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(CuratorEditor, { initial }))));
    await act(async () => {
      const result = await agent.act({ steps: [{ ref: "Games to curate", action: "setValue", args: ["1"] }] });
      expect(result.ok, result.error?.message).toBe(true);
    });
    const entries = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== "more");
    for (const entry of entries) expect(entry.label).toBeTruthy();
    expect(entries.map((entry) => entry.label)).toEqual(expect.arrayContaining([
      "Add a game", "Games to curate", "Export", "Keep ar1", "Preview ar2", "Selection actions", "Remove Example game",
    ]));
    await act(async () => {
      const result = await agent.act({ steps: [{ ref: "Keep ar1", action: "setChecked", args: [true] }] });
      expect(result.ok, result.error?.message).toBe(true);
    });
    const draft = JSON.parse(localStorage.getItem("artwork-curator-v1")!) as CuratorDraft;
    expect(exportCuration(draft.games).games[0].artworkIds).toEqual(["ar1"]);
    await act(async () => {
      const result = await agent.act({ steps: [{ ref: "Preview ar2", action: "press" }] });
      expect(result.ok, result.error?.message).toBe(true);
    });
    expect(container.querySelector("[data-testid=artwork-preview]")?.getAttribute("data-image-id")).toBe("ar2");
    expect(JSON.parse(localStorage.getItem("artwork-curator-v1")!).games[0].selected).toEqual(["ar1"]);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    localStorage.clear();
  }
});
