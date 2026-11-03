const { createHash } = require('node:crypto');

// bump-versions uses dated SHA-1/8; production publishing also uses SHA-256/12.
// Recompute from bytes: accepting a token's shape alone would miss stale assets.
function expectedAssetToken(token, bytes) {
  if (bytes == null) return null;
  const dated = /^(\d{8})-[0-9a-f]{8}$/.exec(token);
  if (dated) return `${dated[1]}-${createHash('sha1').update(bytes).digest('hex').slice(0, 8)}`;
  if (/^[0-9a-f]{12}$/.test(token)) return createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  return null;
}

module.exports = { expectedAssetToken };
