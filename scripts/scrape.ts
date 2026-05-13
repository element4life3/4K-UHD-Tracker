import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scrapeBluRayReleases } from '../src/lib/scraper';
import type { Release } from '../src/lib/types';

const OUTPUT_PATH = join(process.cwd(), 'public', 'releases.json');

interface ReleasesFile {
  lastUpdated: string;
  releases: Release[];
}

function loadExisting(): ReleasesFile | null {
  if (!existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')) as ReleasesFile;
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

  // Preserve addedAt for releases we've already seen so the "new releases" banner
  // doesn't flag every release as new on each rebuild.
  for (const r of fresh) {
    const prev = oldById.get(r.id);
    if (prev) r.addedAt = prev.addedAt;
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
