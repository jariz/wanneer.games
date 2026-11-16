"use client";

import { useEffect } from "react";
import { createAgent, registerTools } from "@ui-sdk/react/agent";

const agent = typeof window === "undefined" ? null : createAgent({
  allow: (step) => !step.confirm,
});

export default function AgentBridge() {
  useEffect(() => {
    if (!agent) return;
    if (process.env.NODE_ENV === "development") Object.assign(window, { wanneerAgent: agent });
    return registerTools(agent, { allow: (step) => !step.confirm });
  }, []);
  return null;
}
