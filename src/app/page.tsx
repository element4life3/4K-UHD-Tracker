'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Release, FilterStatus, SortOption } from '@/lib/types';
import ReleaseCard from '@/components/ReleaseCard';
import SkeletonCard from '@/components/SkeletonCard';
import FilterBar from '@/components/FilterBar';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all-upcoming');
  const [sort, setSort] = useState<SortOption>('date-asc');
  const [month, setMonth] = useState('all');
  const [newReleases, setNewReleases] = useState<Release[]>([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [edition, setEdition] = useState('all');
  const [filteredNewIds, setFilteredNewIds] = useState<Set<string> | null>(null);

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

  // Detect new releases based on localStorage timestamp — only on initial load
  const [bannerChecked, setBannerChecked] = useState(false);
  useEffect(() => {
    if (releases.length === 0 || bannerChecked) return;
    setBannerChecked(true);

    const STORAGE_KEY = '4k-tracker-last-seen';
    const lastSeen = localStorage.getItem(STORAGE_KEY);

    if (lastSeen) {
      const lastSeenTime = new Date(lastSeen).getTime();
      const newOnes = releases.filter(r => new Date(r.addedAt).getTime() > lastSeenTime);
      if (newOnes.length > 0) {
        setNewReleases(newOnes);
        setShowNewBanner(true);
      }
    }

    // Update last seen to now
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, [releases, bannerChecked]);

  async function fetchReleases() {
    try {
      const res = await fetch('/api/releases');
      const data = await res.json();
      setReleases(data.releases || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      console.error('Failed to fetch releases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLastUpdated(data.lastUpdated);
        await fetchReleases();
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
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

    // Filter by new release IDs (from banner click)
    if (filteredNewIds) {
      result = result.filter(r => filteredNewIds.has(r.id));
      // Skip other filters when showing new releases
    } else {
      // Filter by month
      if (month !== 'all') {
        result = result.filter(r => r.releaseDate.startsWith(month));
      }

      // Search
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          r => r.title.toLowerCase().includes(q) || r.studio.toLowerCase().includes(q)
        );
      }

      // Filter by status
      if (filter === 'all-upcoming') {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(r => r.releaseDate >= today);
      } else if (filter !== 'all') {
        result = result.filter(r => r.status === filter);
      }

      // Filter by edition
      if (edition !== 'all') {
        result = result.filter(r => r.edition === edition);
      }
    }

    // Sort
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
  }, [releases, search, filter, sort, month, edition, filteredNewIds]);

  const handleNewBannerClick = useCallback(() => {
    setSearch('');
    setFilter('all');
    setMonth('all');
    setShowNewBanner(false);
    setFilteredNewIds(new Set(newReleases.map(r => r.id)));
  }, [newReleases]);

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

            <div className="flex items-center gap-3">
              {formattedLastUpdated && (
                <span className="text-xs text-gray-500 hidden sm:block">
                  Updated: {formattedLastUpdated}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-[#12131a] border border-[#1e2030] hover:border-[#4da6ff]/40 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* New Releases Banner */}
        {showNewBanner && newReleases.length > 0 && (
          <div className="animate-slide-down animate-pulse-glow flex items-center justify-between bg-[#4da6ff]/10 border border-[#4da6ff]/30 rounded-xl px-4 py-3">
            <button
              onClick={handleNewBannerClick}
              className="flex items-center gap-3 text-sm cursor-pointer"
            >
              <span className="text-lg">🎬</span>
              <span className="text-[#4da6ff] font-semibold">
                {newReleases.length} new {newReleases.length === 1 ? 'release' : 'releases'} added
              </span>
              {newReleases.length <= 3 && (
                <span className="text-gray-400">
                  — {newReleases.map(r => r.title).join(', ')}
                </span>
              )}
              <span className="text-gray-500 text-xs ml-1">Click to view</span>
            </button>
            <button
              onClick={() => setShowNewBanner(false)}
              className="text-gray-500 hover:text-white p-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Showing new releases indicator */}
        {filteredNewIds && (
          <div className="flex items-center justify-between bg-[#12131a] border border-[#1e2030] rounded-lg px-4 py-2">
            <span className="text-sm text-gray-400">
              Showing {filteredNewIds.size} newly added {filteredNewIds.size === 1 ? 'release' : 'releases'}
            </span>
            <button
              onClick={() => setFilteredNewIds(null)}
              className="text-[#4da6ff] text-sm hover:underline cursor-pointer"
            >
              Show all releases
            </button>
          </div>
        )}

        {/* Search */}
        <SearchBar value={search} onChange={(v) => { setSearch(v); setFilteredNewIds(null); }} />

        {/* Filters */}
        <FilterBar
          filter={filter}
          sort={sort}
          month={month}
          edition={edition}
          availableMonths={availableMonths}
          availableEditions={availableEditions}
          onFilterChange={(f) => { setFilter(f); setFilteredNewIds(null); }}
          onSortChange={setSort}
          onMonthChange={(m) => { handleMonthChange(m); setFilteredNewIds(null); }}
          onEditionChange={(e) => { setEdition(e); setFilteredNewIds(null); }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
