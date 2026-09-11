// Decorate display text only. Original glyphs remain in textContent so existing
// UI observers, labels and game checks read exactly the same string.
(() => {
  'use strict';
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','INPUT','TEXTAREA','OPTION','SVG','CANVAS']);
  const SKIP_CLASSES = [
    'icon-fallback','character-emoji-fallback','character-visual','comment-picture',
    'comment-drawing','mg-food-picture','care-icon','scenery-picture','display-icon','display-source',
  ];

  // Include complete modifiers, joins, flags and keycaps before asking the
  // resolver. A known component never substitutes for an unknown whole glyph.
  // U+E000 is the app's display-only marker for the current actor illustration.
  function emojiRegex() {
    return /\uE000|\p{Regional_Indicator}{2}|[#*0-9][\uFE0E\uFE0F]?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)*/gu;
  }
  function matches(text) {
    return Array.from(text.matchAll(emojiRegex())).filter(match => !/^[©®]\uFE0E?$/.test(match[0]));
  }
  function tokens(text) {
    return matches(String(text ?? '')).map(match => match[0]);
  }

  function create({document, iconHTML}) {
    const installations = new WeakMap();

    function excluded(element) {
      if (element.nodeType !== 1) return false;
      if (SKIP_TAGS.has(element.nodeName.toUpperCase())) return true;
      if (SKIP_CLASSES.some(name => element.classList.contains(name))) return true;
      const editable = element.getAttribute('contenteditable');
      return element.isContentEditable || (editable !== null && editable.toLowerCase() !== 'false');
    }
    function excludedAncestor(node) {
      for (let ancestor = node; ancestor; ancestor = ancestor.parentNode) {
        if (excluded(ancestor)) return true;
      }
      return false;
    }
    function stripVisualText(node) {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3 || (child.nodeType === 1 && child.classList.contains('icon-fallback'))) {
          node.removeChild(child);
        } else stripVisualText(child);
      }
    }
    function illustration(emoji) {
      const html = iconHTML(emoji);
      if (typeof html !== 'string' || !/^\s*<(?:span|img|svg|i)\b/i.test(html)) return null;
      const visual = document.createElement('span');
      // Only trusted resolver markup enters the parser. Surrounding UI text is
      // copied through createTextNode, including any literal HTML characters.
      visual.innerHTML = html;
      stripVisualText(visual);
      if (!visual.firstChild) return null;
      const wrapper = document.createElement('span');
      wrapper.className = 'display-icon';
      const source = document.createElement('span');
      source.className = 'display-source'; source.hidden = true; source.textContent = emoji;
      wrapper.appendChild(source);
      while (visual.firstChild) wrapper.appendChild(visual.firstChild);
      return wrapper;
    }
    function decorate(node) {
      const text = node.nodeValue;
      const found = matches(text);
      if (!found.length) return;
      const fragment = document.createDocumentFragment();
      let end = 0, changed = false;
      for (const match of found) {
        const wrapper = illustration(match[0]);
        if (!wrapper) continue;
        if (match.index > end) fragment.appendChild(document.createTextNode(text.slice(end, match.index)));
        fragment.appendChild(wrapper);
        end = match.index + match[0].length; changed = true;
      }
      if (!changed || !node.parentNode || node.nodeValue !== text) return;
      if (end < text.length) fragment.appendChild(document.createTextNode(text.slice(end)));
      node.parentNode.replaceChild(fragment, node);
    }
    function walk(node) {
      if (node.nodeType === 3) { decorate(node); return; }
      if (![1, 9, 11].includes(node.nodeType) || excluded(node)) return;
      for (const child of Array.from(node.childNodes)) walk(child);
    }
    function install(root = document.body) {
      if (!root || typeof root.nodeType !== 'number') return () => {};
      if (installations.has(root)) return installations.get(root);
      const scan = node => {
        if ((node === root || root.contains(node)) && !excludedAncestor(node)) walk(node);
      };
      scan(root);
      const Observer = document.defaultView?.MutationObserver || globalThis.MutationObserver;
      const observer = typeof Observer === 'function' ? new Observer(records => {
        const pending = new Set();
        for (const record of records) {
          if (record.type === 'characterData') pending.add(record.target);
          else if (record.type === 'childList') for (const node of record.addedNodes) pending.add(node);
        }
        // A newly inserted parent already covers its children. Only affected
        // branches are walked; unrelated UI and retired nodes are left alone.
        candidates: for (const node of pending) {
          for (let ancestor = node.parentNode; ancestor; ancestor = ancestor.parentNode) {
            if (pending.has(ancestor)) continue candidates;
          }
          scan(node);
        }
      }) : null;
      observer?.observe(root, {childList:true, characterData:true, subtree:true});
      const stop = () => { observer?.disconnect(); installations.delete(root); };
      installations.set(root, stop);
      return stop;
    }
    return {install, tokens};
  }
  globalThis.NaotocchiDisplayIllustrations = {create, tokens};
})();
