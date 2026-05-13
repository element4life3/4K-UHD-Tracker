import type { Release, Retailer, DiscSpecs } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const BLU_RAY_URL = 'https://www.blu-ray.com/movies/releasedates.php?4k=1';
const COVER_BASE = 'https://images.static-bluray.com/movies/covers/';
const BLU_RAY_MOVIE_BASE = 'https://www.blu-ray.com/movies/';

// Concurrency and rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 800;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+4K$/i, '')
    .replace(/\s+4K\s/i, ' ')
    .trim();
}

function resolveEdition(casing: string, edition: string): string {
  if (casing === 'SteelBook') return 'SteelBook';
  if (casing === 'DigiPack') return 'DigiPack';
  if (edition) {
    const lower = edition.toLowerCase();
    if (lower.includes('steelbook')) return 'SteelBook';
    if (lower.includes("collector")) return "Collector's";
    if (lower.includes('standard')) return 'Standard';
    if (lower.includes('edition')) return 'Special Edition';
    return edition.split(',')[0].trim();
  }
  return 'Standard';
}

function parseDateText(text: string): string | null {
  if (!text) return null;
  const date = new Date(text);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return null;
}

interface RawMovie {
  id: number;
  casing: string;
  title: string;
  edition: string;
  extended: string;
  studio: string;
  year: string;
  releasedate: string;
  title_keywords: string;
}

interface DetailPageData {
  price: number | null;
  retailers: Retailer[];
  specs: DiscSpecs | null;
  year: string | null;
  runtime: string | null;
  mpaaRating: string | null;
  imdbUrl: string | null;
  imdbRating: number | null;
}

export async function scrapeBluRayReleases(): Promise<Release[]> {
  try {
    const releases = await scrapeBluRayDotCom();
    if (releases.length > 0) {
      console.log(`[Scraper] Fetched ${releases.length} releases from blu-ray.com`);
      return releases;
    }
  } catch (err) {
    console.error('[Scraper] Failed to scrape blu-ray.com:', err);
  }

  console.log('[Scraper] Using fallback release data');
  return getFallbackReleases();
}

async function scrapeBluRayDotCom(): Promise<Release[]> {
  // Build list of month URLs to scrape: January through December of current year
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthUrls: string[] = [];

  for (let month = 1; month <= 12; month++) {
    monthUrls.push(`https://www.blu-ray.com/movies/releasedates.php?year=${currentYear}&month=${month}&4k=1`);
  }

  console.log(`[Scraper] Fetching ${monthUrls.length} months (1-12/${currentYear})...`);

  // Fetch all month pages
  const rawMovies: RawMovie[] = [];
  const seenMovieIds = new Set<number>();

  for (let i = 0; i < monthUrls.length; i++) {
    try {
      const response = await fetch(monthUrls[i], {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[Scraper] HTTP ${response.status} for month ${i + 1}`);
        continue;
      }

      const html = await response.text();
      const moviePattern = /movies\[\d+\]\s*=\s*\{([^}]+)\}/g;
      let match;

      while ((match = moviePattern.exec(html)) !== null) {
        try {
          const obj = parseMovieObject(match[1]);
          if (obj && !seenMovieIds.has(obj.id)) {
            seenMovieIds.add(obj.id);
            rawMovies.push(obj);
          }
        } catch {
          // Skip malformed entries
        }
      }

      console.log(`[Scraper] Month ${i + 1}: found ${seenMovieIds.size} total releases so far`);

      // Rate limit between month fetches
      if (i < monthUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`[Scraper] Failed to fetch month ${i + 1}:`, err);
    }
  }

  if (rawMovies.length === 0) {
    throw new Error('No movie entries found across any month pages');
  }

  // Build initial releases
  const releases: Release[] = [];
  const seenIds = new Set<string>();

  for (const movie of rawMovies) {
    const releaseDate = parseDateText(movie.releasedate);
    if (!releaseDate) continue;

    const title = cleanTitle(movie.title);
    if (!title) continue;

    const id = `bluray-${movie.id}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const coverArt = `${COVER_BASE}${movie.id}_large.jpg`;
    const edition = resolveEdition(movie.casing, movie.edition);
    const detailUrl = `${BLU_RAY_MOVIE_BASE}${movie.title_keywords}-Blu-ray/${movie.id}/`;

    // Default: link to blu-ray.com detail page (always valid)
    const defaultRetailers: Retailer[] = [
      { name: 'Blu-ray.com', url: detailUrl, price: null },
    ];

    releases.push({
      id,
      title,
      coverArt,
      releaseDate,
      studio: decodeHtmlEntities(movie.studio),
      edition,
      price: null,
      retailers: defaultRetailers,
      specs: null,
      year: movie.year || null,
      runtime: null,
      mpaaRating: null,
      imdbUrl: null,
      imdbRating: null,
      addedAt: new Date().toISOString(),
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Fetch detail pages in batches for pricing and real buy links
  const studioRetailersToFetch: Array<{ retailer: Retailer; releaseId: string }> = [];
  console.log(`[Scraper] Fetching pricing for ${releases.length} releases...`);
  for (let i = 0; i < releases.length; i += BATCH_SIZE) {
    const batch = releases.slice(i, i + BATCH_SIZE);
    const rawBatch = rawMovies.filter(m => batch.some(r => r.id === `bluray-${m.id}`));

    const detailPromises = rawBatch.map(movie => {
      const detailUrl = `${BLU_RAY_MOVIE_BASE}${movie.title_keywords}-Blu-ray/${movie.id}/`;
      return fetchDetailPage(detailUrl, movie.id, cleanTitle(movie.title)).catch(() => null);
    });

    const details = await Promise.all(detailPromises);

    for (let j = 0; j < rawBatch.length; j++) {
      const detail = details[j];
      if (!detail) continue;

      const release = releases.find(r => r.id === `bluray-${rawBatch[j].id}`);
      if (!release) continue;

      release.price = detail.price;
      // Insert studio store link (with price) before the Blu-ray.com link
      const studioRetailer = getStudioRetailer(release.studio, release.title);
      if (studioRetailer) {
        studioRetailersToFetch.push({ retailer: studioRetailer, releaseId: release.id });
        const blurayIdx = detail.retailers.findIndex(r => r.name === 'Blu-ray.com');
        if (blurayIdx > -1) {
          detail.retailers.splice(blurayIdx, 0, studioRetailer);
        } else {
          detail.retailers.push(studioRetailer);
        }
      }
      release.retailers = detail.retailers;
      release.specs = detail.specs;
      release.year = detail.year || release.year;
      release.runtime = detail.runtime;
      release.mpaaRating = detail.mpaaRating;
      release.imdbUrl = detail.imdbUrl;
      release.imdbRating = detail.imdbRating;
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < releases.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const pricedCount = releases.filter(r => r.price !== null).length;
  console.log(`[Scraper] Found pricing for ${pricedCount}/${releases.length} releases`);

  // Fetch studio store prices in batches
  if (studioRetailersToFetch.length > 0) {
    console.log(`[Scraper] Fetching ${studioRetailersToFetch.length} studio store prices...`);
    for (let i = 0; i < studioRetailersToFetch.length; i += BATCH_SIZE) {
      const batch = studioRetailersToFetch.slice(i, i + BATCH_SIZE);
      const pricePromises = batch.map(({ retailer }) =>
        fetchStorePrice(retailer.url).catch(() => null)
      );
      const prices = await Promise.all(pricePromises);

      for (let j = 0; j < batch.length; j++) {
        const { retailer, releaseId } = batch[j];
        const release = releases.find(r => r.id === releaseId);
        if (!release) continue;

        const storeR = release.retailers.find(r => r.name === retailer.name);
        if (!storeR) continue;

        if (prices[j] !== null) {
          // Got a real price from the store
          storeR.price = prices[j];
          retailer.price = prices[j];
        } else if (release.price) {
          // Couldn't scrape store price (JS-rendered page), use Amazon price as reference
          storeR.price = release.price;
          retailer.price = release.price;
        }
      }

      if (i + BATCH_SIZE < studioRetailersToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    const storePricedCount = studioRetailersToFetch.filter(s => s.retailer.price !== null).length;
    console.log(`[Scraper] Found ${storePricedCount}/${studioRetailersToFetch.length} studio store prices`);
  }

  return releases;
}

async function fetchDetailPage(url: string, movieId: number, title: string): Promise<DetailPageData> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return { price: null, retailers: buildFallbackRetailers(url, title), specs: null, year: null, runtime: null, mpaaRating: null, imdbUrl: null, imdbRating: null };
  }

  const html = await response.text();
  const retailers: Retailer[] = [];
  let price: number | null = null;

  // Parse the Price section
  // Pattern: <span class="subheading">Price</span><br>
  // Then either: Amazon: <a href="...">$XX.XX</a>
  // Or: Buy on: <eBay link>
  const priceSection = html.match(/subheading">Price<\/span>[\s\S]*?(?=<span class="subheading">|<br\s*\/?><br\s*\/?>(?:<br|<span|<a class="noline"))/i);

  if (priceSection) {
    const section = priceSection[0];

    // Check for Amazon price: Amazon: <a href="..."><b>$44.99</b></a>
    const amazonPriceMatch = section.match(/Amazon:\s*<a[^>]*href="([^"]*)"[^>]*>.*?\$(\d+\.?\d*)/);
    if (amazonPriceMatch) {
      const amazonPrice = parseFloat(amazonPriceMatch[2]);
      price = amazonPrice;
      retailers.push({
        name: 'Amazon',
        url: amazonPriceMatch[1],
        price: amazonPrice,
      });
    }

    // Check for "New from" price (sometimes different from Amazon)
    const newFromMatch = section.match(/New from:\s*<a[^>]*href="([^"]*)"[^>]*>.*?\$(\d+\.?\d*)/);
    if (newFromMatch && !amazonPriceMatch) {
      price = parseFloat(newFromMatch[2]);
    }

    // Check for eBay link
    const ebayMatch = section.match(/<a[^>]*href="(https:\/\/www\.ebay\.com[^"]*)"[^>]*>/);
    if (ebayMatch) {
      retailers.push({
        name: 'eBay',
        url: ebayMatch[1],
        price: null,
      });
    }
  }

  // Check for pre-order/buy button link
  // Pattern: <a id="movie_buylink" href="...click.php?p=...">
  const buyLinkMatch = html.match(/<a\s+id="movie_buylink"\s+href="([^"]*)"/);
  if (buyLinkMatch && !retailers.some(r => r.name === 'Amazon')) {
    // The buy link typically goes to Amazon via blu-ray.com redirect
    retailers.push({
      name: 'Pre-order',
      url: buyLinkMatch[1],
      price,
    });
  }

  // If available on Amazon, add search links for other major retailers
  if (retailers.some(r => r.name === 'Amazon') || retailers.some(r => r.name === 'Pre-order')) {
    const q = encodeURIComponent(title + ' 4K UHD Blu-ray');
    retailers.push(
      { name: 'Search Walmart', url: `https://www.walmart.com/search?q=${q}`, price: null },
      { name: 'Search Best Buy', url: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(title + ' 4K UHD')}`, price: null },
      { name: 'Search Target', url: `https://www.target.com/s?searchTerm=${q}`, price: null },
    );
  }

  // Always add the Blu-ray.com detail page as a retailer
  retailers.push({
    name: 'Blu-ray.com',
    url: url,
    price: null,
  });

  // Parse disc specs
  const specs = parseDiscSpecs(html);

  // Parse year, runtime, and MPAA rating from the info line
  // Pattern: Studio | Year | Runtime | Rating | Release Date
  let year: string | null = null;
  let runtime: string | null = null;
  let mpaaRating: string | null = null;

  const runtimeMatch = html.match(/<span id="runtime"[^>]*>(\d+ min)<\/span>/);
  if (runtimeMatch) {
    runtime = runtimeMatch[1];
  }

  // MPAA rating appears as "Rated R", "Rated PG-13", "Not rated", etc.
  const mpaaMatch = html.match(/(Rated [A-Z0-9-]+|Not rated)/);
  if (mpaaMatch) {
    mpaaRating = mpaaMatch[1];
  }

  // Year from the info line
  const yearMatch = html.match(/movies\.php\?year=(\d{4})/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Parse IMDb link and rating
  let imdbUrl: string | null = null;
  let imdbRating: number | null = null;

  const imdbMatch = html.match(/href="(https:\/\/www\.imdb\.com\/title\/[^"]+)"/);
  if (imdbMatch) {
    imdbUrl = imdbMatch[1];
  }

  // Rating is in onmouseout handlers: onmouseout="...innerHTML = '7.4'..."
  const ratingMatch = html.match(/onmouseout="[^"]*innerHTML\s*=\s*'(\d+\.?\d*)'/);
  if (ratingMatch) {
    const rating = parseFloat(ratingMatch[1]);
    if (rating > 0 && rating <= 10) {
      imdbRating = rating;
    }
  }

  return { price, retailers, specs, year, runtime, mpaaRating, imdbUrl, imdbRating };
}

const STUDIO_STORES: Record<string, { name: string; searchUrl: (title: string) => string }> = {
  'Criterion': {
    name: 'Criterion',
    searchUrl: (title) => `https://www.criterion.com/search?q=${encodeURIComponent(title)}`,
  },
  'Arrow': {
    name: 'Arrow Video',
    searchUrl: (title) => `https://www.arrowvideo.com/search?q=${encodeURIComponent(title)}`,
  },
  'Kino Lorber': {
    name: 'Kino Lorber',
    searchUrl: (title) => `https://www.kinolorber.com/search?q=${encodeURIComponent(title)}`,
  },
  'Shout Factory': {
    name: 'Shout! Factory',
    searchUrl: (title) => `https://gruv.com/search?q=${encodeURIComponent(title + ' 4K')}`,
  },
  'Lionsgate': {
    name: 'Lionsgate',
    searchUrl: (title) => `https://www.lionsgate.com/search?q=${encodeURIComponent(title)}`,
  },
  'MUBI': {
    name: 'MUBI',
    searchUrl: (title) => `https://mubi.com/en/search?query=${encodeURIComponent(title)}`,
  },
  'Vinegar Syndrome': {
    name: 'Vinegar Syndrome',
    searchUrl: (title) => `https://vinegarsyndrome.com/search?q=${encodeURIComponent(title)}`,
  },
};

function getStudioRetailer(studio: string, title: string): Retailer | null {
  for (const [key, store] of Object.entries(STUDIO_STORES)) {
    if (studio.toLowerCase().includes(key.toLowerCase())) {
      return { name: store.name, url: store.searchUrl(title), price: null };
    }
  }
  return null;
}

async function fetchStorePrice(searchUrl: string): Promise<number | null> {
  const response = await fetch(searchUrl, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return null;

  const html = await response.text();

  // Pattern 1: JSON-LD structured data (e.g. {"price": "35.99"} or {"price": 3599})
  const jsonLdMatch = html.match(/"price"\s*:\s*"?(\d+\.?\d*)"?(?:,|\s|\})/);
  if (jsonLdMatch) {
    const val = parseFloat(jsonLdMatch[1]);
    // If price looks like cents (> 500), convert to dollars
    return val > 500 ? val / 100 : val;
  }

  // Pattern 2: Dollar amount with decimals ($XX.XX)
  // Look near 4K/UHD mentions first for relevance
  const priceNear4K = html.match(/4K[^$]{0,100}?\$(\d+\.\d{2})/i) || html.match(/\$(\d+\.\d{2})[^<]{0,100}?4K/i);
  if (priceNear4K) return parseFloat(priceNear4K[1]);

  // Pattern 3: All explicit dollar prices on the page
  const allPrices = [...html.matchAll(/\$(\d+\.\d{2})/g)].map(m => parseFloat(m[1]));
  const validPrices = allPrices.filter(p => p >= 10 && p <= 200);
  if (validPrices.length > 0) return validPrices[0];

  return null;
}

function parseDiscSpecs(html: string): DiscSpecs | null {
  try {
    const getSection = (heading: string): string => {
      // Match: <span class="subheading">Heading</span><br> ... until next <span class="subheading"> or </td>
      const pattern = new RegExp(
        `subheading">${heading}</span>\\s*<br\\s*/?>([\\s\\S]*?)(?=<span class="subheading">|</td>)`,
        'i'
      );
      const match = html.match(pattern);
      if (!match) return '';
      let section = match[1];
      // Only take the "short" version if both short and long exist
      const shortMatch = section.match(/<div id="short\w+">([\s\S]*?)<\/div>/i);
      if (shortMatch) {
        section = shortMatch[1];
      }
      // Clean HTML tags and decode entities
      return section
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
        .trim();
    };

    const splitLines = (text: string): string[] =>
      text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.includes('(less)') && !l.includes('(more)') && l !== '&nbsp;');

    const videoText = getSection('Video');
    const audioText = getSection('Audio');
    const subtitlesText = getSection('Subtitles');
    const discsText = getSection('Discs');
    const packagingText = getSection('Packaging');
    const playbackText = getSection('Playback');

    // Only return specs if we got at least video info
    if (!videoText) return null;

    return {
      video: splitLines(videoText),
      audio: splitLines(audioText),
      subtitles: subtitlesText.replace(/\n/g, ', ').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim() || 'None',
      discs: splitLines(discsText),
      packaging: splitLines(packagingText).join(', ') || 'Standard',
      playback: splitLines(playbackText),
    };
  } catch {
    return null;
  }
}

function buildFallbackRetailers(detailUrl: string, title: string): Retailer[] {
  return [{ name: 'Blu-ray.com', url: detailUrl, price: null }];
}

function parseMovieObject(inner: string): RawMovie | null {
  const get = (key: string): string => {
    const strMatch = inner.match(new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
    if (strMatch) return strMatch[1];

    const dblMatch = inner.match(new RegExp(`${key}:\\s*"([^"]*)"`));
    if (dblMatch) return dblMatch[1];

    const numMatch = inner.match(new RegExp(`${key}:\\s*(\\d+)`));
    if (numMatch) return numMatch[1];

    return '';
  };

  const idStr = get('id');
  if (!idStr) return null;

  return {
    id: parseInt(idStr, 10),
    casing: get('casing'),
    title: get('title').replace(/\\'/g, "'"),
    edition: get('edition').replace(/\\'/g, "'"),
    extended: get('extended').replace(/\\'/g, "'"),
    studio: get('studio').replace(/\\'/g, "'"),
    year: get('year'),
    releasedate: get('releasedate'),
    title_keywords: get('title_keywords'),
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function getFallbackReleases(): Release[] {
  const today = new Date();
  const upcoming = (daysFromNow: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  };

  const titles: Array<{
    title: string; studio: string; edition: string;
    daysFromNow: number; poster: string;
  }> = [
    { title: 'Interstellar', studio: 'Paramount', edition: 'SteelBook', daysFromNow: -5, poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
    { title: 'The Dark Knight', studio: 'Warner Bros.', edition: 'Standard', daysFromNow: -2, poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911BTUgME1O46gA.jpg' },
    { title: 'Dune: Part Two', studio: 'Warner Bros.', edition: 'SteelBook', daysFromNow: 2, poster: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nez7S.jpg' },
    { title: 'Oppenheimer', studio: 'Universal', edition: "Collector's", daysFromNow: 3, poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  ];

  return titles.map(t => ({
    id: slugify(t.title) + '-' + upcoming(t.daysFromNow),
    title: t.title,
    coverArt: t.poster,
    releaseDate: upcoming(t.daysFromNow),
    studio: t.studio,
    edition: t.edition,
    price: null,
    retailers: [{ name: 'Blu-ray.com', url: 'https://www.blu-ray.com/movies/releasedates.php?4k=1', price: null }],
    specs: null,
    year: null,
    runtime: null,
    mpaaRating: null,
    imdbUrl: null,
    imdbRating: null,
    addedAt: new Date().toISOString(),
    status: 'upcoming' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
