'use client';

export default function SkeletonCard() {
  return (
    <div className="skeleton-card rounded-xl overflow-hidden bg-[#12131a] border border-[#1e2030]">
      <div className="aspect-[2/3] bg-[#1a1b26] skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 bg-[#1a1b26] rounded skeleton-shimmer" />
        <div className="h-4 w-1/2 bg-[#1a1b26] rounded skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#1a1b26] rounded-full skeleton-shimmer" />
          <div className="h-6 w-20 bg-[#1a1b26] rounded-full skeleton-shimmer" />
        </div>
        <div className="h-4 w-1/3 bg-[#1a1b26] rounded skeleton-shimmer" />
      </div>
    </div>
  );
}
