const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { dbReady } = require('../config/db');
const { requireEditCode } = require('./editCode');

const router = express.Router();

// Uploaded photos and videos live in the SAME MongoDB as the page
// itself, in a GridFS bucket named "media" — no third-party storage,
// no extra accounts, no extra environment variables.
//
// Per-file cap: 100 MB (MAX_FILE_BYTES below). Honest limit: an Atlas
// free-tier cluster holds 512 MB in total, so this suits photos and
// short clips. Long or large videos belong on YouTube / Google Drive
// via paste-a-link, which the page also supports.
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const BUCKET_NAME = 'media';

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    const err = new Error('Only image and video files can be uploaded.');
    err.status = 400;
    return cb(err);
  },
});

function storeFile(file) {
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(file.originalname || 'upload', {
      contentType: file.mimetype,
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(file.buffer);
  });
}

// POST /api/media — upload one photo or video. Requires the edit code
// (header: x-edit-code), exactly like saving the page. The block on the
// page stores only the returned URL.
router.post('/media', requireEditCode, (req, res) => {
  if (!dbReady()) {
    return res
      .status(503)
      .json({ error: 'Database unavailable — the upload could not be saved.' });
  }
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'That file is over the 100 MB upload limit.' });
      }
      return res
        .status(err.status || 400)
        .json({ error: err.message || 'The upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was sent with the upload.' });
    }
    try {
      const id = await storeFile(req.file);
      return res.status(201).json({ id: String(id), url: `/api/media/${id}` });
    } catch (storeErr) {
      console.error(storeErr);
      return res.status(500).json({ error: 'The upload could not be saved.' });
    }
  });
});

// Parse a single-range "Range: bytes=..." header against the file size.
// Returns null (no/inapplicable range — serve the whole file),
// 'invalid' (malformed or unsatisfiable — answer 416), or { start, end }
// with inclusive bounds.
function parseRange(header, total) {
  if (!header || total === 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null; // multi-range or foreign unit — serve whole file
  const [, first, last] = match;
  if (first === '' && last === '') return 'invalid';
  let start;
  let end;
  if (first === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(last);
    if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid';
    start = Math.max(total - suffix, 0);
    end = total - 1;
  } else {
    start = Number(first);
    end = last === '' ? total - 1 : Math.min(Number(last), total - 1);
    if (!Number.isFinite(start) || start >= total || end < start) return 'invalid';
  }
  return { start, end };
}

// GET /api/media/:id — public, like the page itself: anyone who can see
// the page can see its photos and videos. Supports HTTP Range requests
// so <video> playback and seeking work in browsers.
router.get('/media/:id', async (req, res) => {
  const { ObjectId } = mongoose.mongo;
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  if (!dbReady()) {
    return res
      .status(503)
      .json({ error: 'Database unavailable — media cannot be loaded right now.' });
  }
  const id = new ObjectId(req.params.id);
  try {
    const files = await bucket().find({ _id: id }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'Media not found.' });
    }
    const file = files[0];
    const total = file.length;
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    const range = parseRange(req.get('range'), total);
    if (range === 'invalid') {
      res.set('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
    if (range) {
      res.status(206);
      res.set('Content-Range', `bytes ${range.start}-${range.end}/${total}`);
      res.set('Content-Length', String(range.end - range.start + 1));
      // GridFS download streams take an exclusive end.
      const stream = bucket().openDownloadStream(id, {
        start: range.start,
        end: range.end + 1,
      });
      stream.on('error', (streamErr) => {
        console.error(streamErr);
        if (!res.headersSent) res.status(500).json({ error: 'Media could not be loaded.' });
        else res.destroy();
      });
      return stream.pipe(res);
    }
    res.set('Content-Length', String(total));
    const stream = bucket().openDownloadStream(id);
    stream.on('error', (streamErr) => {
      console.error(streamErr);
      if (!res.headersSent) res.status(500).json({ error: 'Media could not be loaded.' });
      else res.destroy();
    });
    return stream.pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Media could not be loaded.' });
  }
});

module.exports = router;
