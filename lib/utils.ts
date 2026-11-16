import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ComponentProps, JSXElementConstructor } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shuffle<T>(items: T[]) {
  return items.map((item) => ({ item, order: Math.random() })).sort((a, b) => a.order - b.order).map(({ item }) => item)
}

// ui-sdk parts accept a className function; wrappers only take strings so cn can merge them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Styled<T extends JSXElementConstructor<any>> = Omit<ComponentProps<T>, "className"> & { className?: string }
