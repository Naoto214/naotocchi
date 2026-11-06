// Game-only navigation around the approved reader; no manuscript or bookmark changes.
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('from') !== 'game') return;
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) return;
  const back = document.createElement('a');
  back.href = '../../../index.html';
  back.textContent = 'ホームにもどる';
  back.style.cssText = 'display:inline-flex;align-items:center;min-height:44px;padding:0 6px;white-space:nowrap;font-size:13px;color:var(--title);';
  toolbar.prepend(back);

  // A fresh entrance starts at the cover. Reload/back keep the reader's own
  // restoration behavior; its persistent bookmark still powers “続きから読む”.
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation?.type === 'navigate' && !history.state?.whiteReader) {
    try {
      history.replaceState({ ...history.state, whiteReader: { index: '0', offset: 0, top: true, hash: '#top' } }, '');
    } catch (_) { /* The reader remains usable if history state is unavailable. */ }
  }
})();
