'use strict';

// An unmodified V9 controller is the control until a pixel-equivalent candidate
// wins the active-pose comparison. The V10 entry owns its separate file.
function patchRender(source) {
  return source;
}

module.exports = {patchRender};
