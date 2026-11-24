const get = id => document.getElementById(id);
const form = get('settings');
const frame = get('home');
const quick = get('quick-variant');
const variants = [['E3plus','E3+','基準'],['A','A','約1.5倍'],['B','B','約2倍'],['C','C','約2.5倍']];
const colors = [['mixed','混色'],['red','赤'],['orange','橙'],['gold','金']];
const regions = [
  ['home','おうち'],['forest','もり'],['river_lake','みずべ'],['city','とかい'],
  ['countryside','いなか'],['mountain','やま'],['snow','ゆきぐに'],['sea','うみ'],
  ['jungle','ジャングル'],['desert','さばく'],['deepsea','しんかい'],
  ['star_stop','ほしぞらのていりゅうじょ'],['memory_lake','きおくのみずうみ'],
];
const scenes = [
  {id:'forest-leaves',name:'もり',where:'秋・昼・晴れ',region:'forest',time:'day',season:'autumn',weather:'sunny'},
  {id:'country-leaves',name:'いなか',where:'秋・夕・晴れ',region:'countryside',time:'evening',season:'autumn',weather:'sunny'},
  {id:'forest-petals',name:'花びら',where:'もり・春の昼',region:'forest',time:'day',season:'spring',weather:'sunny'},
  {id:'snow-day',name:'昼の雪',where:'ゆきぐに・冬の昼',region:'snow',time:'day',season:'winter',weather:'snow'},
  {id:'snow-night',name:'雪と窓明かり',where:'ゆきぐに・冬の夜',region:'snow',time:'night',season:'winter',weather:'snow'},
  {id:'sea-rain',name:'海に降る雨',where:'うみ・夏の昼',region:'sea',time:'day',season:'summer',weather:'rain'},
];
const sceneKeys = ['region','time','season','weather'];
const conditions = {
  time: ['時間帯',[['morning','朝'],['day','昼'],['evening','夕'],['night','夜']]],
  season: ['季節',[['spring','春'],['summer','夏'],['autumn','秋'],['winter','冬']]],
  weather: ['天気',[['sunny','晴れ'],['cloudy','曇り'],['rain','雨'],['snow','雪']]],
};
const playback = {
  count: ['住民',[['1','1体'],['4','4体'],['28','28体']]],
  speed: ['再生速度',[['1','通常'],['0.25','スロー ×0.25']]],
};
const fallControls = [
  ['count','葉の枚数','fallCount',0,1.5],
  ['size','選んだ案からの拡大率','fallSize',.5,2],
  ['speed','落下速度','fallSpeed',.25,2],
  ['wind','風の強さ','fallWind',0,2],
];
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
const mobile = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
const params = new URLSearchParams(location.search);
const initialScene = scenes.find(scene => scene.id === params.get('scene')) ?? scenes[0];
const settings = {variant:'B',leafColor:'mixed',count:1,speed:1,strength:1,compareSplit:true,split:.5,effects:{},fall:{}};
for (const key of sceneKeys) settings[key] = initialScene[key];
function readChoice(key,rows) {
  const value = params.get(key);
  if (rows.some(row => row[0] === value)) settings[key] = key === 'count' || key === 'speed' ? Number(value) : value;
}
function readNumber(key,min,max,initial) {
  const raw = params.get(key);
  if (!raw?.trim() || !Number.isFinite(Number(raw))) return initial;
  return Math.max(min,Math.min(max,Number(raw)));
}
readChoice('variant',variants);
readChoice('leafColor',colors);
let lastCandidate = settings.variant === 'E3plus' ? 'B' : settings.variant;
readChoice('region',regions);
for (const [key,[,rows]] of Object.entries({...conditions,...playback})) readChoice(key,rows);
settings.strength = readNumber('strength',0,2,1);
settings.split = readNumber('split',.05,.95,.5);
let splitRequested = !['0','false'].includes(params.get('compareSplit'));
let heldClockSeconds = params.has('clock') ? readNumber('clock',0,Number.MAX_SAFE_INTEGER,null) : null;
let ready = false;
let loadTimer;
function setRangeValue(input,output,value) {
  input.value = value;
  const percent = Math.round(input.valueAsNumber*100)+'%';
  output.value = percent;
  input.setAttribute('aria-valuetext',percent);
}
for (const [key,label,urlKey,min,max] of fallControls) {
  const row = document.createElement('div');
  row.className = 'range-row';
  const caption = document.createElement('label');
  caption.htmlFor = 'fall-'+key;
  caption.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.id = caption.htmlFor;
  input.min = min;
  input.max = max;
  input.step = .05;
  const output = document.createElement('output');
  output.id = input.id+'-value';
  output.setAttribute('for',input.id);
  setRangeValue(input,output,readNumber(urlKey,min,max,1));
  settings.fall[key] = input.valueAsNumber;
  input.addEventListener('input',() => {
    settings.fall[key] = input.valueAsNumber;
    setRangeValue(input,output,settings.fall[key]);
    send();
  });
  row.append(caption,output,input);
  get('fall-controls').append(row);
}
get('fall-reset').onclick = () => {
  for (const [key] of fallControls) {
    settings.fall[key] = 1;
    setRangeValue(get('fall-'+key),get('fall-'+key+'-value'),1);
  }
  settings.leafColor = 'mixed';
  refresh();
  send();
  remember();
};
const strength = get('strength');
setRangeValue(strength,get('strength-value'),settings.strength);
strength.addEventListener('input',() => {
  settings.strength = strength.valueAsNumber;
  setRangeValue(strength,get('strength-value'),settings.strength);
  send();
});
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
  } else text.textContent = label;
  element.append(input,text);
  parent.append(element);
}
function group(id,key,title,rows) {
  const field = document.createElement('fieldset');
  const caption = document.createElement('legend');
  caption.textContent = title;
  const choices = document.createElement('div');
  choices.className = 'choices';
  rows.forEach(row => choice(choices,key,...row));
  field.append(caption,choices);
  get(id).append(field);
}
for (const [key,config] of Object.entries(conditions)) group('conditions',key,...config);
for (const [key,config] of Object.entries(playback)) group('playback',key,...config);
for (const [value,name,subtitle] of variants) {
  choice(get('variants'),'variant',value,name,subtitle);
  quick.add(new Option(value === 'E3plus' ? 'E3+ 基準' : name+' '+subtitle,value));
}
for (const [value,label] of colors) choice(get('leaf-colors'),'leafColor',value,label);
for (const [value,label] of regions) get('region').add(new Option(label,value));
for (const scene of scenes) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.scene = scene.id;
  const title = document.createElement('strong');
  title.textContent = scene.name;
  const where = document.createElement('small');
  where.textContent = scene.where;
  button.append(title,where);
  button.onclick = () => selectScene(scene);
  const primary = scene.id === 'forest-leaves' || scene.id === 'country-leaves';
  get(primary ? 'scenes' : 'other-scenes').append(button);
  const label = primary ? (scene.region === 'forest' ? 'もりの昼' : 'いなかの夕') : scene.name;
  get('quick-scene').add(new Option(label,scene.id));
}
const customScene = new Option('個別設定','custom');
customScene.disabled = true;
get('quick-scene').add(customScene);
function selectScene(scene) {
  const changedRegion = settings.region !== scene.region;
  for (const key of sceneKeys) settings[key] = scene[key];
  refresh();
  if (changedRegion) load();
  else send();
  remember();
  panel(false);
}
get('quick-scene').onchange = event => selectScene(scenes.find(scene => scene.id === event.target.value));
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
const divider = get('wipe-handle');
const wipe = get('wipe');
const stage = frame.parentElement;
function updateSplit() {
  const candidate = settings.variant !== 'E3plus';
  settings.compareSplit = splitRequested && candidate;
  const toggle = get('split-toggle');
  toggle.setAttribute('aria-pressed',String(settings.compareSplit));
  toggle.textContent = settings.compareSplit ? '分割' : '単体';
  toggle.title = settings.compareSplit ? '単体表示に切り替え' : '分割表示に切り替え';
  toggle.setAttribute('aria-label',toggle.textContent+'表示中。'+toggle.title);
  get('wipe-candidate').textContent = settings.variant;
  wipe.hidden = !settings.compareSplit;
  const percent = Math.round(settings.split*100);
  wipe.style.setProperty('--split',percent+'%');
  divider.setAttribute('aria-valuenow',String(percent));
  divider.setAttribute('aria-valuetext','左 E3+ '+percent+'%、右 '+settings.variant+' '+(100-percent)+'%');
}
function refreshClock() {
  const toggle = get('clock-toggle');
  toggle.disabled = !ready;
  get('clock-replay').disabled = !ready;
  const paused = heldClockSeconds !== null;
  const label = paused ? '背景演出を再開' : '背景演出を一時停止';
  toggle.classList.toggle('paused',paused);
  get('clock-label').textContent = label;
  toggle.setAttribute('aria-label',label);
  toggle.title = label;
}
function refresh() {
  get('region').value = settings.region;
  quick.value = settings.variant;
  for (const key of ['variant','leafColor','time','season','weather']) form.elements[key].value = settings[key];
  const current = scenes.find(scene => sceneKeys.every(key => scene[key] === settings[key]));
  if (!current) customScene.text = regions.find(row => row[0] === settings.region)[1]+'・個別設定';
  customScene.hidden = Boolean(current);
  get('quick-scene').value = current?.id ?? 'custom';
  for (const button of form.querySelectorAll('[data-scene]')) button.setAttribute('aria-pressed',String(button.dataset.scene === current?.id));
  get('sea-detail').hidden = settings.region !== 'sea';
  get('forest-detail').hidden = settings.region !== 'forest';
  updateSplit();
  refreshClock();
  const leaves = settings.season === 'autumn' && ['sunny','cloudy'].includes(settings.weather) &&
    (settings.region === 'forest' || (settings.region === 'countryside' && settings.time !== 'night'));
  const baseline = settings.variant === 'E3plus';
  if (!baseline) lastCandidate = settings.variant;
  get('leaf-settings').disabled = baseline || !leaves;
  const note = !leaves ? '秋の落ち葉を比べるには「もり」か「いなか」の場面を選んでください。' :
    baseline ? '基準の E3+ を表示中。A〜Cを選ぶと葉の色や大きさを調整できます。' :
    settings.compareSplit ? '左は基準の E3+、右は '+settings.variant+'。境界を左右に動かせます。' :
    settings.variant+' を単体表示中。「単体」を押すと基準の E3+ と見比べられます。';
  get('mode-note').textContent = note;
}
function writeSettings(query) {
  for (const key of [...sceneKeys,'variant','leafColor','count','speed','strength','split']) query.set(key,settings[key]);
  query.set('compareSplit',settings.compareSplit ? '1' : '0');
  for (const [key,,urlKey] of fallControls) query.set(urlKey,settings.fall[key]);
  for (const [key,on] of Object.entries(settings.effects)) query.set(key,on ? '1' : '0');
}
// Keep the shell's URL bookmarkable without touching the game's save.
function remember() {
  const url = new URL(location.href);
  writeSettings(url.searchParams);
  const scene = scenes.find(item => sceneKeys.every(key => item[key] === settings[key]));
  if (scene) {
    url.searchParams.set('scene',scene.id);
    for (const key of sceneKeys) url.searchParams.delete(key);
  } else url.searchParams.delete('scene');
  if (heldClockSeconds === null) url.searchParams.delete('clock');
  else url.searchParams.set('clock',heldClockSeconds);
  // Preserve the preferred layout when temporarily viewing the reference alone.
  url.searchParams.set('compareSplit',splitRequested ? '1' : '0');
  for (const [key,on] of Object.entries(settings.effects)) if (on) url.searchParams.delete(key);
  for (const [key,,urlKey] of fallControls) if (settings.fall[key] === 1) url.searchParams.delete(urlKey);
  for (const [key,value] of Object.entries({strength:1,split:.5,speed:1,count:1,variant:'B',leafColor:'mixed',compareSplit:'1'})) {
    if (url.searchParams.get(key) === String(value)) url.searchParams.delete(key);
  }
  if (url.href !== location.href) history.replaceState(null,'',url);
}
function send() {
  if (ready) frame.contentWindow.postMessage({type:'home-beauty-settings',settings},location.origin);
}
function load() {
  ready = false;
  refreshClock();
  get('status').textContent = 'ホームを読み込み中…';
  const url = new URL('./game/index.html',location.href);
  writeSettings(url.searchParams);
  if (heldClockSeconds !== null) url.searchParams.set('clock',heldClockSeconds);
  frame.src = url.href;
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    if (!ready) get('status').textContent = '読み込みに時間がかかっています。「同じ配置から再生」でやり直せます。';
  },25000);
}
window.addEventListener('message',event => {
  if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'home-beauty-ready') return;
  clearTimeout(loadTimer);
  ready = true;
  refreshClock();
  get('status').textContent = '';
  send();
});
get('region').onchange = event => {
  event.stopPropagation();
  settings.region = event.target.value;
  refresh();
  load();
  remember();
};
quick.onchange = () => {
  settings.variant = quick.value;
  refresh();
  send();
  remember();
};
form.onchange = event => {
  const input = event.target;
  if (input.type === 'range') {remember();return;}
  if (input.dataset.effect) settings.effects[input.dataset.effect] = input.checked;
  else {
    settings[input.name] = ['count','speed'].includes(input.name) ? Number(input.value) : input.value;
    refresh();
  }
  if (input.name === 'count') load();
  else send();
  remember();
};
get('split-toggle').onclick = () => {
  splitRequested = !settings.compareSplit;
  if (splitRequested && settings.variant === 'E3plus') settings.variant = lastCandidate;
  refresh();
  send();
  remember();
};
function moveDivider(value) {
  settings.split = Math.round(Math.max(.05,Math.min(.95,value))*100)/100;
  updateSplit();
  send();
}
divider.addEventListener('pointerdown',event => {
  if (event.isPrimary && event.button === 0) divider.setPointerCapture(event.pointerId);
});
divider.addEventListener('pointermove',event => {
  if (!divider.hasPointerCapture(event.pointerId)) return;
  const box = stage.getBoundingClientRect();
  moveDivider((event.clientX-box.left)/box.width);
});
divider.addEventListener('lostpointercapture',remember);
divider.addEventListener('keydown',event => {
  const step = event.shiftKey ? .1 : .01;
  const moves = {ArrowLeft:settings.split-step,ArrowRight:settings.split+step,Home:.05,End:.95};
  if (!Object.hasOwn(moves,event.key)) return;
  event.preventDefault();
  moveDivider(moves[event.key]);
  remember();
});
get('clock-toggle').onclick = () => {
  const game = frame.contentWindow;
  if (!ready || !game.HomeBeauty) return;
  const paused = heldClockSeconds === null;
  heldClockSeconds = paused ? game.HomeBeauty.clockSeconds : null;
  const message = {type:'home-beauty-clock',paused};
  if (paused) message.seconds = heldClockSeconds;
  game.postMessage(message,location.origin);
  refreshClock();
  remember();
};
get('clock-replay').onclick = () => {
  heldClockSeconds = null;
  refreshClock();
  if (ready) frame.contentWindow.postMessage({type:'home-beauty-clock',seconds:0,paused:false},location.origin);
  remember();
  panel(false);
};
function panel(open,focus=true) {
  const wasOpen = document.body.classList.contains('panel-open');
  const visible = mobile.matches && open;
  document.body.classList.toggle('panel-open',visible);
  get('panel-toggle').setAttribute('aria-expanded',String(visible));
  if (focus && mobile.matches && wasOpen !== visible) (visible ? get('panel-close') : get('panel-toggle')).focus({preventScroll:true});
}
get('panel-toggle').onclick = () => panel(!document.body.classList.contains('panel-open'));
get('panel-close').onclick = () => panel(false);
get('replay').onclick = () => { load(); panel(false); };
window.addEventListener('keydown',event => {
  if (event.key === 'Escape' && document.body.classList.contains('panel-open')) panel(false);
});
if (mobile.addEventListener) mobile.addEventListener('change',() => panel(false,false));
else mobile.addListener(() => panel(false,false));
refresh();
load();
