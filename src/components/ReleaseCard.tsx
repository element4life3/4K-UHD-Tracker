'use client';

import { useState, useMemo } from 'react';
import type { Release } from '@/lib/types';
import StatusBadge from './StatusBadge';

function CoverPlaceholder({ title }: { title: string }) {
  return (
    <div className="aspect-[2/3] bg-gradient-to-br from-[#1a1b26] to-[#0d0e14] flex items-center justify-center p-4">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-3 text-[#2a2d3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-[#3a3d52] font-display text-sm leading-tight">{title}</p>
      </div>
    </div>
  );
}

export default function ReleaseCard({ release }: { release: Release }) {
  const [showRetailers, setShowRetailers] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(release.releaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const verifiedRetailers = useMemo(
    () => release.retailers.filter(r => !r.name.startsWith('Search ')),
    [release.retailers]
  );
  const searchRetailers = useMemo(
    () => release.retailers.filter(r => r.name.startsWith('Search ')),
    [release.retailers]
  );

  const editionColors: Record<string, string> = {
    'SteelBook': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    "Collector's": 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'Limited Edition': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Ultimate Edition': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Deluxe Edition': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
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
      <div className="p-4 space-y-3">
        <h3 className="font-display text-lg text-white leading-tight line-clamp-2 group-hover:text-[#4da6ff] transition-colors">
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
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formattedDate}
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
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
          <p className="text-xl font-bold text-white">${release.price.toFixed(2)}</p>
        )}

        {/* Where to Buy */}
        <div>
          <button
            onClick={() => setShowRetailers(!showRetailers)}
            className="w-full flex items-center justify-between bg-[#4da6ff]/10 hover:bg-[#4da6ff]/20 text-[#4da6ff] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <span>Where to Buy</span>
            <svg className={`w-4 h-4 transition-transform ${showRetailers ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRetailers && (
            <div className="mt-2 space-y-1 animate-slide-down">
              {verifiedRetailers.map((retailer) => (
                <a
                  key={retailer.name}
                  href={retailer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2 rounded-lg bg-[#1a1b26] hover:bg-[#22243a] text-sm transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{retailer.name}</span>
                    {retailer.name === 'Pre-order' && (
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">PRE-ORDER</span>
                    )}
                  </div>
                  {retailer.price ? (
                    <span className="text-[#4da6ff] font-semibold">${retailer.price.toFixed(2)}</span>
                  ) : retailer.name !== 'Blu-ray.com' ? (
                    <span className="text-gray-500 text-xs">View</span>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </a>
              ))}

              {searchRetailers.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 pt-1.5">
                    <div className="h-px flex-1 bg-[#1e2030]" />
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Also check</span>
                    <div className="h-px flex-1 bg-[#1e2030]" />
                  </div>
                  {searchRetailers.map((retailer) => (
                    <a
                      key={retailer.name}
                      href={retailer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-1.5 rounded-lg hover:bg-[#1a1b26] text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-gray-500">{retailer.name.replace('Search ', '')}</span>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </>
              )}
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
              <div className="mt-2 px-4 py-3 rounded-lg bg-[#1a1b26] text-xs space-y-3 animate-slide-down">
                {/* Video */}
                {release.specs.video.length > 0 && (
                  <div>
                    <p className="text-[#4da6ff] font-semibold mb-1">Video</p>
                    {release.specs.video.map((line, i) => (
                      <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}

                {/* Audio */}
                {release.specs.audio.length > 0 && (
                  <div>
                    <p className="text-[#4da6ff] font-semibold mb-1">Audio</p>
                    {release.specs.audio.map((line, i) => (
                      <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}

                {/* Subtitles */}
                <div>
                  <p className="text-[#4da6ff] font-semibold mb-1">Subtitles</p>
                  <p className="text-gray-400">{release.specs.subtitles}</p>
                </div>

                {/* Discs */}
                {release.specs.discs.length > 0 && (
                  <div>
                    <p className="text-[#4da6ff] font-semibold mb-1">Discs</p>
                    {release.specs.discs.map((line, i) => (
                      <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}

                {/* Packaging */}
                {release.specs.packaging && release.specs.packaging !== 'Standard' && (
                  <div>
                    <p className="text-[#4da6ff] font-semibold mb-1">Packaging</p>
                    <p className="text-gray-400">{release.specs.packaging}</p>
                  </div>
                )}

                {/* Playback */}
                {release.specs.playback.length > 0 && (
                  <div>
                    <p className="text-[#4da6ff] font-semibold mb-1">Playback</p>
                    {release.specs.playback.map((line, i) => (
                      <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
