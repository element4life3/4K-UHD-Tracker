'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Release, FilterStatus, SortOption, ViewMode } from '@/lib/types';
import ReleaseCard from '@/components/ReleaseCard';
import ReleaseRow from '@/components/ReleaseRow';
import SkeletonCard from '@/components/SkeletonCard';
import FilterBar from '@/components/FilterBar';
import { parseReleaseDate } from '@/lib/dates';

export default function Home() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all-upcoming');
  const [sort, setSort] = useState<SortOption>('date-asc');
  const [month, setMonth] = useState('all');
  const [edition, setEdition] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('card');

  // Load saved view preference
  useEffect(() => {
    const saved = localStorage.getItem('4k-tracker-view');
    if (saved === 'card' || saved === 'list') setView(saved);
  }, []);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    localStorage.setItem('4k-tracker-view', next);
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    const currentYearMonth = new Date().toISOString().substring(0, 7);
    if (newMonth !== 'all') {
      // When selecting a specific month, show all releases in that month
      if (filter === 'all-upcoming' || filter === 'this-week') {
        setFilter('all');
      }
    } else {
      // When going back to "All Months", default to upcoming
      if (filter === 'all') {
        setFilter('all-upcoming');
      }
    }
    // Reset "this-week" filter if switching away from current month
    if (filter === 'this-week' && newMonth !== 'all' && newMonth !== currentYearMonth) {
      setFilter('all');
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  async function fetchReleases() {
    try {
      const res = await fetch('/releases.json');
      const data = await res.json();
      // Status is computed at render time so it stays accurate between rebuilds.
      // The stored value in releases.json is ignored.
      const withFreshStatus = (data.releases || []).map((r: Release) => ({
        ...r,
        status: computeStatus(r.releaseDate),
      }));
      setReleases(withFreshStatus);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      console.error('Failed to fetch releases:', err);
    } finally {
      setLoading(false);
    }
  }

  function computeStatus(releaseDate: string): Release['status'] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const relDay = parseReleaseDate(releaseDate);
    if (relDay.getTime() <= today.getTime()) return 'out-now';

    // Buckets follow calendar weeks (Sun–Sat), not a rolling 7-day window, so a
    // release only counts as "this week" once we're actually in its week. Discs
    // drop on Tuesdays, so next Tuesday reads as "Coming Soon" until the new week
    // begins on Sunday, at which point it flips to "This Week".
    // getDay(): 0=Sun … 6=Sat, so (6 - getDay()) days remain until this week's Saturday.
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfNextWeek = new Date(endOfThisWeek);
    endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

    if (relDay.getTime() <= endOfThisWeek.getTime()) return 'this-week';
    if (relDay.getTime() <= endOfNextWeek.getTime()) return 'coming-soon';
    return 'upcoming';
  }

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    releases.forEach(r => months.add(r.releaseDate.substring(0, 7)));
    return [...months].sort();
  }, [releases]);

  // Releases added to the tracker within this many days qualify as "newly added".
  const NEWLY_ADDED_WINDOW_DAYS = 90;
  const recentlyAddedIds = useMemo(() => {
    const cutoff = Date.now() - NEWLY_ADDED_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return new Set(
      releases.filter(r => new Date(r.addedAt).getTime() >= cutoff).map(r => r.id)
    );
  }, [releases]);

  const availableEditions = useMemo(() => {
    const counts: Record<string, number> = {};
    releases.forEach(r => { counts[r.edition] = (counts[r.edition] || 0) + 1; });
    // Sort by count descending, only include editions with >1 release
    return Object.entries(counts)
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([ed]) => ed);
  }, [releases]);

  const filtered = useMemo(() => {
    let result = [...releases];

    if (month !== 'all') {
      result = result.filter(r => r.releaseDate.startsWith(month));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        r => r.title.toLowerCase().includes(q) || r.studio.toLowerCase().includes(q)
      );
    }

    if (filter === 'all-upcoming') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(r => r.releaseDate >= today);
    } else if (filter === 'newly-added') {
      result = result.filter(r => recentlyAddedIds.has(r.id));
    } else if (filter !== 'all') {
      result = result.filter(r => r.status === filter);
    }

    if (edition !== 'all') {
      result = result.filter(r => r.edition === edition);
    }

    if (filter === 'newly-added') {
      // Show newest additions first regardless of the user's Sort By selection.
      result.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    } else {
      result.sort((a, b) => {
        switch (sort) {
          case 'date-asc':
            return a.releaseDate.localeCompare(b.releaseDate);
          case 'date-desc':
            return b.releaseDate.localeCompare(a.releaseDate);
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [releases, search, filter, sort, month, edition, recentlyAddedIds]);

  const filterContextLabel = ({
    'all-upcoming': 'including all upcoming',
    'all': 'including all upcoming and past releases',
    'this-week': 'for this week only',
    'newly-added': `added in the past ${NEWLY_ADDED_WINDOW_DAYS} days`,
  } as Record<string, string>)[filter];

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0b0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0b0f]/80 backdrop-blur-xl border-b border-[#1e2030]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Film Cell Logo */}
              <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Film strip body */}
                <rect x="4" y="6" width="40" height="36" rx="3" fill="#4da6ff" />
                {/* Sprocket holes - left column */}
                <rect x="6" y="9" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="6" y="16" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="6" y="23" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="6" y="30" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="6" y="35" width="5" height="4" rx="1" fill="#0a0b0f" />
                {/* Sprocket holes - right column */}
                <rect x="37" y="9" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="37" y="16" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="37" y="23" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="37" y="30" width="5" height="4" rx="1" fill="#0a0b0f" />
                <rect x="37" y="35" width="5" height="4" rx="1" fill="#0a0b0f" />
                {/* Frame area */}
                <rect x="13" y="9" width="22" height="30" rx="1.5" fill="#0a0b0f" />
                {/* 4K text inside frame */}
                <text x="24" y="29" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="14" fontWeight="900" fill="#4da6ff">4K</text>
              </svg>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl text-white tracking-wide">
                  4K UHD TRACKER
                </h1>
                <p className="text-xs text-gray-500">Upcoming 4K Blu-ray Releases</p>
              </div>
            </div>

            {formattedLastUpdated && (
              <span className="text-xs text-gray-500 hidden sm:block">
                Updated: {formattedLastUpdated}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search + Filters */}
        <FilterBar
          filter={filter}
          sort={sort}
          month={month}
          edition={edition}
          search={search}
          newCount={recentlyAddedIds.size}
          availableMonths={availableMonths}
          availableEditions={availableEditions}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onMonthChange={handleMonthChange}
          onEditionChange={setEdition}
          onSearchChange={setSearch}
        />

        {/* Stats + view toggle */}
        {!loading && (
          <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              {filtered.length} {filtered.length === 1 ? 'release' : 'releases'}
              {filterContextLabel && (
                <span className="text-gray-600 ml-1">{filterContextLabel}</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 rounded-lg border border-[#1e2030] bg-[#12131a] p-1">
                <button
                  onClick={() => handleViewChange('card')}
                  title="Card View"
                  aria-label="Card view"
                  aria-pressed={view === 'card'}
                  className={`flex items-center justify-center w-10 rounded-md transition-all cursor-pointer ${
                    view === 'card' ? 'bg-[#4da6ff] text-[#0a0b0f]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => handleViewChange('list')}
                  title="List View"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`flex items-center justify-center w-10 rounded-md transition-all cursor-pointer ${
                    view === 'list' ? 'bg-[#4da6ff] text-[#0a0b0f]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Release Grid / List */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          view === 'card' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map((release) => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:gap-2">
              {filtered.map((release) => (
                <ReleaseRow
                  key={release.id}
                  release={release}
                  expanded={expandedRowId === release.id}
                  onToggle={() =>
                    setExpandedRowId(prev => (prev === release.id ? null : release.id))
                  }
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-[#1e2030]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No releases found</p>
            <p className="text-gray-600 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e2030] bg-[#0a0b0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-center text-xs text-gray-600 leading-relaxed">
            Prices shown are estimates and may not reflect current retail pricing.
            Always verify prices directly at the retailer before purchasing.
            Release dates are subject to change. This site is not affiliated with any studio or retailer.
          </p>
        </div>
      </footer>
    </div>
  );
}
