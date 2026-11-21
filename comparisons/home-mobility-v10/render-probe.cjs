'use strict';

const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// This test candidate targets the redundant reflected hidden-attribute writes
// found in V9. Equal values still enqueue DOM attribute mutations in browsers.
function patchGuideAndSelection(source) {
  let out = replaceExact(source, 'hint.hidden=!enabled||(!guide.visible()&&!walking);',
    'const hide=!enabled||(!guide.visible()&&!walking);if(hint.hidden!==hide)hint.hidden=hide;');
  out = replaceExact(out, 'if(slot)slot.hidden=hint.hidden;',
    'if(slot&&slot.hidden!==hint.hidden)slot.hidden=hint.hidden;');
  return replaceExact(out, "selectedLabel.hidden=!chosen||!enabled;selectedLabel.textContent=chosen?(rows.get(chosen.key)?.label||chosen.id):'';",
    `const hideLabel=!chosen||!enabled,label=chosen?(rows.get(chosen.key)?.label||chosen.id):'';
      if(selectedLabel.hidden!==hideLabel)selectedLabel.hidden=hideLabel;
      if(selectedLabel.textContent!==label)selectedLabel.textContent=label;`);
}

module.exports = {patchGuideAndSelection};
