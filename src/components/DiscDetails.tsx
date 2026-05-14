'use client';

import type { DiscSpecs } from '@/lib/types';

export default function DiscDetails({ specs }: { specs: DiscSpecs }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-[#1a1b26] text-xs space-y-3">
      {specs.video.length > 0 && (
        <div>
          <p className="text-[#4da6ff] font-semibold mb-1">Video</p>
          {specs.video.map((line, i) => (
            <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      {specs.audio.length > 0 && (
        <div>
          <p className="text-[#4da6ff] font-semibold mb-1">Audio</p>
          {specs.audio.map((line, i) => (
            <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      <div>
        <p className="text-[#4da6ff] font-semibold mb-1">Subtitles</p>
        <p className="text-gray-400">{specs.subtitles}</p>
      </div>

      {specs.discs.length > 0 && (
        <div>
          <p className="text-[#4da6ff] font-semibold mb-1">Discs</p>
          {specs.discs.map((line, i) => (
            <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      {specs.packaging && specs.packaging !== 'Standard' && (
        <div>
          <p className="text-[#4da6ff] font-semibold mb-1">Packaging</p>
          <p className="text-gray-400">{specs.packaging}</p>
        </div>
      )}

      {specs.playback.length > 0 && (
        <div>
          <p className="text-[#4da6ff] font-semibold mb-1">Playback</p>
          {specs.playback.map((line, i) => (
            <p key={i} className="text-gray-400 leading-relaxed">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
