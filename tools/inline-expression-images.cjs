// Sharp renders SVG buffers without a document URL. Embed local food artwork
// so offline placement checks measure the same complete mark as the browser.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function inlineExpressionImages(svg) {
  return svg.replace(/href="(assets\/marks\/hunger\/[a-z]+\.svg)"/g, (_match, asset) =>
    `href="data:image/svg+xml;base64,${fs.readFileSync(path.join(__dirname,'..',asset)).toString('base64')}"`);
};
