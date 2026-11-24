const get = id => document.getElementById(id);
const form = get('settings');
const frame = get('home');
const variants = [
  ['D3','D3','自然の動きと幻想表現を両立'],
  ['E1','E1','自然のリアリティを最大化'],
  ['E2','E2','幻想的な美しさを最大化'],
  ['E3','E3','自然のリアリティと幻想的な美しさを最大限に両立'],
];
const regions = [['sea','うみ'],['forest','もり']];
const settings = {region:'sea',time:'evening',season:'summer',weather:'sunny',
  variant:'E3',count:1,speed:1,strength:1,compareSplit:false,split:.5,effects:{}};
const params = new URLSearchParams(location.search);
const status = get('status');
const quick = get('quick-variant');
const mobile = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
let ready = false;
let loadTimer;

function selectInitial(key, rows) {
  const supplied = params.get(key);
  if (rows.some(row => row[0] === supplied)) {
    settings[key] = ['count','speed'].includes(key) ? Number(supplied) : supplied;
  }
}
function choice(parent,key,value,label,subtitle) {
  const element = document.createElement('label');
  element.className = 'choice';
  const input = document.createElement('input');
  input.name = key;
  input.type = 'radio';
  input.value = value;
  input.checked = String(settings[key]) === value;
  const text = document.createElement('span');
  if (subtitle) {
    const code = document.createElement('b');
    code.textContent = label;
    const name = document.createElement('small');
    name.textContent = subtitle;
    text.append(code,name);
  } else {
    text.textContent = label;
  }
  element.append(input,text);
  parent.append(element);
}
function group(id,key,title,rows) {
  selectInitial(key,rows);
  const field = document.createElement('fieldset');
  const caption = document.createElement('legend');
  caption.textContent = title;
  const choices = document.createElement('div');
  choices.className = 'choices';
  rows.forEach(row => choice(choices,key,...row));
  field.append(caption,choices);
  get(id).append(field);
}
selectInitial('variant',variants);
for (const [value,name,subtitle] of variants) {
  choice(get('variants'),'variant',value,name,subtitle);
  quick.add(new Option(name,value));
}
quick.value = settings.variant;
const slider = get('strength');
const initialStrength = Number(params.get('strength'));
if (params.get('strength')?.trim() && Number.isFinite(initialStrength)) {
  slider.value = String(Math.max(0,Math.min(2,initialStrength)));
}
function readStrength() {
  settings.strength = slider.valueAsNumber;
  const percent = Math.round(settings.strength*100)+'%';
  get('strength-value').value = percent;
  slider.setAttribute('aria-valuetext',percent);
}
readStrength();
slider.addEventListener('input',() => {readStrength();send();});
selectInitial('region',regions);
for (const [value,label] of regions) get('region').add(new Option(label,value));
get('region').value = settings.region;
group('conditions','time','時間帯',[['morning','朝'],['day','昼'],['evening','夕'],['night','夜']]);
group('conditions','season','季節',[['spring','春'],['summer','夏'],['autumn','秋'],['winter','冬']]);
group('conditions','weather','天気',[['sunny','晴れ'],['cloudy','曇り'],['rain','雨'],['snow','雪']]);
group('playback','count','住民',[['1','1体'],['4','4体'],['28','28体']]);
group('playback','speed','再生速度',[['1','通常'],['0.25','スロー ×0.25']]);
const effectControls = [
  ['water','水面・反射','effects'], ['particles','季節の粒子','effects'],
  ['light','環境光・照明','effects'], ['contact','足元・接水','effects'],
  ['motion','自然物の動き','effects'], ['magic','幻想の光','effects'],
  ['waves','波の動き','sea-effects'], ['foam','白波・泡','sea-effects'],
  ['reflections','水面の反射','sea-effects'], ['caustics','水底の光','sea-effects'],
  ['canopy','枝葉の揺れ','forest-effects'], ['shafts','光の筋','forest-effects'],
  ['depth','粒子の奥行き','forest-effects'], ['gusts','ひときわ強い風','forest-effects'],
  ['ground','地面の木漏れ日','forest-effects'],
];
for (const [key,label,groupId] of effectControls) {
  const wrapper = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'fx-'+key;
  input.dataset.effect = key;
  settings.effects[key] = params.get(key) !== '0';
  input.checked = settings.effects[key];
  wrapper.append(input,label);
  get(groupId).append(wrapper);
}
const requestedSplit = Number(params.get('split'));
if (params.get('split')?.trim() && Number.isFinite(requestedSplit)) {
  settings.split = Math.min(.95, Math.max(.05, requestedSplit));
}
let splitRequested = params.get('compareSplit') === '1' || params.get('compareSplit') === 'true';
const divider = get('wipe-handle');
const wipe = get('wipe');
const stage = frame.parentElement;

function updateSplit() {
  settings.compareSplit = splitRequested && settings.variant !== 'D3';
  const control = get('split-toggle');
  control.disabled = settings.variant === 'D3';
  control.setAttribute('aria-pressed',String(settings.compareSplit));
  wipe.hidden = !settings.compareSplit;
  get('wipe-candidate').textContent = settings.variant;
  const percent = Math.round(settings.split*100);
  wipe.style.setProperty('--split',percent+'%');
  divider.setAttribute('aria-valuenow',String(percent));
  divider.setAttribute('aria-valuetext','左 D3 '+percent+'%、右 '+settings.variant+' '+(100-percent)+'%');
}
function moveDivider(value) {
  settings.split = Math.round(Math.max(.05,Math.min(.95,value))*100)/100;
  updateSplit();
  send();
}
get('split-toggle').addEventListener('click',() => {
  splitRequested = !settings.compareSplit;
  updateSplit();
  send();
});
divider.addEventListener('pointerdown',event => {
  if (!event.isPrimary || event.button !== 0) return;
  divider.setPointerCapture(event.pointerId);
});
divider.addEventListener('pointermove',event => {
  if (!divider.hasPointerCapture(event.pointerId)) return;
  const box = stage.getBoundingClientRect();
  moveDivider((event.clientX-box.left)/box.width);
});
divider.addEventListener('keydown',event => {
  const step = event.shiftKey ? .1 : .01;
  const moves = {ArrowLeft:settings.split-step,ArrowRight:settings.split+step,Home:.05,End:.95};
  if (!Object.hasOwn(moves,event.key)) return;
  event.preventDefault();
  moveDivider(moves[event.key]);
});
get('clock-replay').onclick = () => {
  initialClock = null;
  if (ready) frame.contentWindow.postMessage({type:'home-beauty-clock',seconds:0,paused:false},location.origin);
  panel(false);
};
function updateEffects() {
  const sea = settings.region === 'sea';
  get('sea-detail').hidden = !sea || settings.variant === 'D3';
  get('forest-detail').hidden = sea;
  for (const [key,,groupId] of effectControls) {
    get('fx-'+key).disabled = (groupId === 'sea-effects' && (!sea || settings.variant === 'D3'))
      || (groupId === 'forest-effects' && sea);
  }
  updateSplit();
}
function send() {
  if (ready) frame.contentWindow.postMessage({type:'home-beauty-settings',settings},location.origin);
}
let initialClock = params.has('clock') && Number.isFinite(Number(params.get('clock'))) ? Math.max(0,Number(params.get('clock'))) : null;
function load() {
  ready = false;
  status.textContent = 'ホームを読み込み中…';
  const url = new URL('./game/index.html',location.href);
  const {effects,...flat} = settings;
  for (const [key,value] of Object.entries(flat)) url.searchParams.set(key,value);
  for (const [key,on] of Object.entries(effects)) url.searchParams.set(key,on ? '1':'0');
  url.searchParams.set('compareSplit',settings.compareSplit ? '1' : '0');
  if (initialClock !== null) url.searchParams.set('clock',String(initialClock));
  frame.src = url.href;
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    if (!ready) status.textContent = '読み込みに時間がかかっています。比較設定から再生をやり直せます。';
  },25000);
}
window.addEventListener('message',event => {
  if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
  if (event.data?.type === 'home-beauty-ready') {
    clearTimeout(loadTimer);
    ready = true;
    status.textContent = '';
    send();
  }
});
form.addEventListener('change',event => {
  const input = event.target;
  if (input === slider) readStrength();
  else if (input.dataset.effect) settings.effects[input.dataset.effect] = input.checked;
  else {
    settings[input.name] = ['count','speed'].includes(input.name) ? Number(input.value) : input.value;
    quick.value = settings.variant;
    updateEffects();
  }
  if (input.name === 'count' || input.name === 'region') load();
  else send();
});
quick.addEventListener('change',() => {
  settings.variant = quick.value;
  form.querySelector('input[name="variant"][value="'+quick.value+'"]').checked = true;
  updateEffects();
  send();
});
function panel(open,focus=true) {
  const visible = mobile.matches && open;
  document.body.classList.toggle('panel-open',visible);
  get('scrim').hidden = !visible;
  frame.inert = visible;
  get('panel-toggle').setAttribute('aria-expanded',String(visible));
  if (focus && mobile.matches) (visible ? get('panel-close') : get('panel-toggle')).focus();
}
get('panel-toggle').onclick = () => panel(!document.body.classList.contains('panel-open'));
get('panel-close').onclick = get('scrim').onclick = () => panel(false);
get('replay').onclick = () => { load(); panel(false); };
window.addEventListener('keydown',event => {
  if (event.key === 'Escape' && document.body.classList.contains('panel-open')) panel(false);
});
if (mobile.addEventListener) mobile.addEventListener('change',() => panel(false,false));
else mobile.addListener(() => panel(false,false));
updateEffects();
load();
