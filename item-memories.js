// Saved memories render only their snapshot: no live pet resolver or bitmap in saves.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiItemMemories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const kinds = {letters:'てがみ', specials:'おでかけ'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

  function environmentText(record) {
    const env = record.environment || {}, labels = record.environmentLabels || {};
    return ['time','weather','season','region'].map(key => labels[key] || env[key] || '記録なし').join(' → ');
  }

  function memoryCard(kind, record) {
    return `<article class="item-memory-card">
      <p>${esc(record.text || record.label || '思い出')}</p>
      ${record.age != null ? `<p>${esc(record.age)}さい${record.capturedAt ? '・' + esc(record.capturedAt) : ''}</p>` : ''}
      ${record.environment ? `<p class="item-memory-environment">${esc(environmentText(record))}</p>` : ''}
      ${record.partner?.label ? `<p>いっしょに：${esc(record.partner.label)}</p>` : ''}
    </article>`;
  }

  function render(memories) {
    return Object.entries(kinds).map(([kind, label]) => {
      const cards = (memories[kind] || []).map(record => memoryCard(kind, record)).join('');
      return `<section class="item-memory-section"><h3>${label}</h3>${cards || '<p>まだ思い出はありません</p>'}</section>`;
    }).join('');
  }

  return {render, environmentText};
});
