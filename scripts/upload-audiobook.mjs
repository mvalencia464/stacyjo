#!/usr/bin/env node
/**
 * Uploads the audiobook to the private R2 bucket: all 22 MP3s, plus one ZIP of every track.
 *
 *   node scripts/upload-audiobook.mjs [folder] [--dry-run]
 *
 * - folder: where the MP3s are (searched recursively, so Part 1 / Part 2 subfolders are fine).
 *   Defaults to src/resources.
 * - Files are matched by their leading track number (01–22), so "01 Opening Credits.mp3" and
 *   "01 - Opening Credits.mp3" both work. Each is uploaded to the exact key the site serves,
 *   which replaces the old narration for every buyer, past and future.
 * - --dry-run checks the files and builds the ZIP, but uploads nothing.
 *
 * Needs: Node 18+, the `zip` command (built into macOS), and `npx wrangler` logged in.
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, copyFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const BUCKET = 'stacyjo-downloads';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const folder = args.find((a) => !a.startsWith('--')) ?? 'src/resources';
const wrangler = (process.env.WRANGLER_CMD ?? 'npx wrangler').split(' ');

// Read the track list from the catalog the site uses, so keys always match.
const catalog = readFileSync(new URL('../functions/lib/catalog.ts', import.meta.url), 'utf8');
const tracks = [...catalog.matchAll(/audio\('(\d{2})',\s*'([^']+)'\)/g)].map(([, n, title]) => ({
  n,
  name: `${n} - ${title}.mp3`,
  key: `audio/${n} - ${title}.mp3`,
}));
const zipKey = catalog.match(/key:\s*'(audio\/[^']+\.zip)'/)?.[1];
if (tracks.length !== 22 || !zipKey) fail(`Expected 22 tracks and a ZIP key in catalog.ts, found ${tracks.length}.`);

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function findMp3s(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return findMp3s(path);
    return /\.mp3$/i.test(entry) && !entry.startsWith('.') ? [path] : [];
  });
}

let found;
try {
  found = findMp3s(folder);
} catch {
  fail(`Can't read folder: ${folder}`);
}

// Match each track number to exactly one file.
const byNumber = new Map();
for (const path of found) {
  const n = basename(path).match(/^(\d{2})(?!\d)/)?.[1];
  if (!n) continue;
  if (byNumber.has(n)) fail(`Two files for track ${n}:\n  ${byNumber.get(n)}\n  ${path}`);
  byNumber.set(n, path);
}
const missing = tracks.filter((t) => !byNumber.has(t.n)).map((t) => t.name);
if (missing.length) fail(`Missing ${missing.length} track(s) in ${folder}:\n  ${missing.join('\n  ')}`);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
console.log(`Found all 22 tracks in ${folder}:`);
for (const t of tracks) console.log(`  ${t.n}  ${basename(byNumber.get(t.n))}  →  ${t.key}  (${mb(statSync(byNumber.get(t.n)).size)})`);

// Build the ZIP with the same clean names buyers see on the download page.
const staging = mkdtempSync(join(tmpdir(), 'leash-audio-'));
for (const t of tracks) copyFileSync(byNumber.get(t.n), join(staging, t.name));
const zipPath = join(staging, basename(zipKey));
const zipped = spawnSync('zip', ['-0', '-j', '-q', zipPath, ...tracks.map((t) => join(staging, t.name))], { stdio: 'inherit' });
if (zipped.status !== 0) fail('Could not build the ZIP (is the `zip` command installed?).');
console.log(`\nBuilt ZIP: ${basename(zipKey)} (${mb(statSync(zipPath).size)})`);

function put(file, key, type) {
  const cmd = [...wrangler, 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--content-type', type, '--remote'];
  if (dryRun) {
    console.log(`  [dry run] ${key}`);
    return;
  }
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) fail(`Upload failed for ${key}. Fix the error above and run again; finished files can be re-uploaded safely.`);
}

console.log(dryRun ? '\nDry run: nothing uploaded.' : `\nUploading to R2 bucket ${BUCKET}…`);
for (const t of tracks) put(byNumber.get(t.n), t.key, 'audio/mpeg');
put(zipPath, zipKey, 'application/zip');

console.log(dryRun
  ? '\nEverything checks out. Run again without --dry-run to upload.'
  : '\n✓ Done. All 22 tracks and the ZIP are live. Bundle buyers, past and future, now get the new narration.');
