const mongoose = require('mongoose');

// One document holds the whole page: title, subtitle, the style object and
// the ordered array of blocks. Blocks and style are stored as Mixed so new
// block fields never need a migration; the route normalizes them on save.
const pageSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'My Page', maxlength: 120 },
    subtitle: { type: String, default: '', maxlength: 240 },
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
    blocks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Page || mongoose.model('Page', pageSchema);
