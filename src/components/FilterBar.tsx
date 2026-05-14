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
        <div className="flex flex-wrap items-start gap-2">
          {filterOptions
            .filter(option => {
              if (option.value !== 'this-week') return true;
              const currentYearMonth = new Date().toISOString().substring(0, 7);
              return month === 'all' || month === currentYearMonth;
            })
            .map(option => {
              const button = (
                <button
                  key={option.value}
                  onClick={() => onFilterChange(option.value)}
                  className={`h-10 px-4 rounded-full text-sm font-medium leading-none transition-all cursor-pointer ${
                    filter === option.value
                      ? 'bg-[#4da6ff] text-[#0a0b0f]'
                      : 'bg-[#12131a] text-gray-400 border border-[#1e2030] hover:border-[#4da6ff]/40 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );

              if (option.value === 'newly-added' && newCount > 0) {
                return (
                  <div key={option.value} className="flex flex-col">
                    {button}
                    <span className="text-[10px] text-[#4da6ff] uppercase tracking-wider mt-1 text-center">
                      {newCount} New
                    </span>
                  </div>
                );
              }
              return button;
            })}
        </div>

        {availableMonths.length > 1 && (() => {
          const currentYM = new Date().toISOString().substring(0, 7);
          const upcoming = availableMonths.filter(m => m >= currentYM);
          const past = availableMonths.filter(m => m < currentYM).reverse();

          return (
            <div className="flex flex-col">
              <select
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 px-4 focus:border-[#4da6ff] focus:outline-none cursor-pointer"
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
              <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Months</span>
            </div>
          );
        })()}

        {availableEditions.length > 1 && (
          <div className="flex flex-col">
            <select
              value={edition}
              onChange={(e) => onEditionChange(e.target.value)}
              className="bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 px-4 focus:border-[#4da6ff] focus:outline-none cursor-pointer"
            >
              <option value="all">All Editions</option>
              {availableEditions.map(ed => (
                <option key={ed} value={ed}>
                  {ed}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Editions</span>
          </div>
        )}

        <div className="flex flex-col">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-[#12131a] border border-[#1e2030] text-gray-300 text-sm leading-none rounded-lg h-10 px-4 focus:border-[#4da6ff] focus:outline-none cursor-pointer"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 text-center">Sort By</span>
        </div>
      </div>
    </div>
  );
}
