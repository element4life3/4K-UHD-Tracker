import Database from 'better-sqlite3';
import path from 'path';
import type { Release, Retailer, DiscSpecs } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'releases.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cover_art TEXT,
      release_date TEXT NOT NULL,
      studio TEXT NOT NULL DEFAULT '',
      edition TEXT NOT NULL DEFAULT 'Standard',
      price REAL,
      specs TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retailers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      price REAL,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_releases_date ON releases(release_date);
    CREATE INDEX IF NOT EXISTS idx_retailers_release ON retailers(release_id);
  `);

  // Add columns if missing (migration for existing DBs)
  const addColIfMissing = (col: string, type: string) => {
    try { db.prepare(`SELECT ${col} FROM releases LIMIT 1`).get(); }
    catch { db.exec(`ALTER TABLE releases ADD COLUMN ${col} ${type}`); }
  };
  addColIfMissing('specs', 'TEXT');
  addColIfMissing('year', 'TEXT');
  addColIfMissing('runtime', 'TEXT');
  addColIfMissing('mpaa_rating', 'TEXT');
  addColIfMissing('imdb_url', 'TEXT');
  addColIfMissing('imdb_rating', 'REAL');
  addColIfMissing('added_at', 'TEXT');
  // Backfill added_at from created_at for existing rows
  db.exec("UPDATE releases SET added_at = created_at WHERE added_at IS NULL");
}

export function getLastUpdated(): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get('last_updated') as { value: string } | undefined;
  return row?.value ?? null;
}

export function setLastUpdated(timestamp: string) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run('last_updated', timestamp);
}

export function upsertRelease(release: Release) {
  const db = getDb();
  const specsJson = release.specs ? JSON.stringify(release.specs) : null;

  const upsert = db.prepare(`
    INSERT INTO releases (id, title, cover_art, release_date, studio, edition, price, specs, year, runtime, mpaa_rating, imdb_url, imdb_rating, added_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      cover_art = excluded.cover_art,
      release_date = excluded.release_date,
      studio = excluded.studio,
      edition = excluded.edition,
      price = excluded.price,
      specs = excluded.specs,
      year = excluded.year,
      runtime = excluded.runtime,
      mpaa_rating = excluded.mpaa_rating,
      imdb_url = excluded.imdb_url,
      imdb_rating = excluded.imdb_rating,
      updated_at = datetime('now')
  `);

  const deleteRetailers = db.prepare('DELETE FROM retailers WHERE release_id = ?');
  const insertRetailer = db.prepare('INSERT INTO retailers (release_id, name, url, price) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction((rel: Release) => {
    upsert.run(rel.id, rel.title, rel.coverArt, rel.releaseDate, rel.studio, rel.edition, rel.price, specsJson, rel.year, rel.runtime, rel.mpaaRating, rel.imdbUrl, rel.imdbRating);
    deleteRetailers.run(rel.id);
    for (const r of rel.retailers) {
      insertRetailer.run(rel.id, r.name, r.url, r.price);
    }
  });

  transaction(release);
}

export function getAllReleases(): Release[] {
  const db = getDb();
  const releases = db.prepare('SELECT * FROM releases ORDER BY release_date ASC').all() as Array<{
    id: string;
    title: string;
    cover_art: string | null;
    release_date: string;
    studio: string;
    edition: string;
    price: number | null;
    specs: string | null;
    year: string | null;
    runtime: string | null;
    mpaa_rating: string | null;
    imdb_url: string | null;
    imdb_rating: number | null;
    added_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const getRetailers = db.prepare('SELECT name, url, price FROM retailers WHERE release_id = ?');

  return releases.map(r => {
    const retailers = getRetailers.all(r.id) as Retailer[];
    let specs: DiscSpecs | null = null;
    if (r.specs) {
      try { specs = JSON.parse(r.specs); } catch { /* ignore */ }
    }
    return {
      id: r.id,
      title: r.title,
      coverArt: r.cover_art,
      releaseDate: r.release_date,
      studio: r.studio,
      edition: r.edition,
      price: r.price,
      retailers,
      specs,
      year: r.year,
      runtime: r.runtime,
      mpaaRating: r.mpaa_rating,
      imdbUrl: r.imdb_url,
      imdbRating: r.imdb_rating,
      addedAt: (r.added_at || r.created_at) + (r.added_at?.includes('Z') || r.added_at?.includes('T') ? '' : 'Z'),
      status: computeStatus(r.release_date),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

function computeStatus(releaseDate: string): Release['status'] {
  const now = new Date();
  const release = new Date(releaseDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const relDay = new Date(release.getFullYear(), release.getMonth(), release.getDate());

  const diffMs = relDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'out-now';
  if (diffDays <= 7) return 'this-week';
  if (diffDays <= 14) return 'coming-soon';
  return 'upcoming';
}

export function getReleaseCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM releases').get() as { count: number };
  return row.count;
}
