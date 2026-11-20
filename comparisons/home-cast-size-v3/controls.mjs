import {regions, times, counts, roles, median, readScene} from '../shell-model.mjs';
import {readLimitScene, limitFrameURL, needsNewFrame, rolePercentages, projectedBody} from './shell-model.mjs';

const byId = id => document.getElementById(id);
const compact = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
const decimal = new Intl.NumberFormat('ja-JP', {minimumFractionDigits:1, maximumFractionDigits:1});
const percent = new Intl.NumberFormat('ja-JP', {maximumFractionDigits:2});
let scene = readLimitScene(new URLSearchParams(location.search), readScene);
let frame = byId('home');
let ready = false;
let deadline;

function pair(width, height) {
  return decimal.format(width) + ' × ' + decimal.format(height);
}
function addRow(body, label, values) {
  const row = body.insertRow();
  const heading = document.createElement('th');
  heading.scope = 'row';
  heading.textContent = label;
  row.append(heading);
  for (const value of values) row.insertCell().textContent = value;
  return row;
}
const measurements = new Map(roles.map(([role, label]) => [
  role, addRow(byId('measurements'), role === 'companion' ? '仲間（中央値）' : label, ['—', '—']),
]));

function measure() {
  if (!ready || (compact.matches && !document.body.classList.contains('settings-open'))) return;
  const game = frame.contentWindow;
  const samples = new Map(roles.map(([role]) => [role, []]));
  const detail = document.createElement('tbody');
  for (const actor of game.HomeCastTrial.inspect()) {
    const image = game.document.querySelector('[data-diorama-actor="' + CSS.escape(actor.key) + '"] img.character-asset');
    if (!image?.naturalWidth) continue;
    const path = new URL(image.currentSrc || image.src, game.location.href).pathname;
    const start = path.indexOf('/assets/');
    const asset = start < 0 ? actor.asset : decodeURIComponent(path.slice(start + 1));
    const box = game.NaotocchiCastBounds?.[asset]?.box;
    const rect = image.getBoundingClientRect();
    if (!box || !rect.width || !rect.height || !samples.has(actor.kind)) continue;
    const body = projectedBody(rect, box);
    samples.get(actor.kind).push(body);
    if (actor.kind === 'companion') addRow(detail, actor.label || image.alt || actor.id, [pair(...body)]);
  }
  for (const [role, bodies] of samples) {
    const label = bodies.length ? pair(...[0,1].map(i => median(bodies.map(body => body[i])))) : '—';
    measurements.get(role).cells[2].textContent = label;
  }
  byId('companion-detail').hidden = !detail.rows.length;
  byId('individual-sizes').replaceChildren(...detail.children);
  byId('measurement-status').textContent = '測定 ' + new Date().toLocaleTimeString('ja-JP');
}

function showControls() {
  for (const button of document.querySelectorAll('[data-extra]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.extra) === scene.extra));
  }
  for (const input of document.querySelectorAll('[name=layout]')) input.checked = input.value === scene.layout;
  for (const input of document.querySelectorAll('[name=count]')) input.checked = Number(input.value) === scene.count;
  byId('region').value = scene.region;
  byId('time').value = scene.time;
  byId('freeze').textContent = scene.paused ? '再生' : '固定';
  byId('freeze').setAttribute('aria-pressed', String(scene.paused));
  byId('freeze').setAttribute('aria-label', scene.paused ? '住民の動きを再生' : '配置を固定');
  byId('hold-option').hidden = scene.layout !== 'optimized';
  byId('hold-opening').checked = scene.seatExtra !== null;
  let note = '「固定」を押すと、同じ立ち位置で大きさを比べられます。';
  if (scene.layout === 'optimized') {
    if (scene.seatExtra === null) {
      note = '倍率を変えると、そのサイズ用の初期配置から始まります。';
    } else {
      const opening = scene.seatExtra ? '+' + scene.seatExtra + '%' : '現行サイズ';
      note = opening + '用の初期配置を保持中です。倍率の変更はその場に反映します。';
    }
  }
  byId('layout-note').textContent = note;
  const scales = rolePercentages(scene.extra);
  for (const [i, [role]] of roles.entries()) {
    measurements.get(role).cells[1].textContent = percent.format(scales[i]) + '%';
  }
}

function applyLive() {
  if (ready) frame.contentWindow.HomeCastTrial.apply({extra:scene.extra, time:scene.time, paused:scene.paused});
}

function load() {
  clearTimeout(deadline);
  ready = false;
  document.body.dataset.ready = 'false';
  byId('measure').disabled = true;
  byId('retry').hidden = true;
  byId('status').textContent = 'ホームを読み込んでいます…';
  byId('measurement-status').textContent = '';
  byId('companion-detail').hidden = true;
  byId('individual-sizes').replaceChildren();
  for (const row of measurements.values()) row.cells[2].textContent = '—';
  const next = document.createElement('iframe');
  Object.assign(next, {id:'home', title:'なおとっちのホーム', allow:'autoplay', src:limitFrameURL(scene, location.href).href});
  frame.replaceWith(next);
  frame = next;
  deadline = setTimeout(() => {
    byId('status').textContent = '地形と住民を読み込んでいます。';
    byId('retry').hidden = false;
  }, 45000);
}

function change(patch) {
  const next = {...scene, ...patch};
  if (next.layout === 'fixed') next.seatExtra = null;
  const reload = needsNewFrame(scene, next);
  scene = next;
  showControls();
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(scene)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, key === 'paused' ? Number(value) : value);
  }
  history.replaceState(null, '', url);
  if (reload) load();
  else applyLive();
}

for (const [key, choices] of [['region', regions], ['time', times]]) {
  const select = byId(key);
  for (const [value, label] of choices) select.add(new Option(label, value));
  select.addEventListener('change', () => change({[key]:select.value}));
}
for (const count of counts) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  Object.assign(input, {type:'radio', name:'count', value:String(count)});
  const caption = document.createElement('span');
  caption.textContent = count + '体';
  label.append(input, caption);
  byId('counts').append(label);
  input.addEventListener('change', () => change({count}));
}
for (const input of document.querySelectorAll('[name=layout]')) {
  input.addEventListener('change', () => change({layout:input.value}));
}
byId('hold-opening').addEventListener('change', event => {
  change({seatExtra:event.target.checked ? scene.extra : null});
});
for (const button of document.querySelectorAll('[data-extra]')) {
  button.addEventListener('click', () => change({extra:Number(button.dataset.extra)}));
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
  if (ready && event.data?.type === 'home-cast-state' && event.data.settings.extra === scene.extra) {
    clearTimeout(deadline);
    document.body.dataset.ready = 'true';
    byId('measure').disabled = false;
    byId('retry').hidden = true;
    byId('status').textContent = '';
    measure();
  }
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
    byId('settings-close').focus();
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
  }
  if (event.key === 'Tab') {
    const first = byId('settings-close');
    const last = document.querySelector('.archive');
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
