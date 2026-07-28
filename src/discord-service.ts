import {
  claimDiscordNotification,
  deactivateDiscordSubscriber,
  listActiveDiscordSubscribers,
  markDiscordNotificationsSent,
  releaseDiscordNotifications,
  type DiscordSubscriber,
} from "./discord-db";
import {
  chunkDiscordGiveaways,
  DiscordApiError,
  sendDiscordMessage,
} from "./discord";
import { matchesPreferences } from "./domain";
import type { Env, Giveaway } from "./types";

async function notifyDiscordSubscriber(
  env: Env,
  subscriber: DiscordSubscriber,
  activeGiveaways: Giveaway[],
): Promise<void> {
  const matching = activeGiveaways.filter((giveaway) =>
    matchesPreferences(giveaway, subscriber.platforms)
  );
  const claimed: Giveaway[] = [];

  for (const giveaway of matching) {
    if (
      giveaway.id !== undefined &&
      await claimDiscordNotification(env.DB, subscriber.channelId, giveaway.id)
    ) {
      claimed.push(giveaway);
    }
  }

  if (claimed.length === 0) return;
  const heading = claimed.length === 1
    ? "🎁 **Novo jogo grátis encontrado!**"
    : `🎁 **${claimed.length} novos jogos grátis encontrados!**`;
  const chunks = chunkDiscordGiveaways(claimed, heading);
  const sentIds = new Set<number>();

  try {
    for (const chunk of chunks) {
      await sendDiscordMessage(
        env.DISCORD_BOT_TOKEN,
        subscriber.channelId,
        chunk.content,
      );
      const ids = chunk.giveaways.flatMap((giveaway) =>
        giveaway.id === undefined ? [] : [giveaway.id]
      );
      await markDiscordNotificationsSent(env.DB, subscriber.channelId, ids);
      ids.forEach((id) => sentIds.add(id));
    }
  } catch (error) {
    const pending = claimed.flatMap((giveaway) =>
      giveaway.id !== undefined && !sentIds.has(giveaway.id)
        ? [giveaway.id]
        : []
    );
    await releaseDiscordNotifications(
      env.DB,
      subscriber.channelId,
      pending,
      error instanceof Error ? error.message : String(error),
    );

    if (
      error instanceof DiscordApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      await deactivateDiscordSubscriber(env.DB, subscriber.channelId);
      return;
    }
    throw error;
  }
}

export async function runDiscordScheduledCheck(
  env: Env,
  activeGiveaways: Giveaway[],
): Promise<void> {
  const subscribers = await listActiveDiscordSubscribers(env.DB);
  for (const subscriber of subscribers) {
    try {
      await notifyDiscordSubscriber(env, subscriber, activeGiveaways);
    } catch (error) {
      console.error(
        `Falha ao avisar o canal Discord ${subscriber.channelId}.`,
        error,
      );
    }
  }
}
