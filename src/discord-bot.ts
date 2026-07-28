import {
  deactivateDiscordSubscriber,
  getDiscordSubscriber,
  recordDiscordManualDelivery,
  replaceDiscordPlatforms,
  upsertDiscordSubscriber,
  type DiscordSubscriber,
} from "./discord-db";
import {
  chunkDiscordGiveaways,
  editDiscordInteractionResponse,
  sendDiscordMessage,
  verifyDiscordRequest,
} from "./discord";
import {
  platformNames,
  resolvePlatformSelection,
} from "./domain";
import { getGiveawaysFromLastSevenDays } from "./db";
import {
  filterByPreferences,
  refreshCatalog,
} from "./service";
import type { Env, Giveaway } from "./types";

interface DiscordOption {
  name: string;
  value?: string | number | boolean;
}

interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: {
    permissions?: string;
    user?: { id: string; username: string };
  };
  user?: { id: string; username: string };
  data?: {
    name?: string;
    options?: DiscordOption[];
  };
}

const EPHEMERAL = 64;
const MANAGE_GUILD = 1n << 5n;

function interactionResponse(
  type: number,
  data?: Record<string, unknown>,
): Response {
  return Response.json(data ? { type, data } : { type });
}

function hasManageGuild(interaction: DiscordInteraction): boolean {
  try {
    return (
      BigInt(interaction.member?.permissions ?? "0") & MANAGE_GUILD
    ) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

function optionValue(
  interaction: DiscordInteraction,
  name: string,
): string | undefined {
  const value = interaction.data?.options?.find((option) =>
    option.name === name
  )?.value;
  return typeof value === "string" ? value : undefined;
}

async function requireSubscriber(
  env: Env,
  channelId: string,
): Promise<DiscordSubscriber | null> {
  const subscriber = await getDiscordSubscriber(env.DB, channelId);
  return subscriber?.active ? subscriber : null;
}

async function deliverGiveaways(
  env: Env,
  interaction: DiscordInteraction,
  giveaways: Giveaway[],
  heading: string,
  recordDelivery: boolean,
): Promise<void> {
  if (!interaction.channel_id) return;
  if (giveaways.length === 0) {
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      "Nenhuma oferta foi encontrada para as plataformas deste canal.",
    );
    return;
  }

  const chunks = chunkDiscordGiveaways(giveaways, heading);
  const first = chunks.shift();
  if (!first) return;

  await editDiscordInteractionResponse(
    interaction.application_id,
    interaction.token,
    first.content,
  );
  if (recordDelivery) {
    await recordDiscordManualDelivery(
      env.DB,
      interaction.channel_id,
      first.giveaways,
    );
  }

  for (const chunk of chunks) {
    await sendDiscordMessage(
      env.DISCORD_BOT_TOKEN,
      interaction.channel_id,
      chunk.content,
    );
    if (recordDelivery) {
      await recordDiscordManualDelivery(
        env.DB,
        interaction.channel_id,
        chunk.giveaways,
      );
    }
  }
}

async function processCommand(
  interaction: DiscordInteraction,
  env: Env,
): Promise<void> {
  const channelId = interaction.channel_id;
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  const name = interaction.data?.name;
  if (!channelId || !guildId || !user || !name) {
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      "Este comando precisa ser usado em um canal de servidor.",
    );
    return;
  }

  if (name === "ativar") {
    if (!hasManageGuild(interaction)) {
      await editDiscordInteractionResponse(
        interaction.application_id,
        interaction.token,
        "Você precisa da permissão **Gerenciar servidor** para ativar avisos.",
      );
      return;
    }
    await upsertDiscordSubscriber(env.DB, channelId, guildId, user.id);
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      "✅ Avisos ativados neste canal. Todas as lojas estão selecionadas.",
    );
    return;
  }

  if (name === "ajuda") {
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      [
        "**Comandos**",
        "`/ativar` — ativa avisos neste canal (administrador)",
        "`/agora` — mostra ofertas ativas",
        "`/ultimos7dias` — mostra o histórico recente",
        "`/plataformas lojas:steam epic gog` — escolhe lojas",
        "`/status` — mostra a configuração",
        "`/parar` — desativa avisos (administrador)",
      ].join("\n"),
    );
    return;
  }

  const subscriber = await requireSubscriber(env, channelId);
  if (!subscriber) {
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      "Os avisos não estão ativos neste canal. Um administrador deve usar `/ativar`.",
    );
    return;
  }

  if (name === "parar") {
    if (!hasManageGuild(interaction)) {
      await editDiscordInteractionResponse(
        interaction.application_id,
        interaction.token,
        "Você precisa da permissão **Gerenciar servidor** para desativar avisos.",
      );
      return;
    }
    await deactivateDiscordSubscriber(env.DB, channelId);
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      "🔕 Avisos automáticos desativados neste canal.",
    );
    return;
  }

  if (name === "status") {
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      [
        "**Status do canal**",
        `Avisos: ${subscriber.active ? "✅ ativos" : "🔕 desativados"}`,
        `Plataformas: ${platformNames(subscriber.platforms)}`,
        `Verificação: a cada ${env.CHECK_INTERVAL_LABEL ?? "30 minutos"}`,
      ].join("\n"),
    );
    return;
  }

  if (name === "plataformas") {
    if (!hasManageGuild(interaction)) {
      await editDiscordInteractionResponse(
        interaction.application_id,
        interaction.token,
        "Você precisa da permissão **Gerenciar servidor** para alterar as lojas.",
      );
      return;
    }
    const raw = optionValue(interaction, "lojas") ?? "";
    const selection = resolvePlatformSelection(raw.split(/[\s,]+/));
    if (!selection.ok) {
      await editDiscordInteractionResponse(
        interaction.application_id,
        interaction.token,
        `${selection.error} Use: steam, epic, gog, itchio, drm-free, pc ou todas.`,
      );
      return;
    }
    await replaceDiscordPlatforms(env.DB, channelId, selection.platforms);
    await editDiscordInteractionResponse(
      interaction.application_id,
      interaction.token,
      `✅ Plataformas atualizadas: ${platformNames(selection.platforms)}.`,
    );
    return;
  }

  if (name === "agora") {
    const active = filterByPreferences(
      await refreshCatalog(env),
      subscriber.platforms,
    );
    await deliverGiveaways(
      env,
      interaction,
      active,
      `🎁 **Jogos grátis ativos (${active.length})**`,
      true,
    );
    return;
  }

  if (name === "ultimos7dias") {
    const recent = filterByPreferences(
      await getGiveawaysFromLastSevenDays(env.DB),
      subscriber.platforms,
    );
    await deliverGiveaways(
      env,
      interaction,
      recent,
      `🗓 **Jogos encontrados nos últimos 7 dias (${recent.length})**`,
      false,
    );
    return;
  }

  await editDiscordInteractionResponse(
    interaction.application_id,
    interaction.token,
    "Comando não reconhecido. Use `/ajuda`.",
  );
}

export async function handleDiscordInteraction(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const body = await request.text();
  const valid = await verifyDiscordRequest(
    env.DISCORD_PUBLIC_KEY,
    request.headers.get("X-Signature-Ed25519"),
    request.headers.get("X-Signature-Timestamp"),
    body,
  );
  if (!valid) return new Response("Assinatura inválida.", { status: 401 });

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }

  if (interaction.type === 1) return interactionResponse(1);
  if (interaction.type !== 2) {
    return interactionResponse(4, {
      content: "Tipo de interação não suportado.",
      flags: EPHEMERAL,
    });
  }

  ctx.waitUntil(
    processCommand(interaction, env).catch(async (error) => {
      console.error("Falha ao processar comando Discord.", error);
      try {
        await editDiscordInteractionResponse(
          interaction.application_id,
          interaction.token,
          "Ocorreu um erro ao processar o comando. Tente novamente.",
        );
      } catch (editError) {
        console.error("Falha ao responder erro no Discord.", editError);
      }
    }),
  );
  return interactionResponse(5, { flags: EPHEMERAL });
}
