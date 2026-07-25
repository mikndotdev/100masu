import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    CAPTCHA_SECRET: z.string().min(1),
    TENCENTCLOUD_SECRET_ID: z.string().min(1),
    TENCENTCLOUD_SECRET_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: true,
  emptyStringAsUndefined: true,
});
