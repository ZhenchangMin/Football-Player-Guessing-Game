import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "data", "players.real.json");

const REQUIRED_FIELDS = ["name", "age", "position", "number", "club", "league", "nation"];
const DEFAULT_BASE_URL = "https://transfermarkt-api.fly.dev";
const DEFAULT_COMPETITION_IDS = ["GB1", "ES1", "IT1", "L1", "FR1", "UKR1", "PO1"];
const PROFILE_CONCURRENCY = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseNumber = (value) => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value).replace(/[,# ]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const slug = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const mapPositionToCode = (rawPosition) => {
  const p = slug(rawPosition);
  if (!p) return "";

  if (p.includes("goal")) return "GK";

  if (p.includes("centre-forward") || p.includes("center-forward") || p.includes("striker") || p.includes("second striker")) return "ST";
  if (p.includes("left winger") || p.includes("left wing")) return "LW";
  if (p.includes("right winger") || p.includes("right wing")) return "RW";

  if (p.includes("attacking midfield")) return "CAM";
  if (p.includes("defensive midfield")) return "CDM";
  if (p.includes("central midfield")) return "CM";
  if (p.includes("left midfield")) return "LM";
  if (p.includes("right midfield")) return "RM";

  if (p.includes("centre-back") || p.includes("center-back") || p.includes("sweeper")) return "CB";
  if (p.includes("left-back") || p.includes("left wing-back")) return "LB";
  if (p.includes("right-back") || p.includes("right wing-back")) return "RB";
  if (p.includes("wing-back")) return "CB";

  const asCode = String(rawPosition).trim().toUpperCase();
  return asCode.length <= 4 ? asCode : "";
};

const isValidRecord = (record) =>
  REQUIRED_FIELDS.every((key) => {
    const value = record[key];
    return typeof value === "string" ? value.length > 0 : Number.isFinite(value);
  });

const parseCompetitionIds = () => {
  const raw = process.env.TM_COMPETITION_IDS;
  if (!raw) return DEFAULT_COMPETITION_IDS;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const createHeaders = () => {
  const headerName = process.env.TM_AUTH_HEADER;
  const headerValue = process.env.TM_AUTH_VALUE;
  const headers = {
    Accept: "application/json",
    "User-Agent":
      process.env.TM_USER_AGENT ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };
  if (headerName && headerValue) {
    headers[headerName] = headerValue;
  }
  if (process.env.TM_REFERER) {
    headers.Referer = process.env.TM_REFERER;
  }
  return headers;
};

const createBaseUrl = () => String(process.env.TM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

const fetchJson = async (url, headers, retries = 3, timeoutMs = 15000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return response.json();
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = attempt * 2000;
          console.warn(`HTTP ${response.status} for ${url}, retrying in ${delay}ms (${attempt}/${retries})...`);
          await sleep(delay);
          continue;
        }
      }
      throw new Error(`Fetch failed: ${url} (HTTP ${response.status})`);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        if (attempt < retries) {
          console.warn(`Timeout for ${url}, retrying (${attempt}/${retries})...`);
          await sleep(attempt * 1000);
          continue;
        }
        throw new Error(`Timeout: ${url}`);
      }
      throw err;
    }
  }
};

const runWithConcurrency = async (items, limit, taskFn) => {
  const output = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) break;
      output[current] = await taskFn(items[current], current);
    }
  });

  await Promise.all(workers);
  return output;
};

const buildRecord = (playerProfile, clubPlayer, leagueName) => {
  const shirt = parseNumber(playerProfile?.shirtNumber);
  const age = parseNumber(playerProfile?.age ?? clubPlayer?.age);
  const marketValue = parseNumber(playerProfile?.marketValue ?? clubPlayer?.marketValue);
  const citizenship = Array.isArray(playerProfile?.citizenship) ? playerProfile.citizenship : [];
  const fallbackNationality = Array.isArray(clubPlayer?.nationality) ? clubPlayer.nationality : [];

  const record = {
    name: String(playerProfile?.name ?? clubPlayer?.name ?? "").trim(),
    age,
    position: mapPositionToCode(playerProfile?.position?.main ?? clubPlayer?.position),
    number: shirt,
    club: String(playerProfile?.club?.name ?? clubPlayer?.currentClub ?? "").trim(),
    league: String(leagueName ?? "").trim(),
    nation: String(citizenship[0] ?? fallbackNationality[0] ?? "").trim(),
    marketValueEur: Number.isFinite(marketValue) ? marketValue : null
  };

  return isValidRecord(record) ? record : null;
};

const main = async () => {
  const headers = createHeaders();
  const baseUrl = createBaseUrl();
  const competitionIds = parseCompetitionIds();
  const maxPlayers = parseNumber(process.env.TM_LIMIT);

  const playerMap = new Map();

  for (const competitionId of competitionIds) {
    console.log(`Fetching competition: ${competitionId}...`);
    const competitionUrl = `${baseUrl}/competitions/${competitionId}/clubs`;
    let competition;
    try {
      competition = await fetchJson(competitionUrl, headers);
    } catch (err) {
      console.warn(`Skipping competition ${competitionId}: ${err.message}`);
      continue;
    }
    await sleep(500);
    const leagueName = String(competition?.name ?? competitionId);
    const clubs = Array.isArray(competition?.clubs) ? competition.clubs : [];

    for (let ci = 0; ci < clubs.length; ci++) {
      const club = clubs[ci];
      const clubId = club?.id;
      if (!clubId) continue;

      console.log(`  [${ci + 1}/${clubs.length}] Fetching club: ${club.name} (${clubId})...`);
      const clubPlayersUrl = `${baseUrl}/clubs/${clubId}/players`;
      let clubPlayersPayload;
      try {
        clubPlayersPayload = await fetchJson(clubPlayersUrl, headers);
      } catch (err) {
        console.warn(`  Skipping club ${club.name}: ${err.message}`);
        await sleep(1000);
        continue;
      }
      await sleep(300);
      const clubPlayers = Array.isArray(clubPlayersPayload?.players) ? clubPlayersPayload.players : [];

      console.log(`    Fetching ${clubPlayers.length} player profiles...`);
      const profiles = await runWithConcurrency(clubPlayers, PROFILE_CONCURRENCY, async (clubPlayer) => {
        if (!clubPlayer?.id) return null;
        try {
          const profileUrl = `${baseUrl}/players/${clubPlayer.id}/profile`;
          const result = await fetchJson(profileUrl, headers);
          await sleep(100);
          return result;
        } catch {
          return null;
        }
      });
      console.log(`    Done. Total players so far: ${playerMap.size}`);

      for (let i = 0; i < clubPlayers.length; i += 1) {
        const clubPlayer = clubPlayers[i];
        const profile = profiles[i];
        const record = buildRecord(profile, clubPlayer, leagueName);
        if (!record) continue;

        const key = slug(record.name);
        if (!key) continue;
        playerMap.set(key, record);
      }
    }
  }

  const normalized = Array.from(playerMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .slice(0, Number.isFinite(maxPlayers) && maxPlayers > 0 ? maxPlayers : undefined);

  if (!normalized.length) {
    throw new Error("No valid players parsed. Check API auth, base URL, and competition IDs.");
  }

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  console.log(`Updated ${OUTPUT_FILE} with ${normalized.length} players.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
