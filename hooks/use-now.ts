"use client";

import { useEffect, useState } from "react";

export function useNow(initial: number) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}
