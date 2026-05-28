import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scrapeBluRayReleases } from '../src/lib/scraper';
import type { Release } from '../src/lib/types';

const OUTPUT_PATH = join(process.cwd(), 'public', 'releases.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BATCH_SIZE = 5;
const TMDB_BATCH_DELAY_MS = 250;
const AMAZON_BATCH_SIZE = 5;
const AMAZON_BATCH_DELAY_MS = 800;
const AFFILIATE_PARAMS = ['tag', 'linkCode', 'linkId', 'creative', 'creativeASIN', 'ascsubtag', 'ref_', 'ref'];
// Retailer names whose blu-ray.com click.php links redirect to affiliate-tagged
// Amazon URLs. "Pre-order" is just an Amazon buy-link that had no visible price.
const AFFILIATE_RETAILERS = ['Amazon', 'Pre-order'];

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

function cleanAmazonUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes('amazon.')) return rawUrl;
    for (const p of AFFILIATE_PARAMS) u.searchParams.delete(p);
    u.pathname = u.pathname.replace(/\/ref=[^/]*/g, '');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

async function resolveBlurayClick(url: string): Promise<string> {
  if (!url.includes('blu-ray.com/link/click.php')) return url;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location');
    if (!location || !/amazon\./i.test(location)) return url;
    return cleanAmazonUrl(location);
  } catch {
    return url;
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

  // Resolve blu-ray.com Amazon affiliate redirects to direct, untagged Amazon URLs.
  // Both "Amazon" and "Pre-order" buy links redirect to affiliate-tagged Amazon
  // pages, so both are cleaned. Reuse already-resolved URLs from the previous JSON
  // when a release's retailer was previously cleaned (avoids hammering blu-ray.com
  // on every run).
  const amazonTasks: Array<{ retailer: { url: string } }> = [];
  for (const r of fresh) {
    const prev = oldById.get(r.id);
    for (const ret of r.retailers) {
      if (!AFFILIATE_RETAILERS.includes(ret.name)) continue;
      if (!ret.url.includes('click.php')) continue;
      const prevCleaned = prev?.retailers.find(x => x.name === ret.name && !x.url.includes('click.php'));
      if (prevCleaned) {
        ret.url = prevCleaned.url;
        continue;
      }
      amazonTasks.push({ retailer: ret });
    }
  }
  if (amazonTasks.length > 0) {
    console.log(`[scrape] Resolving ${amazonTasks.length} Amazon affiliate links...`);
    let cleaned = 0;
    for (let i = 0; i < amazonTasks.length; i += AMAZON_BATCH_SIZE) {
      const batch = amazonTasks.slice(i, i + AMAZON_BATCH_SIZE);
      const newUrls = await Promise.all(batch.map(t => resolveBlurayClick(t.retailer.url)));
      for (let j = 0; j < batch.length; j++) {
        if (newUrls[j] !== batch[j].retailer.url) {
          batch[j].retailer.url = newUrls[j];
          cleaned++;
        }
      }
      if (i + AMAZON_BATCH_SIZE < amazonTasks.length) {
        await new Promise(resolve => setTimeout(resolve, AMAZON_BATCH_DELAY_MS));
      }
    }
    console.log(`[scrape] Cleaned ${cleaned}/${amazonTasks.length} Amazon URLs`);
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
