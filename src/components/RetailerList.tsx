'use client';

import { useMemo } from 'react';
import type { Release } from '@/lib/types';

export default function RetailerList({ release }: { release: Release }) {
  const verifiedRetailers = useMemo(
    () => release.retailers.filter(r => !r.name.startsWith('Search ')),
    [release.retailers]
  );
  const searchRetailers = useMemo(
    () => release.retailers.filter(r => r.name.startsWith('Search ')),
    [release.retailers]
  );

  return (
    <div className="space-y-1">
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
  );
}
