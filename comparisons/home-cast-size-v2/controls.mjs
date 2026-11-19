import {regions,times,counts,roles,modes,isArchivedLink,readScene,trialSettings,gameURL,median} from './shell-model.mjs';

const query = new URLSearchParams(location.search);
if (isArchivedLink(query)) location.replace(new URL('./v1/'+location.search+location.hash,location.href));
else start(readScene(query));

function start(scene) {
  const byId = id => document.getElementById(id);
  const compact = matchMedia('(max-width:739px), (max-height:500px) and (max-width:940px)');
  const panel = byId('panel');
  let frame = byId('home');
  let ready = false;
  let settled = false;
  let deadline;
  const formatter = new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1,minimumFractionDigits:1});
  const panelOpen = () => !compact.matches || document.body.classList.contains('settings-open');

  // Official bounds describe the source PNG's alpha footprint on a 128-unit
  // canvas. Apply them to the live image's projected rectangle (without gear).
  function measure() {
    if (!settled || !panelOpen()) return;
    const inner = frame.contentWindow;
    const actors = inner.HomeCastTrial?.inspect() || [];
    const list = document.createDocumentFragment();
    const dimension = (w,h) => formatter.format(w)+' × '+formatter.format(h);
    const samples = new Map(roles.map(([id]) => [id, []]));
    for (const actor of actors) {
      const img = inner.document.querySelector('[data-diorama-actor="'+CSS.escape(actor.key)+'"] img.character-asset');
      if (!img?.naturalWidth) continue;
      const pathname = new URL(img.currentSrc || img.src,inner.location.href).pathname;
      const at = pathname.indexOf('/assets/');
      const asset = at < 0 ? actor.asset : decodeURIComponent(pathname.slice(at+1));
      const box = inner.NaotocchiCastBounds?.[asset]?.box;
      if (!box || !samples.has(actor.kind)) continue;
      const r = img.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const width = r.width*(box[2]-box[0])/128, height = r.height*(box[3]-box[1])/128;
      samples.get(actor.kind).push([width,height]);
      if (actor.kind==='companion') {
        const row=document.createElement('tr'), name=document.createElement('th'), size=document.createElement('td');
        name.scope='row';name.textContent=actor.label || img.alt || actor.id;
        size.textContent=dimension(width,height);
        row.append(name,size);list.append(row);
      }
    }
    for (const [role] of roles) {
      const set = samples.get(role);
      byId('size-'+role).textContent = set.length ? [0,1].map(i=>formatter.format(median(set.map(n=>n[i])))).join(' × ') : '—';
    }
    byId('companion-detail').hidden=!list.childElementCount;
    byId('individual-sizes').replaceChildren(list);
    byId('measurement-status').textContent = '測定 '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  function writeLink() {
    const url = new URL(location.href);
    for (const key of ['region','time','count','mode']) url.searchParams.set(key,scene[key]);
    url.searchParams.set('paused', scene.paused ? '1':'0');
    history.replaceState(null,'',url);
  }
  function paintControls() {
    for (const button of document.querySelectorAll('[data-mode]'))
      button.setAttribute('aria-pressed',String(scene.mode===button.dataset.mode));
    byId('region').value=scene.region;
    byId('time').value=scene.time;
    for (const input of document.querySelectorAll('input[name=count]')) input.checked=Number(input.value)===scene.count;
    byId('freeze-text').textContent=scene.paused?'再生':'固定';
    byId('freeze').setAttribute('aria-pressed',String(scene.paused));
    byId('freeze').setAttribute('aria-label',scene.paused?'住民の動きを再生':'配置を固定');
    roles.forEach(([role],i) => { byId('scale-'+role).textContent=modes[scene.mode][i]+'%'; });
  }
  function send() {
    if (ready) frame.contentWindow.postMessage({type:'home-cast-settings',settings:trialSettings(scene)},location.origin);
  }
  function load() {
    ready=false;
    settled=false;
    document.body.dataset.ready='false';
    byId('measure').disabled=true;
    for (const [role] of roles) byId('size-'+role).textContent='—';
    byId('measurement-status').textContent='';
    byId('companion-detail').hidden=true;byId('individual-sizes').replaceChildren();
    byId('status').textContent='ホームを読み込んでいます…';
    byId('retry').hidden=true;
    clearTimeout(deadline);
    const next=document.createElement('iframe');
    Object.assign(next,{id:'home',title:'なおとっちのホーム',allow:'autoplay',src:gameURL(scene,location.href).href});
    frame.replaceWith(next);
    frame=next;
    deadline=setTimeout(()=>{
      if (!settled) {
        byId('status').textContent='地形と住民の読み込みを待っています。';
        byId('retry').hidden=false;
      }
    },45000);
  }
  function update(reload) {
    paintControls();
    writeLink();
    if (reload) load(); else send();
  }
  for (const [role,caption] of roles) {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope='row'; name.textContent=caption;
    const scale=document.createElement('td'), size=document.createElement('td');
    scale.id='scale-'+role; size.id='size-'+role;
    row.append(name,scale,size); byId('measurements').append(row);
  }
  for (const button of document.querySelectorAll('[data-mode]'))
    button.addEventListener('click',()=>{
      const previous=scene.mode;
      scene.mode=button.dataset.mode;
      if(previous!==scene.mode) update(previous==='final'||scene.mode==='final');
    });
  for (const [id,options] of [['region',regions],['time',times]]) {
    const select=byId(id);
    for (const [value,label] of options) select.add(new Option(label,value));
    select.addEventListener('change',()=>{scene[id]=select.value;update(id==='region');});
  }
  for (const count of counts) {
    const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
    input.type='radio';input.name='count';input.value=String(count);
    span.textContent=count+'体';label.append(input,span);byId('counts').append(label);
    input.addEventListener('change',()=>{scene.count=count;update(true);});
  }
  window.addEventListener('message',event=>{
    if (event.origin!==location.origin || event.source!==frame.contentWindow) return;
    if (event.data?.type==='home-cast-ready') { ready=true;send(); }
    if (event.data?.type==='home-cast-state' && ready) {
      clearTimeout(deadline);settled=true;document.body.dataset.ready='true';
      byId('measure').disabled=false;byId('status').textContent='';byId('retry').hidden=true;
      measure();
    }
  });
  byId('retry').addEventListener('click',load);
  byId('freeze').addEventListener('click',()=>{scene.paused=!scene.paused;update(false);});
  byId('measure').addEventListener('click',measure);
  function setPanel(open, restore=false) {
    document.body.classList.toggle('settings-open',open);
    document.querySelector('.stage').inert=open;
    document.querySelector('.bar').inert=open;
    byId('scrim').hidden=!open;
    byId('settings-toggle').setAttribute('aria-expanded',String(open));
    if(open) {
      panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');byId('settings-close').focus();measure();
    } else {
      panel.removeAttribute('role');panel.removeAttribute('aria-modal');if(restore)byId('settings-toggle').focus();
    }
  }
  byId('settings-toggle').addEventListener('click',()=>setPanel(true));
  byId('settings-close').addEventListener('click',()=>setPanel(false,true));
  byId('scrim').addEventListener('click',()=>setPanel(false,true));
  document.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('settings-open'))return;
    if(event.key==='Escape'){event.preventDefault();setPanel(false,true);}
    if(event.key==='Tab'){
      const first=byId('settings-close'),last=panel.querySelector('.archive');
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  compact.addEventListener('change',()=>{if(!compact.matches){setPanel(false);measure();}});
  paintControls();load();
}
