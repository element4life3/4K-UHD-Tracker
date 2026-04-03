import { NextResponse } from 'next/server';
import { getAllReleases, getLastUpdated, getReleaseCount, upsertRelease, setLastUpdated } from '@/lib/db';
import { scrapeBluRayReleases } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // If no releases cached, do initial fetch
    if (getReleaseCount() === 0) {
      const releases = await scrapeBluRayReleases();
      for (const release of releases) {
        upsertRelease(release);
      }
      setLastUpdated(new Date().toISOString());
    }

    const releases = getAllReleases();
    const lastUpdated = getLastUpdated();

    return NextResponse.json({ releases, lastUpdated });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch releases', releases: [], lastUpdated: null },
      { status: 500 }
    );
  }
}
