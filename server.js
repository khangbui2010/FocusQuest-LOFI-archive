const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const DOCS_DIR = path.join(__dirname, 'docs');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.static(DOCS_DIR));

app.get('/', (req, res) => {
  const indexPath = path.join(DOCS_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  let catalog = { schemaVersion: 1, updatedAt: '', tracks: [] };
  const tracksJsonPath = path.join(DOCS_DIR, 'tracks.json');
  try {
    catalog = JSON.parse(fs.readFileSync(tracksJsonPath, 'utf8'));
  } catch {
    // Fallback to empty catalog if tracks.json is missing or invalid
  }

  const tracks = Array.isArray(catalog.tracks) ? catalog.tracks : [];
  const rows = tracks
    .map((track) => {
      const fileUrl = `/tracks/${encodeURIComponent(track.file || '')}`;
      const metaUrl = `/meta/${encodeURIComponent(track.id || '')}.json`;
      const duration = Number.isFinite(track.durationSec)
        ? `${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, '0')}`
        : '';
      return `
        <tr>
          <td>${escapeHtml(track.title || '')}</td>
          <td>${escapeHtml(track.artist || '')}</td>
          <td>${escapeHtml(track.album || '')}</td>
          <td>${escapeHtml(duration)}</td>
          <td><a href="${escapeHtml(track.licenseUrl || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(track.license || '')}</a></td>
          <td><audio controls preload="none" src="${fileUrl}"></audio></td>
          <td><a href="${fileUrl}">audio</a> · <a href="${metaUrl}">meta</a></td>
        </tr>`;
    })
    .join('\n');

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FocusQuest LOFI Archive</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1040px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.5; }
    h1 { margin-bottom: 0.25rem; }
    .meta { color: #555; margin-bottom: 1.5rem; }
    .links { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    th, td { text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid #e5e5e5; vertical-align: middle; }
    th { font-weight: 600; background: #fafafa; }
    audio { height: 32px; max-width: 240px; }
  </style>
</head>
<body>
  <h1>FocusQuest LOFI Archive</h1>
  <p class="meta">Catalog schema v${escapeHtml(catalog.schemaVersion ?? 1)} · Updated ${escapeHtml(catalog.updatedAt || 'N/A')} · ${tracks.length} tracks</p>
  <div class="links">
    <a href="/tracks.json">tracks.json</a>
    <a href="/LICENSES.md">LICENSES.md</a>
  </div>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Artist</th>
        <th>Album</th>
        <th>Duration</th>
        <th>License</th>
        <th>Preview</th>
        <th>Files</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`);
});

app.listen(PORT, HOST, () => {
  console.log(`FocusQuest LOFI Archive listening on http://${HOST}:${PORT}`);
});
