// Retired legacy-only branches in script.js are permanently disabled.
// Dedicated reward inventory/UI/grants/consumption and the old ring phrase path are removed from behavior.
var gotReward = false;
var specialRewardTrip = false;
var firstRingPhrase = false;

// Saved memories render only their snapshot: no live pet resolver or bitmap in saves.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiItemMemories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const kinds = {photos:'しゃしん', letters:'てがみ', lights:'あかり', specials:'おでかけ', reactions:'とくべつなひとこと', tunes:'おんがく'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const assetPath = value => typeof value === 'string' && /^assets\/[\w./-]+\.(png|webp|svg)(\?[\w=.-]+)?$/.test(value) ? value : null;

  function environmentText(record) {
    const env = record.environment || {}, labels = record.environmentLabels || {};
    return ['time','weather','season','region'].map(key => labels[key] || env[key] || '記録なし').join(' → ');
  }

  function actorsHTML(record) {
    return (record.actors || []).map(actor => {
      const art = assetPath(actor.asset)
        ? `<img src="${esc(actor.asset)}" alt="${esc(actor.label)}" loading="lazy">`
        : `<span role="img" aria-label="${esc(actor.label)}">${esc(actor.emoji || '？')}</span>`;
      return `<figure class="item-photo-actor ${actor.kind === 'pet' ? 'item-photo-pet' : ''}">${art}<figcaption>${esc(actor.label)}</figcaption></figure>`;
    }).join('');
  }

  function memoryCard(kind, record) {
    const photo = kind === 'photos', tune = kind === 'tunes';
    return `<article class="item-memory-card">
      ${photo ? `<div class="item-photo-cast">${actorsHTML(record)}</div>` : ''}
      <p>${esc(record.text || record.label || '思い出')}</p>
      ${record.age != null ? `<p>${esc(record.age)}さい${record.capturedAt ? '・' + esc(record.capturedAt) : ''}</p>` : ''}
      ${record.environment ? `<p class="item-memory-environment">${esc(environmentText(record))}</p>` : ''}
      ${record.partner?.label ? `<p>いっしょに：${esc(record.partner.label)}</p>` : ''}
      ${photo || tune ? `<button type="button" data-memory-action="${photo ? 'export' : 'play'}" data-kind="${kind}" data-key="${esc(record.key)}">${photo ? 'がぞうにする' : 'きく'}</button>` : ''}
    </article>`;
  }

  function render(memories) {
    return Object.entries(kinds).map(([kind, label]) => {
      const cards = (memories[kind] || []).map(record => memoryCard(kind, record)).join('');
      return `<section class="item-memory-section"><h3>${label}</h3>${cards || '<p>まだ思い出はありません</p>'}</section>`;
    }).join('');
  }

  async function exportPhoto(record, {document, loadImage}) {
    if (!record || !Array.isArray(record.actors) || !record.actors.length) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 960; canvas.height = 720;
      const ctx = canvas.getContext?.('2d');
      if (!ctx || typeof ctx.fillRect !== 'function' || typeof canvas.toDataURL !== 'function') return null;
      const night = record.environment?.time === 'night';
      ctx.fillStyle = night ? '#252c51' : '#e8f5fb';
      ctx.fillRect(0, 0, 960, 720);
      ctx.fillStyle = ({spring:'#e9f0dc', summer:'#d7eddc', autumn:'#f4dfc4', winter:'#e7edf5'})[record.environment?.season] || '#e9f0dc';
      ctx.fillRect(0, 430, 960, 290);
      const actors = record.actors, columns = Math.min(actors.length, 6);
      const rows = Math.ceil(actors.length / columns), size = Math.min(150, 840 / columns, 370 / rows);
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i], row = Math.floor(i / columns);
        const count = Math.min(columns, actors.length - row * columns);
        const x = (960 - count * size) / 2 + (i % columns) * size;
        const y = 120 + row * Math.min(165, 370 / rows);
        const path = assetPath(actor.asset), img = path ? await loadImage(path) : null;
        if (img) ctx.drawImage(img, x, y, size, size);
        else {
          ctx.fillStyle = '#263246'; ctx.font = `${Math.min(56, size * .6)}px sans-serif`; ctx.textAlign = 'center';
          ctx.fillText(actor.emoji || '？', x + size / 2, y + size * .6);
        }
        ctx.fillStyle = '#263246'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(actor.label || ''), x + size / 2, y + size, size - 4);
      }
      ctx.fillStyle = '#fffaf1'; ctx.fillRect(24, 536, 912, 160);
      ctx.fillStyle = '#263246'; ctx.textAlign = 'left'; ctx.font = 'bold 25px sans-serif';
      ctx.fillText(`${record.age ?? '？'}さいの思い出`, 44, 577);
      ctx.font = '18px sans-serif';
      ctx.fillText(environmentText(record), 44, 615, 870);
      ctx.fillText(record.capturedAt || '', 44, 650, 870);
      return canvas.toDataURL('image/png');
    } catch (err) { return null; }
  }
  return {render, exportPhoto, environmentText};
});
