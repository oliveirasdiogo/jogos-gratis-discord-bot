import { fetchActiveGiveaways } from "./gamerpower";
import { ALL_PLATFORMS, type Env, type Giveaway, type PlatformSlug } from "./types";

interface GiveawayRow {
  id: number;
  source: "gamerpower";
  source_id: string;
  title: string;
  description: string | null;
  platforms_json: string;
  worth: string | null;
  thumbnail_url: string | null;
  giveaway_url: string;
  source_url: string;
  published_at: string | null;
  ends_at: string | null;
  first_seen_at: string;
  active: number;
}

function rowToGiveaway(row: GiveawayRow): Giveaway {
  let platforms: PlatformSlug[] = [];
  try {
    const parsed = JSON.parse(row.platforms_json) as unknown;
    const valid = new Set<string>(ALL_PLATFORMS);
    if (Array.isArray(parsed)) {
      platforms = parsed.filter(
        (platform): platform is PlatformSlug =>
          typeof platform === "string" && valid.has(platform),
      );
    }
  } catch {
    platforms = [];
  }

  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    title: row.title,
    description: row.description,
    platforms,
    worth: row.worth,
    thumbnailUrl: row.thumbnail_url,
    giveawayUrl: row.giveaway_url,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    endsAt: row.ends_at,
    firstSeenAt: row.first_seen_at,
    active: row.active === 1,
  };
}

export async function refreshCatalog(env: Env): Promise<Giveaway[]> {
  const giveaways = await fetchActiveGiveaways();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "UPDATE giveaways SET active = 0 WHERE source = 'gamerpower' AND active = 1",
    ),
  ];

  for (const giveaway of giveaways) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO giveaways (
           source, source_id, title, description, platforms_json, worth,
           thumbnail_url, giveaway_url, source_url, published_at, ends_at, active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(source, source_id) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           platforms_json = excluded.platforms_json,
           worth = excluded.worth,
           thumbnail_url = excluded.thumbnail_url,
           giveaway_url = excluded.giveaway_url,
           source_url = excluded.source_url,
           published_at = excluded.published_at,
           ends_at = excluded.ends_at,
           active = 1,
           last_seen_at = CURRENT_TIMESTAMP`,
      ).bind(
        giveaway.source,
        giveaway.sourceId,
        giveaway.title,
        giveaway.description,
        JSON.stringify(giveaway.platforms),
        giveaway.worth,
        giveaway.thumbnailUrl,
        giveaway.giveawayUrl,
        giveaway.sourceUrl,
        giveaway.publishedAt,
        giveaway.endsAt,
      ),
    );
  }

  await env.DB.batch(statements);
  const result = await env.DB.prepare(
    `SELECT * FROM giveaways
     WHERE source = 'gamerpower' AND active = 1
     ORDER BY datetime(first_seen_at) DESC, id DESC`,
  ).all<GiveawayRow>();
  return result.results.map(rowToGiveaway);
}

export async function getGiveawaysFromLastSevenDays(
  db: D1Database,
): Promise<Giveaway[]> {
  const result = await db.prepare(
    `SELECT * FROM giveaways
     WHERE datetime(first_seen_at) >= datetime('now', '-7 days')
     ORDER BY datetime(first_seen_at) DESC, id DESC
     LIMIT 100`,
  ).all<GiveawayRow>();
  return result.results.map(rowToGiveaway);
}

export function filterByPreferences(
  giveaways: Giveaway[],
  preferences: PlatformSlug[],
): Giveaway[] {
  return giveaways.filter((giveaway) =>
    giveaway.platforms.some((platform) => preferences.includes(platform)),
  );
}
