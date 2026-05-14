import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scrapeBluRayReleases } from '../src/lib/scraper';
import type { Release } from '../src/lib/types';

const OUTPUT_PATH = join(process.cwd(), 'public', 'releases.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BATCH_SIZE = 5;
const TMDB_BATCH_DELAY_MS = 250;

interface ReleasesFile {
  lastUpdated: string;
  releases: Release[];
}

interface TmdbSearchResult { id: number; release_date?: string; title: string }
interface TmdbVideo { site: string; type: string; key: string; official: boolean }

function loadExisting(): ReleasesFile | null {
  if (!existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')) as ReleasesFile;
  } catch {
    return null;
  }
}

async function fetchTrailerId(title: string, year: string | null): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const params = new URLSearchParams({ api_key: TMDB_API_KEY, query: title });
    if (year) params.set('year', year);
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);
    if (!searchRes.ok) return null;
    const search = (await searchRes.json()) as { results: TmdbSearchResult[] };
    const match = search.results?.[0];
    if (!match) return null;

    const videosRes = await fetch(`https://api.themoviedb.org/3/movie/${match.id}/videos?api_key=${TMDB_API_KEY}`);
    if (!videosRes.ok) return null;
    const videos = (await videosRes.json()) as { results: TmdbVideo[] };
    const trailer =
      videos.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
      videos.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer') ??
      videos.results?.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return trailer?.key ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('[scrape] Starting scrape...');
  const start = Date.now();

  const fresh = await scrapeBluRayReleases();
  const existing = loadExisting();
  const oldById = new Map(existing?.releases.map(r => [r.id, r]) ?? []);

  // Preserve addedAt + previously-fetched trailer IDs across runs.
  for (const r of fresh) {
    const prev = oldById.get(r.id);
    if (prev) {
      r.addedAt = prev.addedAt;
      r.trailerYoutubeId = prev.trailerYoutubeId;
    }
  }

  // Fill in missing trailers from TMDB. Only hits the API for releases we
  // haven't successfully resolved before.
  const needsTrailer = fresh.filter(r => !r.trailerYoutubeId);
  if (TMDB_API_KEY && needsTrailer.length > 0) {
    console.log(`[scrape] Looking up trailers for ${needsTrailer.length} releases via TMDB...`);
    let found = 0;
    for (let i = 0; i < needsTrailer.length; i += TMDB_BATCH_SIZE) {
      const batch = needsTrailer.slice(i, i + TMDB_BATCH_SIZE);
      const ids = await Promise.all(batch.map(r => fetchTrailerId(r.title, r.year)));
      for (let j = 0; j < batch.length; j++) {
        if (ids[j]) {
          batch[j].trailerYoutubeId = ids[j];
          found++;
        }
      }
      if (i + TMDB_BATCH_SIZE < needsTrailer.length) {
        await new Promise(resolve => setTimeout(resolve, TMDB_BATCH_DELAY_MS));
      }
    }
    console.log(`[scrape] Found ${found}/${needsTrailer.length} trailers`);
  } else if (!TMDB_API_KEY) {
    console.log('[scrape] TMDB_API_KEY not set; skipping trailer lookup');
  }

  const output: ReleasesFile = {
    lastUpdated: new Date().toISOString(),
    releases: fresh,
  };

  mkdirSync(join(process.cwd(), 'public'), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[scrape] Wrote ${fresh.length} releases in ${elapsed}s`);
}

main().catch(err => {
  console.error('[scrape] Failed:', err);
  process.exit(1);
});
