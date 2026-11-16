"use client";

import { useState } from "react";

// navigator.clipboard only exists on secure origins (HTTPS or localhost); over plain HTTP,
// e.g. the dev server on the local network, fall back to the older select-and-copy command.
function copyWithSelection(text: string) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  // A modal dialog makes the rest of the page inert, so the field has to live inside it.
  (document.activeElement?.closest("[role=dialog]") ?? document.body).append(field);
  field.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy command refused");
  } finally {
    field.remove();
  }
}

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy(text: string) {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else copyWithSelection(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return { copy, copied, failed };
}
