const crypto = require('crypto');

// The edit code is checked here on the server, the same way for every
// write operation (saving the page, uploading media). It lives only in
// the API's environment (EDIT_CODE) and never ships in the client bundle.

function codesMatch(given) {
  const expected = process.env.EDIT_CODE || '';
  if (!expected || typeof given !== 'string' || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Express middleware: 503 when editing isn't set up at all, 401 when the
// x-edit-code header doesn't match — the same responses PUT /api/page has
// always given, so saves and uploads reject a wrong code identically.
function requireEditCode(req, res, next) {
  if (!process.env.EDIT_CODE) {
    return res
      .status(503)
      .json({ error: 'Editing is not set up on the server yet (EDIT_CODE is missing).' });
  }
  if (!codesMatch(req.get('x-edit-code'))) {
    return res
      .status(401)
      .json({ error: 'That edit code did not match — your changes were not saved.' });
  }
  return next();
}

module.exports = { codesMatch, requireEditCode };
