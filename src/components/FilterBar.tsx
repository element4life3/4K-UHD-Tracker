'use client';

import type { FilterStatus, SortOption } from '@/lib/types';

interface FilterBarProps {
  filter: FilterStatus;
  sort: SortOption;
  month: string;
  edition: string;
  availableMonths: string[];
  availableEditions: string[];
  onFilterChange: (filter: FilterStatus) => void;
  onSortChange: (sort: SortOption) => void;
  onMonthChange: (month: string) => void;
  onEditionChange: (edition: string) => void;
}

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all-upcoming', label: 'All Upcoming' },
  { value: 'all', label: 'All Releases' },
  { value: 'this-week', label: 'This Week' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'date-asc', label: 'Date (Earliest)' },
  { value: 'date-desc', label: 'Date (Latest)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
];

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const editionColors: Record<string, string> = {
  'SteelBook': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  "Collector's": 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Limited Edition': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'DigiPack': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Deluxe Edition': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Standard': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function FilterBar({ filter, sort, month, edition, availableMonths, availableEditions, onFilterChange, onSortChange, onMonthChange, onEditionChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Month pills */}
      {availableMonths.length > 1 && (() => {
        const currentYM = new Date().toISOString().substring(0, 7);
        const pastMonths = availableMonths.filter(m => m < currentYM);
        const currentAndFuture = availableMonths.filter(m => m >= currentYM);

        return (
          <div className="space-y-2">
            {/* Past months row */}
            {pastMonths.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">Past</span>
                {pastMonths.map(m => (
                  <button
                    key={m}
                    onClick={() => onMonthChange(month === m ? 'all' : m)}
                    className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                      month === m
                        ? 'bg-[#4da6ff]/20 text-[#4da6ff] border border-[#4da6ff]/40'
                        : 'text-gray-600 border border-[#151620] hover:border-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {formatMonth(m)}
                  </button>
                ))}
              </div>
            )}

            {/* Current and future months row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onMonthChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  month === 'all'
                    ? 'bg-[#4da6ff]/20 text-[#4da6ff] border border-[#4da6ff]/40'
                    : 'bg-[#12131a] text-gray-500 border border-[#1e2030] hover:border-[#4da6ff]/30 hover:text-gray-300'
                }`}
              >
                All Months
              </button>
              {currentAndFuture.map(m => (
                <button
                  key={m}
                  onClick={() => onMonthChange(month === m ? 'all' : m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    month === m
                      ? 'bg-[#4da6ff]/20 text-[#4da6ff] border border-[#4da6ff]/40'
                      : 'bg-[#12131a] text-gray-500 border border-[#1e2030] hover:border-[#4da6ff]/30 hover:text-gray-300'
                  }`}
                >
                  {formatMonth(m)}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Status filters + edition filter + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          {filterOptions
            .filter(option => {
              if (option.value !== 'this-week') return true;
              const currentYearMonth = new Date().toISOString().substring(0, 7);
              return month === 'all' || month === currentYearMonth;
            })
            .map(option => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                filter === option.value
                  ? 'bg-[#4da6ff] text-[#0a0b0f]'
                  : 'bg-[#12131a] text-gray-400 border border-[#1e2030] hover:border-[#4da6ff]/40 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}

          {/* Edition filter pills */}
          {availableEditions.length > 1 && (
            <>
              <div className="w-px h-8 bg-[#1e2030] self-center mx-1 hidden sm:block" />
              {availableEditions.map(ed => {
                const colors = editionColors[ed] || editionColors['Standard'];
                const isActive = edition === ed;
                return (
                  <button
                    key={ed}
                    onClick={() => onEditionChange(isActive ? 'all' : ed)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isActive ? colors + ' ring-1 ring-current' : 'bg-[#12131a] text-gray-500 border-[#1e2030] hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {ed}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm rounded-lg px-4 py-2 focus:border-[#4da6ff] focus:outline-none cursor-pointer"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
