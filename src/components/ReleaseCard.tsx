'use client';

import { useState } from 'react';
import type { Release } from '@/lib/types';
import StatusBadge from './StatusBadge';
import RetailerList from './RetailerList';
import DiscDetails from './DiscDetails';
import TrailerModal from './TrailerModal';

function CoverPlaceholder({ title }: { title: string }) {
  return (
    <div className="aspect-[2/3] bg-gradient-to-br from-[#1a1b26] to-[#0d0e14] flex items-center justify-center p-4">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-3 text-[#2a2d3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-[#3a3d52] font-title font-semibold text-sm leading-snug tracking-tight">{title}</p>
      </div>
    </div>
  );
}

export default function ReleaseCard({ release }: { release: Release }) {
  const [showRetailers, setShowRetailers] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(release.releaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const editionColors: Record<string, string> = {
    'SteelBook': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'DigiPack': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    "Collector's": 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'Special Edition': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Standard': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="release-card group rounded-xl bg-[#12131a] border border-[#1e2030] hover:border-[#4da6ff]/40 transition-all duration-300">
      {/* Cover Art */}
      <div className="relative overflow-hidden rounded-t-xl">
        {release.coverArt && !imgError ? (
          <img
            src={release.coverArt}
            alt={release.title}
            className="aspect-[2/3] w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <CoverPlaceholder title={release.title} />
        )}

        {/* 4K UHD Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-[#4da6ff] text-[#0a0b0f] text-[10px] font-bold px-2 py-1 rounded tracking-wider">
            4K UHD
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-transparent to-transparent opacity-60" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-title font-semibold text-[15px] text-white leading-snug line-clamp-2 tracking-tight group-hover:text-[#4da6ff] transition-colors">
          {release.title}
        </h3>

        {(release.year || release.runtime || release.mpaaRating) && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            {release.year && <span>{release.year}</span>}
            {release.year && release.runtime && <span className="text-gray-700">&#8226;</span>}
            {release.runtime && <span>{release.runtime}</span>}
            {(release.year || release.runtime) && release.mpaaRating && <span className="text-gray-700">&#8226;</span>}
            {release.mpaaRating && (
              <span className="border border-gray-600 px-1.5 py-0 rounded text-[10px] text-gray-400 leading-relaxed">
                {release.mpaaRating.replace('Rated ', '')}
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={release.status} />
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${editionColors[release.edition] || editionColors['Standard']}`}>
            {release.edition}
          </span>
        </div>

        <div className="space-y-1.5 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="group/tip relative inline-flex">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1b26] border border-[#1e2030] px-2 py-1 text-[10px] text-gray-200 opacity-0 group-hover/tip:opacity-100 transition-opacity z-10">
                Release Date
              </span>
            </span>
            {formattedDate}
          </div>
          <div className="flex items-center gap-2">
            <span className="group/tip relative inline-flex">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1b26] border border-[#1e2030] px-2 py-1 text-[10px] text-gray-200 opacity-0 group-hover/tip:opacity-100 transition-opacity z-10">
                Studio
              </span>
            </span>
            {release.studio}
          </div>
          {release.imdbRating && (
            <a
              href={release.imdbUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-[#f5c518] transition-colors"
            >
              <span className="text-[#f5c518] font-bold text-xs bg-[#f5c518]/10 px-1.5 py-0.5 rounded">IMDb</span>
              <span className="text-white font-semibold">{release.imdbRating}</span>
              <span className="text-gray-600">/ 10</span>
            </a>
          )}
        </div>

        {release.price && (
          <p className="text-lg font-bold text-white">${release.price.toFixed(2)}</p>
        )}

        {/* Watch Trailer */}
        {release.trailerYoutubeId && (
          <button
            onClick={() => setShowTrailer(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1b26] hover:bg-[#22243a] text-gray-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#4da6ff]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Watch Trailer</span>
          </button>
        )}

        {/* Where to Buy */}
        <div>
          <button
            onClick={() => setShowRetailers(!showRetailers)}
            className="w-full flex items-center justify-between bg-[#4da6ff]/10 hover:bg-[#4da6ff]/20 text-[#4da6ff] px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <span>Where to Buy</span>
            <svg className={`w-4 h-4 transition-transform ${showRetailers ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRetailers && (
            <div className="mt-2 animate-slide-down">
              <RetailerList release={release} />
            </div>
          )}
        </div>

        {/* Details */}
        {release.specs && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between bg-[#1a1b26]/60 hover:bg-[#1a1b26] text-gray-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <span>Disc Details</span>
              <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDetails && (
              <div className="mt-2 animate-slide-down">
                <DiscDetails specs={release.specs} />
              </div>
            )}
          </div>
        )}
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
