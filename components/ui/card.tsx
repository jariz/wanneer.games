import type { ComponentProps } from "react";
import { renderElement, type RenderProp } from "@ui-sdk/react/primitive";
import { cn } from "@/lib/utils";

function Card({ className, render, ...props }: ComponentProps<"div"> & { render?: RenderProp }) {
  return renderElement("div", { className: cn("glass relative overflow-hidden rounded-xl border border-glass-edge", className), "data-lens": "", ...props }, render);
}

export { Card };
