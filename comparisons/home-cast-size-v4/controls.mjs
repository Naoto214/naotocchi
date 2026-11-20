import {regions, times, roles, median, readScene} from '../shell-model.mjs';
import {projectedBody} from '../v3/shell-model.mjs';
import {readPopulationScene, sceneQuery, populationFrameURL, needsNewFrame, alphaBounds} from './shell-model.mjs';

const byId = id => document.getElementById(id);
const compact = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
const decimal = new Intl.NumberFormat('ja-JP', {minimumFractionDigits:1, maximumFractionDigits:1});
const percent = new Intl.NumberFormat('ja-JP', {maximumFractionDigits:2});
const roleFields = {pet:'hero', partner:'partner', companion:'companions'};
let scene = readPopulationScene(new URLSearchParams(location.search), readScene);
let frame = byId('home');
let ready = false;
let deadline;
let measureFrame;

function addRow(body, label, cells) {
  const row = body.insertRow();
  const head = document.createElement('th');
  head.scope = 'row';
  head.textContent = label;
  row.append(head);
  for (const text of cells) row.insertCell().textContent = text;
  return row;
}
const rows = new Map(roles.map(([kind, label]) => [kind, addRow(byId('measurements'),
  kind === 'companion' ? '仲間（中央値）' : label, ['—','—'])]));
const dimensions = (w, h) => decimal.format(w) + ' × ' + decimal.format(h);

const poseBoxes = new Map();
function spriteBox(image, asset, catalog) {
  const known = catalog?.[asset]?.box;
  if (known) return known;
  const source = image.currentSrc || image.src;
  if (!poseBoxes.has(source)) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const bitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    poseBoxes.set(source, alphaBounds(bitmap.data, bitmap.width, bitmap.height));
  }
  return poseBoxes.get(source);
}

function scheduleMeasure() {
  cancelAnimationFrame(measureFrame);
  measureFrame = requestAnimationFrame(measure);
}

function measure() {
  if (!ready || (compact.matches && !document.body.classList.contains('settings-open'))) return;
  const game = frame.contentWindow;
  const cast = game.HomeCastTrial.inspect();
  const samples = new Map(roles.map(([role]) => [role, []]));
  const individualRows = document.createElement('tbody');
  for (const actor of cast) {
    const image = game.document.querySelector('[data-diorama-actor="' + CSS.escape(actor.key) + '"] img.character-asset');
    if (!image?.naturalWidth) {
      if (image && !image.complete) image.addEventListener('load', scheduleMeasure, {once:true});
      continue;
    }
    const path = new URL(image.currentSrc || image.src, game.location.href).pathname;
    const start = path.indexOf('/assets/');
    const key = start < 0 ? actor.asset : decodeURIComponent(path.slice(start + 1));
    const alphaBox = spriteBox(image, key, game.NaotocchiCastBounds);
    const rect = image.getBoundingClientRect();
    if (!alphaBox || !rect.width || !rect.height || !samples.has(actor.kind)) continue;
    const size = projectedBody(rect, alphaBox);
    samples.get(actor.kind).push(size);
    if (actor.kind === 'companion') {
      addRow(individualRows, actor.label || image.alt || actor.id, [dimensions(...size)]);
    }
  }
  let measured = 0;
  for (const [role, sizes] of samples) {
    const widths = sizes.map(size => size[0]), heights = sizes.map(size => size[1]);
    rows.get(role).cells[2].textContent = sizes.length ? dimensions(median(widths), median(heights)) : '—';
    if (role === 'companion') {
      byId('companion-range').hidden = sizes.length === 0;
      if (sizes.length) {
        const span = values => decimal.format(Math.min(...values)) + '〜' + decimal.format(Math.max(...values));
        byId('companion-range').textContent = '仲間' + sizes.length + '体の範囲　幅 ' + span(widths) + ' px ／ 高さ ' + span(heights) + ' px';
      }
    }
    measured += sizes.length;
  }
  byId('companion-detail').hidden = !individualRows.rows.length;
  byId('individual-sizes').replaceChildren(...individualRows.children);
  byId('measurement-status').textContent = '測定 ' + measured + '/' + cast.length + '体';
}

function showControls() {
  for (const button of document.querySelectorAll('[data-variant]')) {
    button.setAttribute('aria-pressed', String(button.dataset.variant === scene.variant));
  }
  for (const input of document.querySelectorAll('[name=layout], [name=curve]')) {
    input.checked = input.value === scene[input.name];
  }
  for (const key of ['region','time','count']) byId(key).value = scene[key];
  byId('toolbar-count').textContent = scene.count + '体';
  byId('fewer').disabled = scene.count === 1;
  byId('more').disabled = scene.count === 28;
  byId('freeze').textContent = scene.paused ? '再生' : '停止';
  byId('freeze').setAttribute('aria-pressed', String(scene.paused));
  byId('freeze').setAttribute('aria-label', scene.paused ? '住民の動きを再生' : '住民の動きを一時停止');
  byId('curve-note').textContent = (scene.curve === 'step'
    ? '18体までは現行サイズ。19体から上限の倍率になります。'
    : '18体までは現行サイズ。19体から1体ずつ大きくなり、28体で上限に達します。') +
    ' 画面幅320px以下では追加0%、375px以上では人数分の倍率になります。';
  byId('layout-note').textContent = scene.layout === 'fixed'
    ? '「停止」を押すと、同じ立ち位置で大きさを比べられます。'
    : '候補や拡大方法を変えると、同じ住民がそのサイズ用の初期配置から始めます。';
}

function applyLive() {
  if (ready) frame.contentWindow.HomeCastTrial.apply({
    policy:scene.variant, curve:scene.curve, time:scene.time, paused:scene.paused,
  });
}

function load() {
  cancelAnimationFrame(measureFrame);
  clearTimeout(deadline);
  ready = false;
  document.body.dataset.ready = 'false';
  byId('measure').disabled = true;
  byId('retry').hidden = true;
  byId('status').textContent = 'ホームを読み込んでいます…';
  byId('gain-readout').textContent = '';
  byId('measurement-status').textContent = '';
  byId('companion-detail').hidden = byId('companion-range').hidden = true;
  byId('individual-sizes').replaceChildren();
  for (const row of rows.values()) row.cells[1].textContent = row.cells[2].textContent = '—';
  const next = document.createElement('iframe');
  Object.assign(next, {id:'home', title:'なおとっちのホーム', allow:'autoplay', src:populationFrameURL(scene, location.href).href});
  frame.replaceWith(next);
  frame = next;
  deadline = setTimeout(() => {
    byId('status').textContent = '地形と住民を読み込んでいます。';
    byId('retry').hidden = false;
  }, 45000);
}

function change(patch) {
  const next = {...scene, ...patch};
  const reload = needsNewFrame(scene, next);
  scene = next;
  showControls();
  const link = new URL(location.href);
  link.search = sceneQuery(scene);
  history.replaceState(null, '', link);
  if (reload) load();
  else applyLive();
}

for (const [key, choices] of [['region', regions], ['time', times]]) {
  const select = byId(key);
  for (const [value, label] of choices) select.add(new Option(label, value));
  select.addEventListener('change', () => change({[key]:select.value}));
}
for (let count = 1; count <= 28; count++) byId('count').add(new Option(count + '体', count));
byId('count').addEventListener('change', event => change({count:Number(event.target.value)}));
byId('fewer').addEventListener('click', () => change({count:Math.max(1, scene.count - 1)}));
byId('more').addEventListener('click', () => change({count:Math.min(28, scene.count + 1)}));
for (const button of document.querySelectorAll('[data-trial]')) {
  button.addEventListener('click', () => {
    change({region:button.dataset.trial, count:28});
    if (compact.matches) setPanel(false, true);
  });
}
for (const input of document.querySelectorAll('[name=layout], [name=curve]')) {
  input.addEventListener('change', () => change({[input.name]:input.value}));
}
for (const button of document.querySelectorAll('[data-variant]')) {
  button.addEventListener('click', () => change({variant:button.dataset.variant}));
}
byId('freeze').addEventListener('click', () => change({paused:!scene.paused}));
byId('measure').addEventListener('click', measure);
byId('retry').addEventListener('click', load);

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'home-cast-ready') {
    ready = true;
    applyLive();
  }
  if (!ready || event.data?.type !== 'home-cast-state') return;
  const state = event.data.settings;
  if (state.policy !== scene.variant || state.curve !== scene.curve || state.time !== scene.time ||
      state.count !== scene.count || state.paused !== scene.paused) return;
  clearTimeout(deadline);
  document.body.dataset.ready = 'true';
  byId('measure').disabled = false;
  byId('retry').hidden = true;
  byId('status').textContent = '';
  byId('gain-readout').textContent = state.count + '体・幅' + state.width + ' px・現行から +' + percent.format(state.extra) + '%';
  for (const [kind, row] of rows) row.cells[1].textContent = percent.format(state[roleFields[kind]]) + '%';
  scheduleMeasure();
});

function setPanel(open, restoreFocus = false) {
  const panel = byId('panel');
  document.body.classList.toggle('settings-open', open);
  document.querySelector('.stage').inert = open;
  document.querySelector('.bar').inert = open;
  byId('scrim').hidden = !open;
  byId('settings-toggle').setAttribute('aria-expanded', String(open));
  if (open) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.scrollTop = 0;
    byId('settings-close').focus({preventScroll:true});
    measure();
  } else {
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    if (restoreFocus) byId('settings-toggle').focus();
  }
}
byId('settings-toggle').addEventListener('click', () => setPanel(true));
byId('settings-close').addEventListener('click', () => setPanel(false, true));
byId('scrim').addEventListener('click', () => setPanel(false, true));
document.addEventListener('keydown', event => {
  if (!document.body.classList.contains('settings-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setPanel(false, true);
  } else if (event.key === 'Tab') {
    const first = byId('settings-close'), last = document.querySelector('.archive');
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
compact.addEventListener('change', () => {
  if (!compact.matches) {
    setPanel(false);
    measure();
  }
});
showControls();
load();
