import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CAPTCHA_SITEKEY: z.string().min(1),
    NEXT_PUBLIC_REALTIME_BACKEND_URL: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CAPTCHA_SITEKEY: process.env.NEXT_PUBLIC_CAPTCHA_SITEKEY,
    NEXT_PUBLIC_REALTIME_BACKEND_URL: process.env.NEXT_PUBLIC_REALTIME_BACKEND_URL,
  },
  skipValidation: true,
  emptyStringAsUndefined: true,
});
