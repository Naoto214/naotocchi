import {regions, times, readScene} from '../shell-model.mjs';
import {readFinishScene, sceneQuery, finishFrameURL} from './shell-model.mjs';

const byId = id => document.getElementById(id);
const compact = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
const percent = new Intl.NumberFormat('ja-JP', {maximumFractionDigits:2});
let scene = readFinishScene(new URLSearchParams(location.search), readScene);
let frame = byId('home');
let ready = false;
let timeout;

function load() {
  clearTimeout(timeout);
  ready = false;
  document.body.dataset.ready = 'false';
  byId('status').textContent = 'ホームを読み込んでいます…';
  byId('gain').textContent = '';
  byId('retry').hidden = true;
  const next = document.createElement('iframe');
  Object.assign(next, {id:'home', title:'なおとっちのホーム', allow:'autoplay', src:finishFrameURL(scene, location.href).href});
  frame.replaceWith(next);
  frame = next;
  timeout = setTimeout(() => {
    byId('status').textContent = '地形と住民を読み込んでいます。';
    byId('retry').hidden = false;
  }, 45000);
}

function renderControls() {
  for (const key of ['region', 'time', 'count']) byId(key).value = scene[key];
  for (const button of document.querySelectorAll('[data-ground]')) {
    button.setAttribute('aria-pressed', String(button.dataset.ground === scene.ground));
  }
  byId('toolbar-count').textContent = scene.count + '体';
  byId('freeze').textContent = scene.paused ? '再生' : '停止';
  byId('freeze').setAttribute('aria-pressed', String(scene.paused));
  byId('freeze').setAttribute('aria-label', scene.paused ? '住民の動きを再生' : '住民の動きを一時停止');
}

function applyLive() {
  if (!ready) return;
  frame.contentWindow.HomeFinishGround.setEnabled(scene.ground === 'on');
  frame.contentWindow.HomeCastTrial.apply({time:scene.time, paused:scene.paused});
}

function change(patch) {
  const next = {...scene, ...patch};
  const reload = next.count !== scene.count || next.region !== scene.region;
  scene = next;
  renderControls();
  const url = new URL(location.href);
  url.search = sceneQuery(scene);
  history.replaceState(null, '', url);
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
for (const button of document.querySelectorAll('[data-ground]')) {
  button.addEventListener('click', () => change({ground:button.dataset.ground}));
}
byId('freeze').addEventListener('click', () => change({paused:!scene.paused}));
byId('retry').addEventListener('click', load);

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'home-cast-ready') {
    ready = true;
    applyLive();
  }
  if (!ready || event.data?.type !== 'home-cast-state') return;
  const state = event.data.settings;
  if (state.policy !== 'B' || state.curve !== 'linear' || state.count !== scene.count ||
      state.paused !== scene.paused || state.time !== scene.time) return;
  clearTimeout(timeout);
  document.body.dataset.ready = 'true';
  byId('retry').hidden = true;
  byId('status').textContent = '';
  byId('gain').textContent = state.count + '体・幅' + state.width + 'pxで +' + percent.format(state.extra) + '%';
});

function panel(open, restoreFocus = false) {
  const settings = byId('panel');
  document.body.classList.toggle('settings-open', open);
  document.querySelector('.stage').inert = open;
  document.querySelector('.bar').inert = open;
  byId('scrim').hidden = !open;
  byId('settings-toggle').setAttribute('aria-expanded', String(open));
  if (open) {
    settings.setAttribute('role', 'dialog');
    settings.setAttribute('aria-modal', 'true');
    settings.scrollTop = 0;
    byId('settings-close').focus({preventScroll:true});
  } else {
    settings.removeAttribute('role');
    settings.removeAttribute('aria-modal');
    if (restoreFocus) byId('settings-toggle').focus();
  }
}
byId('settings-toggle').addEventListener('click', () => panel(true));
byId('settings-close').addEventListener('click', () => panel(false, true));
byId('scrim').addEventListener('click', () => panel(false, true));
document.addEventListener('keydown', event => {
  if (!document.body.classList.contains('settings-open')) return;
  if (event.key === 'Escape') panel(false, true);
  if (event.key !== 'Tab') return;
  const first = byId('settings-close'), last = byId('count');
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
compact.addEventListener('change', () => { if (!compact.matches) panel(false); });
renderControls();
load();
