export interface Release {
  id: string;
  title: string;
  coverArt: string | null;
  releaseDate: string; // ISO date string
  studio: string;
  edition: string;
  price: number | null;
  retailers: Retailer[];
  specs: DiscSpecs | null;
  year: string | null;
  runtime: string | null;
  mpaaRating: string | null;
  imdbUrl: string | null;
  imdbRating: number | null;
  addedAt: string;
  status: ReleaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiscSpecs {
  video: string[];    // e.g. ["Codec: HEVC / H.265", "Resolution: Native 4K (2160p)", ...]
  audio: string[];    // e.g. ["English: DTS-HD Master Audio 5.1 (48kHz, 24-bit)"]
  subtitles: string;  // e.g. "English SDH" or "None"
  discs: string[];    // e.g. ["4K Ultra HD", "Blu-ray Disc", "Two-disc set (1 BD-50)"]
  packaging: string;  // e.g. "Slipbox, Reversible cover"
  playback: string[]; // e.g. ["4K Blu-ray: Region free", "2K Blu-ray: Region A"]
}

export interface Retailer {
  name: string;
  url: string;
  price: number | null;
}

export type ReleaseStatus = 'out-now' | 'this-week' | 'coming-soon' | 'upcoming';

export type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc';

export type FilterStatus = 'all' | 'all-upcoming' | ReleaseStatus;
