"use client";

import { avatarUrl, useUiConfig } from "../config";

type AvatarProps = {
  name: string;
  discordUserId?: string | null;
  avatar?: string | null;
  size?: "sm" | "md";
};

const SIZE_CLASS = {
  sm: "size-5",
  md: "size-8",
} as const;

export default function Avatar({ name, discordUserId, avatar, size = "sm" }: AvatarProps) {
  const { avatarBaseUrl } = useUiConfig();
  const src = avatarUrl(avatarBaseUrl, discordUserId ?? null, avatar ?? null);

  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={`${SIZE_CLASS[size]} shrink-0 rounded-full object-cover`}
    />
  );
}
