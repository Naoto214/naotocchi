const byId = id => document.getElementById(id);
const regions = [
  ['river_lake','みずべ'], ['forest','もり'], ['city','とかい'], ['home','おうち'],
  ['countryside','いなか'], ['mountain','やま'], ['snow','ゆきぐに'], ['sea','うみ'],
  ['jungle','ジャングル'], ['desert','さばく'], ['deepsea','しんかい'],
  ['star_stop','ほしぞらのていりゅうじょ'], ['memory_lake','きおくのみずうみ'],
];
const times = [['morning','朝'], ['day','昼'], ['evening','夕'], ['night','夜']];
const roles = [['hero','主人公'], ['partner','恋人'], ['companions','仲間']];
const presets = {current:[100,100,100], A:[120,110,105], B:[125,115,115]};
const counts = [1,4,10,20,28];
const params = new URLSearchParams(location.search);
function selectValue(key, rows, fallback) {
  const value = params.get(key);
  return rows.some(([id]) => id === value) ? value : fallback;
}
const requested = params.get('castPreset') || params.get('preset') || 'current';
const chosen = Object.hasOwn(presets,requested) ? requested : 'current';
const state = {
  region:selectValue('region',regions,'river_lake'), time:selectValue('time',times,'day'),
  count:counts.includes(Number(params.get('count'))) ? Number(params.get('count')) : 28,
  paused:['1','true'].includes(params.get('paused')),
};
for (const [i,[role]] of roles.entries()) {
  const raw = params.get(role);
  const value = raw?.trim() ? Number(raw) : NaN;
  state[role] = Number.isFinite(value) ? Math.min(150,Math.max(80,Math.round(value))) : presets[chosen][i];
}
function currentPreset() {
  return Object.keys(presets).find(preset => roles.every(([role],i) => state[role] === presets[preset][i])) || 'custom';
}
function settings() {
  return {preset:currentPreset(), time:state.time, paused:state.paused, hero:state.hero, partner:state.partner, companions:state.companions};
}
let ready = false;
let frame = byId('home');
let loadDeadline;
let linkTimer;
function updateLink() {
  clearTimeout(linkTimer);
  linkTimer = setTimeout(() => {
    const link = new URL(location.href);
    link.searchParams.set('castPreset',currentPreset());
    link.searchParams.delete('preset');
    for (const key of ['region','time','count']) link.searchParams.set(key,state[key]);
    link.searchParams.set('paused',state.paused ? '1' : '0');
    for (const [role] of roles) {
      if (currentPreset() === 'custom') link.searchParams.set(role,state[role]);
      else link.searchParams.delete(role);
    }
    history.replaceState(null,'',link);
  },180);
}
function send() {
  if (ready) frame.contentWindow.postMessage({type:'home-cast-settings',settings:settings()},location.origin);
}
function loadScene() {
  ready = false;
  document.body.dataset.ready = 'false';
  clearTimeout(loadDeadline);
  byId('status').textContent = 'ホームを読み込んでいます…';
  byId('retry').hidden = true;
  const next = document.createElement('iframe');
  next.id = 'home';
  next.title = 'なおとっちのホーム';
  next.allow = 'autoplay';
  const link = new URL('./game/index.html',location.href);
  const initial = {count:state.count,region:state.region,time:state.time,variant:'B',compareSplit:0,
    castPreset:currentPreset(),paused:state.paused ? 1 : 0,hero:state.hero,partner:state.partner,companions:state.companions};
  for (const [key,value] of Object.entries(initial)) link.searchParams.set(key,value);
  next.src = link.href;
  frame.replaceWith(next);
  frame = next;
  loadDeadline = setTimeout(() => {
    if (document.body.dataset.ready === 'true') return;
    byId('status').textContent = 'ホームの読み込みに時間がかかっています。';
    byId('retry').hidden = false;
  },30000);
}
window.addEventListener('message',event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'home-cast-ready') {
    ready = true;
    send();
  }
  if (event.data?.type === 'home-cast-state' && ready) {
    document.body.dataset.ready = 'true';
    clearTimeout(loadDeadline);
    byId('status').textContent = '';
    byId('retry').hidden = true;
  }
});
byId('retry').addEventListener('click',loadScene);
function render() {
  const preset = currentPreset();
  for (const button of document.querySelectorAll('[data-preset]')) button.setAttribute('aria-pressed',String(preset === button.dataset.preset));
  byId('region').value = state.region;
  byId('time').value = state.time;
  byId('scale-note').textContent = preset === 'custom' ? '手動調整中。現行の表示サイズを100%とします。' : '現行の表示サイズを100%とします。';
  for (const field of document.querySelectorAll('input[name=count]')) field.checked = Number(field.value) === state.count;
  for (const [role] of roles) {
    byId(role).value = state[role];
    byId(role).setAttribute('aria-valuetext',state[role]+'%');
    byId(role+'-value').value = state[role]+'%';
  }
  byId('freeze').setAttribute('aria-pressed',String(state.paused));
  byId('freeze').title = state.paused ? '住民の動きを再開する' : '同じ配置で見比べる';
  byId('freeze-text').textContent = state.paused ? '再生する' : '配置を固定';
  byId('pair-note').textContent = state.count === 1 ? '1体表示では主人公だけを表示します。' : '';
}
function update(reload = false) {
  render();
  updateLink();
  if (reload) loadScene();
  else send();
}
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click',() => {
    roles.forEach(([role],i) => { state[role] = presets[button.dataset.preset][i]; });
    update();
  });
}
for (const [key,values] of [['region',regions],['time',times]]) {
  const select = byId(key);
  for (const [value,label] of values) select.add(new Option(label,value));
  select.addEventListener('change',() => {
    state[key] = select.value;
    update(key === 'region');
  });
}
for (const count of counts) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'count';
  input.value = String(count);
  const text = document.createElement('span');
  text.textContent = count+'体';
  label.append(input,text);
  byId('counts').append(label);
  input.addEventListener('change',() => {
    state.count = count;
    update(true);
  });
}
for (const [role,caption] of roles) {
  const row = document.createElement('div');
  row.className = 'scale';
  const label = document.createElement('label');
  label.htmlFor = role;
  label.textContent = caption;
  const input = document.createElement('input');
  input.id = role;
  input.type = 'range';
  input.min = '80';
  input.max = '150';
  input.step = '1';
  const output = document.createElement('output');
  output.id = role+'-value';
  output.htmlFor.add(role);
  row.append(label,output,input);
  byId('scales').append(row);
  input.addEventListener('input',() => {
    state[role] = input.valueAsNumber;
    update();
  });
}
byId('settings').addEventListener('submit',event => event.preventDefault());
byId('freeze').addEventListener('click',() => {
  state.paused = !state.paused;
  update();
});

const compact = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
const panel = byId('panel');
const panelToggle = byId('settings-toggle');
function setPanel(open, restoreFocus = false) {
  document.body.classList.toggle('settings-open',open);
  document.querySelector('.stage').inert = open;
  document.querySelector('.bar').inert = open;
  byId('scrim').hidden = !open;
  panelToggle.setAttribute('aria-expanded',String(open));
  if (open) {
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    byId('settings-close').focus();
  } else {
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    if (restoreFocus) panelToggle.focus();
  }
}
panelToggle.addEventListener('click',() => setPanel(true));
byId('settings-close').addEventListener('click',() => setPanel(false,true));
byId('scrim').addEventListener('click',() => setPanel(false,true));
document.addEventListener('keydown',event => {
  if (!document.body.classList.contains('settings-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setPanel(false,true);
  } else if (event.key === 'Tab') {
    const first = byId('settings-close');
    const last = byId('companions');
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
compact.addEventListener('change',() => { if (!compact.matches) setPanel(false); });
render();
loadScene();
