#!/usr/bin/env node
// Gộp docs/meta/<id>.json  ->  docs/tracks.json + docs/LICENSES.md
// Chạy từ thư mục gốc repo:  node scripts/build-catalog.mjs
// Tùy chọn: --skip-file-check  (chỉ dùng khi xem thử trên máy không có file mp3)
//
// Script này KHÔNG có phụ thuộc ngoài. Nếu dữ liệu sai, nó in lỗi và thoát với
// mã 1 (workflow thất bại, không commit gì).

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const META_DIR = 'docs/meta';
const TRACKS_DIR = 'docs/tracks';
const OUT_JSON = 'docs/tracks.json';
const OUT_MD = 'docs/LICENSES.md';
const SKIP_FILE_CHECK = process.argv.includes('--skip-file-check');

// Phải khớp với danh sách giấy phép mà extension chấp nhận.
const ALLOWED_LICENSES = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-3.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
]);
const MAX_TRACKS = 200;
const ALLOWED_KEYS = new Set([
  'id', 'title', 'artist', 'album', 'durationSec', 'file', 'license',
  'licenseUrl', 'sourceUrl', 'modified', 'order', 'attribution',
]);

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function isHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function nonEmptyString(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

if (!existsSync(META_DIR)) {
  console.error(`Không thấy thư mục ${META_DIR}`);
  process.exit(1);
}

const metaFiles = readdirSync(META_DIR).filter((f) => f.endsWith('.json')).sort();
const tracks = [];
const seenIds = new Set();
const seenFiles = new Set();

for (const name of metaFiles) {
  const path = join(META_DIR, name);
  let meta;
  try {
    meta = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(path, `JSON không hợp lệ (${e.message})`);
    continue;
  }
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
    err(path, 'nội dung phải là một object');
    continue;
  }

  for (const key of Object.keys(meta)) {
    if (!ALLOWED_KEYS.has(key)) err(path, `trường lạ "${key}" (sai chính tả?)`);
  }

  const expectedId = name.replace(/\.json$/, '');
  if (typeof meta.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(meta.id)) {
    err(path, 'id phải khớp ^[a-z0-9-]{1,80}$');
  } else if (meta.id !== expectedId) {
    err(path, `id "${meta.id}" phải trùng tên file (${expectedId}.json)`);
  }
  if (seenIds.has(meta.id)) err(path, `id trùng: ${meta.id}`);
  seenIds.add(meta.id);

  if (!nonEmptyString(meta.title, 200)) err(path, 'thiếu hoặc sai title');
  if (!nonEmptyString(meta.artist, 200)) err(path, 'thiếu hoặc sai artist');
  if (meta.album !== undefined && (typeof meta.album !== 'string' || meta.album.length > 200)) {
    err(path, 'album phải là chuỗi ≤ 200 ký tự');
  }
  if (!Number.isInteger(meta.durationSec) || meta.durationSec < 1 || meta.durationSec > 7200) {
    err(path, 'durationSec phải là số nguyên từ 1 đến 7200');
  }
  if (
    typeof meta.file !== 'string' ||
    !/^[A-Za-z0-9._-]{1,200}\.(mp3|ogg|m4a)$/.test(meta.file) ||
    meta.file.includes('..')
  ) {
    err(path, 'file chỉ gồm chữ/số/._- và đuôi .mp3/.ogg/.m4a, không chứa ".."');
  } else {
    if (seenFiles.has(meta.file)) err(path, `file trùng: ${meta.file}`);
    seenFiles.add(meta.file);
    if (!SKIP_FILE_CHECK && !existsSync(join(TRACKS_DIR, meta.file))) {
      err(path, `không thấy ${TRACKS_DIR}/${meta.file}`);
    }
  }
  if (!ALLOWED_LICENSES.has(meta.license)) {
    err(path, `license phải là một trong: ${[...ALLOWED_LICENSES].join(', ')}`);
  }
  if (!isHttpsUrl(meta.licenseUrl)) err(path, 'licenseUrl phải là URL https');
  if (!isHttpsUrl(meta.sourceUrl)) err(path, 'sourceUrl phải là URL https');
  if (typeof meta.modified !== 'boolean') err(path, 'modified phải là true hoặc false');
  if (meta.order !== undefined && !Number.isInteger(meta.order)) err(path, 'order phải là số nguyên');
  if (
    meta.attribution !== undefined &&
    (typeof meta.attribution !== 'string' || meta.attribution.length > 1000)
  ) {
    err(path, 'attribution phải là chuỗi ≤ 1000 ký tự');
  }

  tracks.push(meta);
}

if (tracks.length === 0) errors.push(`${META_DIR}: chưa có bài nào`);
if (tracks.length > MAX_TRACKS) errors.push(`Quá ${MAX_TRACKS} bài`);

// Cảnh báo (không làm thất bại): file mp3 không có meta tương ứng.
if (!SKIP_FILE_CHECK && existsSync(TRACKS_DIR)) {
  for (const f of readdirSync(TRACKS_DIR)) {
    if (/\.(mp3|ogg|m4a)$/.test(f) && !seenFiles.has(f)) {
      warnings.push(`${TRACKS_DIR}/${f} chưa có file meta nên sẽ KHÔNG xuất hiện trong extension`);
    }
  }
}

for (const w of warnings) console.warn(`CẢNH BÁO: ${w}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} lỗi:`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

tracks.sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.id.localeCompare(b.id));

const outTracks = tracks.map((t) => ({
  id: t.id,
  title: t.title,
  artist: t.artist,
  album: t.album ?? '',
  durationSec: t.durationSec,
  file: t.file,
  license: t.license,
  licenseUrl: t.licenseUrl,
  sourceUrl: t.sourceUrl,
  modified: t.modified,
}));

// Giữ nguyên updatedAt nếu danh sách bài không đổi (tránh commit thừa).
let updatedAt = new Date().toISOString().slice(0, 10);
if (existsSync(OUT_JSON)) {
  try {
    const old = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
    if (JSON.stringify(old.tracks) === JSON.stringify(outTracks) && typeof old.updatedAt === 'string') {
      updatedAt = old.updatedAt;
    }
  } catch {
    /* file cũ hỏng thì ghi đè */
  }
}
writeFileSync(
  OUT_JSON,
  JSON.stringify({ schemaVersion: 1, updatedAt, tracks: outTracks }, null, 2) + '\n',
);

// LICENSES.md
const lines = [];
lines.push('# Music licenses / Giấy phép và ghi công nhạc');
lines.push('');
lines.push('> File này được TẠO TỰ ĐỘNG từ `docs/meta/*.json`. Đừng sửa tay.');
lines.push('');

const byArtist = new Map();
for (const t of tracks) {
  if (!byArtist.has(t.artist)) byArtist.set(t.artist, []);
  byArtist.get(t.artist).push(t);
}
for (const [artist, list] of byArtist) {
  lines.push(`## ${artist}`);
  lines.push('');
  const attributions = [...new Set(list.map((t) => t.attribution).filter(Boolean))];
  for (const a of attributions) {
    lines.push(`> ${a.replace(/\s*\n\s*/g, ' ')}`);
    lines.push('');
  }
  lines.push('| Title | Album | License | Source | File | Modified |');
  lines.push('|---|---|---|---|---|---|');
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  for (const t of list) {
    lines.push(
      `| ${cell(t.title)} | ${cell(t.album ?? '')} | [${t.license}](${t.licenseUrl}) | [link](${t.sourceUrl}) | \`${t.file}\` | ${t.modified ? 'Yes' : 'No'} |`,
    );
  }
  lines.push('');
}
writeFileSync(OUT_MD, lines.join('\n'));

console.log(`OK: ${tracks.length} bài -> ${OUT_JSON}, ${OUT_MD}`);
