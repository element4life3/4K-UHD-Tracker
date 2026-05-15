'use client';

import type { FilterStatus, SortOption } from '@/lib/types';
import SearchBar from './SearchBar';

interface FilterBarProps {
  filter: FilterStatus;
  sort: SortOption;
  month: string;
  edition: string;
  search: string;
  newCount: number;
  availableMonths: string[];
  availableEditions: string[];
  onFilterChange: (filter: FilterStatus) => void;
  onSortChange: (sort: SortOption) => void;
  onMonthChange: (month: string) => void;
  onEditionChange: (edition: string) => void;
  onSearchChange: (value: string) => void;
}

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all-upcoming', label: 'All Upcoming' },
  { value: 'all', label: 'All Releases' },
  { value: 'this-week', label: 'This Week' },
  { value: 'newly-added', label: 'Newly Added' },
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

export default function FilterBar({ filter, sort, month, edition, search, newCount, availableMonths, availableEditions, onFilterChange, onSortChange, onMonthChange, onEditionChange, onSearchChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Search + status filters + month + edition + sort + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={onSearchChange} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start">
          {filterOptions
            .filter(option => {
              if (option.value !== 'this-week') return true;
              const currentYearMonth = new Date().toISOString().substring(0, 7);
              return month === 'all' || month === currentYearMonth;
            })
            .map(option => {
              const isActive = filter === option.value;
              const showCount = option.value === 'newly-added' && newCount > 0;
              return (
                <button
                  key={option.value}
                  onClick={() => onFilterChange(option.value)}
                  className={`h-10 px-4 text-sm rounded-full font-medium leading-none transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-[#4da6ff] text-[#0a0b0f]'
                      : 'bg-[#12131a] text-gray-400 border border-[#1e2030] hover:border-[#4da6ff]/40 hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                  {showCount && (
                    <span className={`font-bold ${isActive ? 'text-[#0a0b0f]' : 'text-[#4da6ff]'}`}>
                      {newCount}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {availableMonths.length > 1 && (() => {
          const currentYM = new Date().toISOString().substring(0, 7);
          const upcoming = availableMonths.filter(m => m >= currentYM);
          const past = availableMonths.filter(m => m < currentYM).reverse();

          return (
            <div className="flex flex-col">
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="appearance-none bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 pl-4 pr-9 focus:border-[#4da6ff] focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">All Months</option>
                  {upcoming.length > 0 && (
                    <optgroup label="Upcoming">
                      {upcoming.map(m => (
                        <option key={m} value={m}>{formatMonth(m)}</option>
                      ))}
                    </optgroup>
                  )}
                  {past.length > 0 && (
                    <optgroup label="Past">
                      {past.map(m => (
                        <option key={m} value={m}>{formatMonth(m)}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="hidden sm:block text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Months</span>
            </div>
          );
        })()}

        {availableEditions.length > 1 && (
          <div className="flex flex-col">
            <div className="relative">
              <select
                value={edition}
                onChange={(e) => onEditionChange(e.target.value)}
                className="appearance-none bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 pl-4 pr-9 focus:border-[#4da6ff] focus:outline-none cursor-pointer w-full"
              >
                <option value="all">All Editions</option>
                {availableEditions.map(ed => (
                  <option key={ed} value={ed}>
                    {ed}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <span className="hidden sm:block text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Editions</span>
          </div>
        )}

        <div className="flex flex-col">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 pl-4 pr-9 focus:border-[#4da6ff] focus:outline-none cursor-pointer w-full"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <span className="hidden sm:block text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Sort By</span>
        </div>
      </div>
    </div>
  );
}
