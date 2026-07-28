import { describe, expect, it } from "vitest";
import { chunkDiscordGiveaways } from "../src/discord";
import type { Giveaway } from "../src/types";

function giveaway(id: number, title: string): Giveaway {
  return {
    id,
    source: "gamerpower",
    sourceId: String(id),
    title,
    description: null,
    platforms: ["steam"],
    worth: "$19.99",
    thumbnailUrl: null,
    giveawayUrl: `https://example.com/${id}`,
    sourceUrl: "https://www.gamerpower.com/",
    publishedAt: null,
    endsAt: "2030-01-01T00:00:00Z",
    active: true,
  };
}

describe("chunkDiscordGiveaways", () => {
  it("mantém cada mensagem dentro do limite", () => {
    const chunks = chunkDiscordGiveaways(
      [giveaway(1, "Jogo A"), giveaway(2, "Jogo B")],
      "**Ofertas**",
      230,
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 230)).toBe(true);
    expect(chunks.flatMap((chunk) => chunk.giveaways)).toHaveLength(2);
  });

  it("não cria mensagens quando a lista está vazia", () => {
    expect(chunkDiscordGiveaways([], "**Ofertas**")).toEqual([]);
  });
});
