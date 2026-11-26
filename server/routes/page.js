const express = require('express');
const Page = require('../models/Page');
const { dbReady } = require('../config/db');
const { requireEditCode } = require('./editCode');

const router = express.Router();

const BLOCK_TYPES = ['heading', 'paragraph', 'photo', 'video', 'quote', 'link', 'divider'];
const WIDTHS = ['full', 'half', 'third'];
const ALIGNS = ['left', 'center', 'right'];
const THEMES = ['paper', 'clean', 'blossom', 'sage', 'midnight', 'charcoal'];
const FONTS = ['serif', 'sans', 'rounded'];
const HEADER_STYLES = ['centered', 'left', 'banner'];
const PAGE_WIDTHS = ['narrow', 'wide'];

const DEFAULT_STYLE = {
  theme: 'paper',
  accent: '#c75b21',
  font: 'serif',
  headerStyle: 'centered',
  width: 'narrow',
};

function defaultPage() {
  return {
    title: 'My Page',
    subtitle: '',
    style: { ...DEFAULT_STYLE },
    blocks: [],
  };
}

function str(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeStyle(input) {
  const s = input && typeof input === 'object' ? input : {};
  const accent =
    typeof s.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.accent.trim())
      ? s.accent.trim()
      : DEFAULT_STYLE.accent;
  return {
    theme: pick(s.theme, THEMES, DEFAULT_STYLE.theme),
    accent,
    font: pick(s.font, FONTS, DEFAULT_STYLE.font),
    headerStyle: pick(s.headerStyle, HEADER_STYLES, DEFAULT_STYLE.headerStyle),
    width: pick(s.width, PAGE_WIDTHS, DEFAULT_STYLE.width),
  };
}

function normalizeBlock(input, index) {
  if (!input || typeof input !== 'object') return null;
  if (!BLOCK_TYPES.includes(input.type)) return null;
  const block = {
    id: str(input.id, 64) || `block-${index}`,
    type: input.type,
    width: pick(input.width, WIDTHS, 'full'),
    align: pick(input.align, ALIGNS, 'left'),
  };
  // Keep only the fields each block type actually uses.
  if (input.type === 'heading') {
    block.text = str(input.text, 200);
    block.size = pick(input.size, ['large', 'medium', 'small'], 'medium');
  } else if (input.type === 'paragraph' || input.type === 'quote') {
    block.text = str(input.text, 20000);
    if (input.type === 'quote') block.attribution = str(input.attribution, 200);
  } else if (input.type === 'photo') {
    block.url = str(input.url, 2000);
    block.caption = str(input.caption, 300);
  } else if (input.type === 'video') {
    block.url = str(input.url, 2000);
    block.caption = str(input.caption, 300);
  } else if (input.type === 'link') {
    block.label = str(input.label, 120);
    block.url = str(input.url, 2000);
  }
  return block;
}

function normalizePage(input) {
  const body = input && typeof input === 'object' ? input : {};
  const rawBlocks = Array.isArray(body.blocks) ? body.blocks.slice(0, 200) : [];
  return {
    title: str(body.title, 120) || 'My Page',
    subtitle: str(body.subtitle, 240),
    style: normalizeStyle(body.style),
    blocks: rawBlocks.map(normalizeBlock).filter(Boolean),
  };
}

// GET /api/page — public. Anyone with the link can view the finished page.
router.get('/page', async (_req, res) => {
  if (!dbReady()) {
    return res.status(503).json({ error: 'Database unavailable — the page cannot be loaded right now.' });
  }
  try {
    const doc = await Page.findOne().lean();
    if (!doc) return res.json(defaultPage());
    return res.json({
      title: doc.title,
      subtitle: doc.subtitle,
      style: normalizeStyle(doc.style),
      blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load the page.' });
  }
});

// PUT /api/page — saving requires the edit code (header: x-edit-code),
// checked on the server by requireEditCode. The code never ships in the
// client bundle.
router.put('/page', requireEditCode, async (req, res) => {
  if (!dbReady()) {
    return res.status(503).json({ error: 'Database unavailable — your changes could not be saved.' });
  }
  try {
    const data = normalizePage(req.body);
    const doc = await Page.findOneAndUpdate({}, data, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean();
    return res.json({
      title: doc.title,
      subtitle: doc.subtitle,
      style: normalizeStyle(doc.style),
      blocks: doc.blocks,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save the page.' });
  }
});

module.exports = router;
