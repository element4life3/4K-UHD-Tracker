'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Release, FilterStatus, SortOption } from '@/lib/types';
import ReleaseCard from '@/components/ReleaseCard';
import SkeletonCard from '@/components/SkeletonCard';
import FilterBar from '@/components/FilterBar';

export default function Home() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all-upcoming');
  const [sort, setSort] = useState<SortOption>('date-asc');
  const [month, setMonth] = useState('all');
  const [newReleaseIds, setNewReleaseIds] = useState<Set<string>>(new Set());
  const [edition, setEdition] = useState('all');

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

  // Compare against localStorage timestamp once after data loads to identify
  // releases added since the user's last visit. The lastSeen value is captured
  // at page load (then immediately reset to now), so the set stays stable for
  // this session even if the user clicks Newly Added later.
  const [newSetComputed, setNewSetComputed] = useState(false);
  useEffect(() => {
    if (releases.length === 0 || newSetComputed) return;
    setNewSetComputed(true);

    const STORAGE_KEY = '4k-tracker-last-seen';
    const lastSeen = localStorage.getItem(STORAGE_KEY);

    if (lastSeen) {
      const lastSeenTime = new Date(lastSeen).getTime();
      const ids = new Set(
        releases.filter(r => new Date(r.addedAt).getTime() > lastSeenTime).map(r => r.id)
      );
      setNewReleaseIds(ids);
    }

    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, [releases, newSetComputed]);

  async function fetchReleases() {
    try {
      const res = await fetch('/releases.json');
      const data = await res.json();
      setReleases(data.releases || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      console.error('Failed to fetch releases:', err);
    } finally {
      setLoading(false);
    }
  }

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    releases.forEach(r => months.add(r.releaseDate.substring(0, 7)));
    return [...months].sort();
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
      result = result.filter(r => newReleaseIds.has(r.id));
    } else if (filter !== 'all') {
      result = result.filter(r => r.status === filter);
    }

    if (edition !== 'all') {
      result = result.filter(r => r.edition === edition);
    }

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

    return result;
  }, [releases, search, filter, sort, month, edition, newReleaseIds]);

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
                <p className="text-xs text-gray-500">Upcoming Blu-ray Releases</p>
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
          newCount={newReleaseIds.size}
          availableMonths={availableMonths}
          availableEditions={availableEditions}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onMonthChange={handleMonthChange}
          onEditionChange={setEdition}
          onSearchChange={setSearch}
        />

        {/* Stats */}
        {!loading && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {filtered.length} {filtered.length === 1 ? 'release' : 'releases'}
              {filter !== 'all' || search ? ' found' : ''}
            </span>
            {formattedLastUpdated && (
              <span className="sm:hidden text-xs">Updated: {formattedLastUpdated}</span>
            )}
          </div>
        )}

        {/* Release Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
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
