import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    NEXT_CAL_API_KEY: z.string().min(1),
    NEXT_INVALIDATE_URL: z.string().url(),
    DATABASE_URL: z.string().min(1).default("./data/bot.db"),
  },
  runtimeEnv: process.env,
});
