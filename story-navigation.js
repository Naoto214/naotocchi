// Game-only navigation around the approved reader; no manuscript or bookmark changes.
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('from') !== 'game') return;
  const cover = document.querySelector('.title-page');
  if (!cover) return;
  const back = document.createElement('a');
  back.href = '../../../index.html';
  back.textContent = 'ゲームにもどる';
  back.style.cssText = 'position:absolute;top:12px;left:0;display:flex;align-items:center;min-height:44px;font-size:13px;letter-spacing:.04em;color:var(--title);';
  cover.style.position = 'relative';
  cover.prepend(back);

  // A fresh entrance starts at the cover. Reload/back keep the reader's own
  // restoration behavior; its persistent bookmark still powers “続きから読む”.
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation?.type === 'navigate' && !history.state?.whiteReader) {
    try {
      history.replaceState({ ...history.state, whiteReader: { index: '0', offset: 0, top: true, hash: '#top' } }, '');
    } catch (_) { /* The reader remains usable if history state is unavailable. */ }
  }
})();
