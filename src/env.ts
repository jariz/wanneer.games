import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NEXT_TWITCH_CLIENT_ID: z.string().min(1),
    NEXT_TWITCH_CLIENT_SECRET: z.string().min(1),
    NEXT_CAL_API_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {},
});
