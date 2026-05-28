'use client';

import { useState } from 'react';
import type { Release } from '@/lib/types';
import StatusBadge, { statusConfig } from './StatusBadge';
import RetailerList from './RetailerList';
import DiscDetails from './DiscDetails';
import TrailerModal from './TrailerModal';
import { formatReleaseDate } from '@/lib/dates';

interface ReleaseRowProps {
  release: Release;
  expanded: boolean;
  onToggle: () => void;
}

const editionColors: Record<string, string> = {
  'SteelBook': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'DigiPack': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  "Collector's": 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Special Edition': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Standard': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function CoverPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`w-full flex items-center justify-center text-[#3a3d52] ${className ?? ''}`}>
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    </div>
  );
}

export default function ReleaseRow({ release, expanded, onToggle }: ReleaseRowProps) {
  const [imgError, setImgError] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const formattedDate = formatReleaseDate(release.releaseDate);
  const formattedAddedDate = new Date(release.addedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const showImage = release.coverArt && !imgError;
  const collapsedImg = 'h-[72px]';
  const expandedImg = 'aspect-[2/3]';

  return (
    <div className={`bg-[#12131a] border rounded-lg overflow-hidden transition-all ${
      expanded ? 'border-[#4da6ff]/40' : 'border-[#1e2030] hover:border-[#4da6ff]/40'
    }`}>
      <div className="flex items-stretch">
        {/* Left column: image + (when expanded) Where to Buy below it */}
        <div className={`shrink-0 bg-[#1a1b26] flex flex-col ${expanded ? 'w-40' : 'w-12 justify-center'}`}>
          {showImage ? (
            <img
              src={release.coverArt!}
              alt={release.title}
              className={`w-full object-cover ${expanded ? expandedImg : collapsedImg}`}
              onError={() => setImgError(true)}
            />
          ) : (
            <CoverPlaceholder className={expanded ? expandedImg : collapsedImg} />
          )}
          {expanded && (
            <div className="p-2 space-y-2 animate-slide-down">
              {release.trailerYoutubeId && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="sm:hidden w-full flex items-center justify-center gap-2 bg-[#12131a] hover:bg-[#22243a] text-gray-200 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-[#4da6ff]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Watch Trailer</span>
                </button>
              )}
              <RetailerList release={release} />
            </div>
          )}
        </div>

        {/* Right column: header row + (when expanded) Disc Details below it */}
        <div className="flex-1 min-w-0 flex flex-col">
          <button
            onClick={onToggle}
            className="flex items-center gap-4 p-2 sm:p-3 cursor-pointer text-left w-full group"
          >
            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-title font-semibold text-[15px] text-white leading-snug tracking-tight group-hover:text-[#4da6ff] transition-colors sm:truncate ${expanded ? 'max-sm:line-clamp-2' : 'max-sm:truncate'}`}>
                {release.title}
              </h3>
              {/* Mobile-only badges above the meta line (only when expanded) */}
              {expanded && (
                <div className="sm:hidden mt-1.5 flex items-center gap-1.5">
                  <span className={`font-semibold px-2 py-0.5 rounded-full border text-xs leading-none whitespace-nowrap ${statusConfig[release.status].classes}`}>
                    {statusConfig[release.status].label}
                  </span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full border text-xs leading-none whitespace-nowrap ${editionColors[release.edition] || editionColors['Standard']}`}>
                    {release.edition}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                {release.year && <span>{release.year}</span>}
                {release.year && release.runtime && <span className="text-gray-700">&#8226;</span>}
                {release.runtime && <span>{release.runtime}</span>}
                {(release.year || release.runtime) && release.mpaaRating && <span className="text-gray-700">&#8226;</span>}
                {release.mpaaRating && (
                  <span className="border border-gray-600 px-1.5 rounded text-[10px] text-gray-400">
                    {release.mpaaRating.replace('Rated ', '')}
                  </span>
                )}
                {/* Release date — mobile only (sm+ has its own column) */}
                {(release.year || release.runtime || release.mpaaRating) && (
                  <span className="md:hidden text-gray-700">&#8226;</span>
                )}
                <span className="md:hidden">Releases {formattedDate}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <StatusBadge status={release.status} />
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${editionColors[release.edition] || editionColors['Standard']}`}>
                {release.edition}
              </span>
            </div>

            {/* Release date */}
            <div className="hidden lg:flex flex-col items-start text-sm text-gray-400 shrink-0 w-28">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Releases</span>
              <span className="leading-tight">{formattedDate}</span>
            </div>

            {/* Added date */}
            <div className="hidden lg:flex flex-col items-start text-sm text-gray-400 shrink-0 w-28">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Added</span>
              <span className="leading-tight">{formattedAddedDate}</span>
            </div>

            {/* Studio */}
            <div className="hidden xl:flex flex-col items-start text-sm text-gray-400 shrink-0 w-40 min-w-0">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Studio</span>
              <span className="leading-tight truncate w-full">{release.studio}</span>
            </div>

            {/* IMDb */}
            <div className="hidden md:flex items-center gap-1.5 text-sm shrink-0 w-20">
              {release.imdbRating ? (
                <>
                  <span className="text-[#f5c518] font-bold text-[10px] bg-[#f5c518]/10 px-1.5 py-0.5 rounded">IMDb</span>
                  <span className="text-white font-semibold">{release.imdbRating}</span>
                </>
              ) : (
                <span className="text-gray-700 text-xs">—</span>
              )}
            </div>

            {/* Price + (mobile only) badges stacked on the right */}
            <div className={`text-base font-bold text-white shrink-0 w-20 text-right ${expanded ? 'hidden sm:block' : ''}`}>
              {release.price ? `$${release.price.toFixed(2)}` : <span className="text-gray-700">—</span>}
            </div>

            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Mobile-only extra meta when expanded (badges shown in title section above) */}
          {expanded && (
            <div className="sm:hidden px-2 sm:px-3 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 animate-slide-down">
              <span>{release.studio}</span>
              {release.imdbRating && (
                <a
                  href={release.imdbUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-[#f5c518]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[#f5c518] font-bold text-[10px] bg-[#f5c518]/10 px-1.5 py-0.5 rounded">IMDb</span>
                  <span className="text-white font-semibold">{release.imdbRating}</span>
                </a>
              )}
              <span className="text-gray-600">Added {formattedAddedDate}</span>
            </div>
          )}

          {expanded && (release.specs || release.trailerYoutubeId) && (
            <div className="px-2 sm:px-3 pb-3 flex flex-col md:flex-row gap-3 animate-slide-down">
              {release.specs && (
                <div className="w-full md:w-72 md:shrink-0">
                  <DiscDetails specs={release.specs} />
                </div>
              )}
              {release.trailerYoutubeId && (
                <div className="hidden sm:block flex-1 min-w-0">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${release.trailerYoutubeId}`}
                      title={`${release.title} trailer`}
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showTrailer && release.trailerYoutubeId && (
        <TrailerModal
          youtubeId={release.trailerYoutubeId}
          title={release.title}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
