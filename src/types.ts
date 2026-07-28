export const PLATFORM_DEFINITIONS = {
  steam: "Steam",
  "epic-games-store": "Epic Games Store",
  gog: "GOG",
  itchio: "itch.io",
  "drm-free": "DRM-Free",
  pc: "Outras lojas de PC",
} as const;

export type PlatformSlug = keyof typeof PLATFORM_DEFINITIONS;

export const ALL_PLATFORMS = Object.keys(
  PLATFORM_DEFINITIONS,
) as PlatformSlug[];

export interface Env {
  DB: D1Database;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID?: string;
  ADMIN_SETUP_KEY: string;
  CHECK_INTERVAL_LABEL?: string;
}

export type AccessStatus = "pending" | "approved" | "denied";
export type AccessMode = "approval" | "owner_only" | "open";

export interface AccessEntry {
  chatId: string;
  username: string | null;
  firstName: string | null;
  status: AccessStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface Giveaway {
  id?: number;
  source: "gamerpower";
  sourceId: string;
  title: string;
  description: string | null;
  platforms: PlatformSlug[];
  worth: string | null;
  thumbnailUrl: string | null;
  giveawayUrl: string;
  sourceUrl: string;
  publishedAt: string | null;
  endsAt: string | null;
  firstSeenAt?: string;
  active: boolean;
}

export interface MessageChunk {
  text: string;
  giveaways: Giveaway[];
}
