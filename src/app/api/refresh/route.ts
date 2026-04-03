import { NextResponse } from 'next/server';
import { upsertRelease, setLastUpdated } from '@/lib/db';
import { scrapeBluRayReleases } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const releases = await scrapeBluRayReleases();

    for (const release of releases) {
      upsertRelease(release);
    }

    setLastUpdated(new Date().toISOString());

    return NextResponse.json({
      success: true,
      count: releases.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing releases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh releases' },
      { status: 500 }
    );
  }
}
