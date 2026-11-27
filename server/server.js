require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const pageRoutes = require('./routes/page');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 5000;

const clientUrl = (process.env.CLIENT_URL || '').trim();
app.use(
  cors(
    clientUrl
      ? { origin: clientUrl.split(',').map((s) => s.trim()).filter(Boolean) }
      : undefined,
  ),
);
app.use(express.json({ limit: '2mb' }));

// Health works without the database — Render can always check the service.
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Social preview card (Open Graph image). Served from the API because its
// address is known and stable, so the client's og:image tag never depends
// on the client service's own URL. Public, no auth, cache for a day.
app.get('/og-card.png', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.type('image/png');
  res.sendFile(path.join(__dirname, 'assets', 'og-card.png'));
});
app.use('/api', pageRoutes);
app.use('/api', mediaRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

function start() {
  // Connect in the background and listen right away: /api/health must
  // answer even while MongoDB is still connecting (or unreachable), and
  // the page endpoints report the database as unavailable until it's ready.
  connectDB().catch((err) => console.error('MongoDB connect error:', err.message));
  app.listen(PORT, () => console.log(`my-page-api listening on port ${PORT}`));
}

start();

module.exports = app;
