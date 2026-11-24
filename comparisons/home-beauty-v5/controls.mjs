const get = id => document.getElementById(id);
const form = get('settings');
const frame = get('home');
const variants = [['previous','旧版','地域ごとの比較基準'],['E3','E3','自然の動きと幻想の光']];
const regions = [
  ['home','おうち','雨が窓を伝うときのガラスと床の光','evening','autumn','rain'],
  ['forest','もり','樹冠を順に抜ける風と林床の木漏れ日','day','summer','sunny'],
  ['river_lake','みずべ','岩のそばを通り過ぎる流れと水面の反射','day','summer','sunny'],
  ['city','とかい','店舗の暖かな光と雨に濡れた舗装','night','autumn','rain'],
  ['countryside','いなか','草花を渡る風と夕暮れの蛍','evening','summer','sunny'],
  ['mountain','やま','稜線に沿う雲と谷間の薄霧','morning','autumn','cloudy'],
  ['snow','ゆきぐに','降る雪の遠近と家々の窓明かり','evening','winter','snow'],
  ['sea','うみ','沖のうねりから浅瀬の泡まで続く夕日の反射','evening','summer','sunny'],
  ['jungle','ジャングル','大きな葉の揺れと雨が抜けていく奥行き','day','summer','rain'],
  ['desert','さばく','砂丘の稜線を伝う砂と遠くの陽炎','day','summer','sunny'],
  ['deepsea','しんかい','水中の光と棚の際を上る泡','day','summer','sunny'],
  ['star_stop','ほしぞらのていりゅうじょ','銀河の明暗と空を横切るまれな流星','night','winter','sunny'],
  ['memory_lake','きおくのみずうみ','湖面の輪に揺れる月や星の光','night','summer','sunny'],
];
const inherited = new Set(['forest','sea','city','snow','memory_lake']);
const settings = {region:'river_lake',time:'day',season:'summer',weather:'sunny',
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
get('region').addEventListener('change', () => {
  settings.region = get('region').value;
  updateEffects();
  load();
});
get('scene-preset').addEventListener('click', () => {
  const [, , , time, season, weather] = regions.find(row => row[0] === settings.region);
  for (const [key,value] of Object.entries({time,season,weather})) {
    settings[key] = value;
    form.querySelector('input[name="'+key+'"][value="'+value+'"]').checked = true;
  }
  send();
  panel(false);
});
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
  settings.compareSplit = splitRequested && settings.variant !== 'previous';
  const control = get('split-toggle');
  control.disabled = settings.variant === 'previous';
  control.setAttribute('aria-pressed',String(settings.compareSplit));
  wipe.hidden = !settings.compareSplit;
  get('wipe-candidate').textContent = settings.variant;
  const percent = Math.round(settings.split*100);
  wipe.style.setProperty('--split',percent+'%');
  divider.setAttribute('aria-valuenow',String(percent));
  divider.setAttribute('aria-valuetext','左 '+get('wipe-previous').textContent+' '+percent+'%、右 '+settings.variant+' '+(100-percent)+'%');
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
  const sea = settings.region === 'sea', forest = settings.region === 'forest';
  const old = settings.variant === 'previous';
  const native = old && !inherited.has(settings.region);
  const reference = inherited.has(settings.region) ? 'D3' : '正式版';
  get('wipe-previous').textContent = reference;
  quick.options[0].textContent = reference;
  get('variants').querySelector('small').textContent = reference === 'D3' ? 'VERSION 3 の D3' : '正式ホーム';
  const scene = regions.find(row => row[0] === settings.region);
  get('scene-note').textContent = scene[2];
  get('sea-detail').hidden = !sea || old;
  get('forest-detail').hidden = !forest;
  slider.disabled = native;
  for (const [key,,groupId] of effectControls) {
    get('fx-'+key).disabled = native || (groupId === 'sea-effects' && (!sea || old))
      || (groupId === 'forest-effects' && !forest);
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
