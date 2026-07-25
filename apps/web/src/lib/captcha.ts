import { createHash, createHmac } from "node:crypto";

import { env } from "@100masu/env/server";
import { env as webEnv } from "@100masu/env/web";

const HOST = "captcha.intl.tencentcloudapi.com";
const SERVICE = "captcha";
const ACTION = "DescribeCaptchaResult";
const VERSION = "2019-07-22";
const ALGORITHM = "TC3-HMAC-SHA256";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function buildAuthorization(payload: string, timestamp: number): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const canonicalRequest = [
    "POST",
    "/",
    "",
    `content-type:application/json; charset=utf-8\nhost:${HOST}\nx-tc-action:${ACTION.toLowerCase()}\n`,
    "content-type;host;x-tc-action",
    sha256Hex(payload),
  ].join("\n");

  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = [
    ALGORITHM,
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const secretDate = hmac(`TC3${env.TENCENTCLOUD_SECRET_KEY}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = createHmac("sha256", secretSigning).update(stringToSign, "utf8").digest("hex");

  return `${ALGORITHM} Credential=${env.TENCENTCLOUD_SECRET_ID}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;
}

export async function verifyCaptcha(
  ticket: string,
  randstr: string,
  userIp: string,
): Promise<boolean> {
  if (!ticket || !randstr) {
    return false;
  }

  const payload = JSON.stringify({
    CaptchaType: 9,
    Ticket: ticket,
    Randstr: randstr,
    UserIp: userIp,
    CaptchaAppId: Number(webEnv.NEXT_PUBLIC_CAPTCHA_SITEKEY),
    AppSecretKey: env.CAPTCHA_SECRET,
  });

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(`https://${HOST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: HOST,
        "X-TC-Action": ACTION,
        "X-TC-Version": VERSION,
        "X-TC-Timestamp": String(timestamp),
        Authorization: buildAuthorization(payload, timestamp),
      },
      body: payload,
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as {
      Response?: { CaptchaCode?: number; Error?: { Code?: string } };
    };

    return result.Response?.CaptchaCode === 0;
  } catch {
    return false;
  }
}
