(() => {
  'use strict';
  const menu=document.getElementById('reader-menu'), toolbar=document.querySelector('.toolbar');
  const nodes=[...document.querySelectorAll('.source[data-source-index]')];
  const signature=document.getElementById('signature');
  if(signature)nodes.push(signature);
  const sizes=[...document.querySelectorAll('[data-size]')];
  const fontKey='madoromi38-font-size-v4',positionKey='madoromi38-reading-position-v6';
  const persistent=window.self===window.top;
  const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const write=(k,v)=>{if(persistent)try{localStorage.setItem(k,v)}catch{}};
  let held=null, ready=false, restoring=false, timer;
  if(persistent)history.scrollRestoration='manual';
  const edge=()=>toolbar.getBoundingClientRect().bottom+12;
  const measure=()=>document.documentElement.style.setProperty('--bar-height',`${toolbar.offsetHeight}px`);
  function capture(){
    if(signature)document.body.classList.toggle('signature-visible',signature.getBoundingClientRect().top<window.innerHeight*.5);
    if(window.scrollY<8)return {index:'0',offset:0,top:true,hash:location.hash};
    const y=edge(),el=nodes.find(n=>n.getBoundingClientRect().bottom>y);
    if(!el)return held;
    const r=el.getBoundingClientRect();return {index:el.dataset.sourceIndex,offset:(r.top-y)/Math.max(1,r.height),hash:location.hash};
  }
  function restore(a){
    if(!a||!Number.isFinite(a.offset))return;
    const el=nodes.find(n=>n.dataset.sourceIndex===String(a.index));if(!el)return;
    restoring=true;
    if(a.top)window.scrollTo(0,0);else{const r=el.getBoundingClientRect();window.scrollBy(0,r.top-edge()-a.offset*r.height)}
    requestAnimationFrame(()=>{restoring=false;held=capture()});
  }
  function rememberEntry(anchor){try{history.replaceState({...history.state,whiteReader:anchor},'')}catch{}}
  function updateResume(){
    if(!bookmark||Number(bookmark.index)<2)return;
    const el=nodes.find(n=>n.dataset.sourceIndex===String(bookmark.index));if(!el)return;
    resume.hidden=false;resume.href=`#${el.closest('.chapter')?.id||el.id}`;
  }
  function save(){
    if(!ready||restoring)return;held=capture();if(!held)return;
    rememberEntry(held);
    if(Number(held.index)>=2){bookmark=held;write(positionKey,JSON.stringify(held));updateResume()}
  }
  function setSize(value){
    const size=value===17?16.5:value;if(![16,16.5,19,21].includes(size))return;
    const anchor=ready?capture():null;
    document.documentElement.style.setProperty('--text-size',`${size}px`);
    sizes.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.size)===size)));
    if(anchor)restore(anchor);write(fontKey,String(size));
  }
  let bookmark;try{bookmark=JSON.parse(read(positionKey))}catch{}
  const resume=document.getElementById('resume');updateResume();
  resume.addEventListener('click',e=>{
    e.preventDefault();if(!bookmark)return;
    const target={...bookmark};save();
    if(location.hash!==resume.hash)history.pushState({whiteReader:target},'',resume.hash);
    restore(target);
  });
  const savedSize=Number(read(fontKey));const legacy=Number(read('madoromi38-font-size'));
  setSize(savedSize||({18:16.5,20:19,22:21}[legacy]||legacy||16.5));
  sizes.forEach(b=>b.addEventListener('click',()=>setSize(Number(b.dataset.size))));
  function gotoHash(){
    let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
    const target=document.getElementById(id||'top');if(!target)return;
    if(id==='top'||!id)window.scrollTo(0,0);else target.scrollIntoView();
    held=capture();save();
  }
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    if(e.defaultPrevented)return;e.preventDefault();menu.open=false;save();
    if(a.hash!==location.hash)history.pushState({},'',a.hash);
    gotoHash();
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus()}});
  document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
  window.addEventListener('popstate',e=>{menu.open=false;if(e.state?.whiteReader)restore(e.state.whiteReader);else gotoHash()});
  window.addEventListener('scroll',()=>{if(ready&&!restoring){held=capture();clearTimeout(timer);timer=setTimeout(save,180)}},{passive:true});
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
  let width=window.innerWidth;
  window.addEventListener('resize',()=>{measure();if(window.innerWidth!==width){width=window.innerWidth;restore(held)}});
  window.addEventListener('pageshow',e=>{if(e.persisted){measure();restore(held)}});
  window.addEventListener('load',()=>{
    measure();
    if(persistent&&history.state?.whiteReader)restore(history.state.whiteReader);
    else if(persistent&&bookmark&&(!location.hash||bookmark.hash===location.hash))restore(bookmark);
    else if(location.hash)gotoHash();
    ready=true;held=capture();rememberEntry(held);
  });
  measure();
})();
