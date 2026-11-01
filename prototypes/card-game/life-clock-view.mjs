import {clockState} from './life-clock-state.mjs';
import {mountClockTurn} from './life-clock-turn.mjs';
// Public projection only: this component cannot commit or save a match.
export function mountLifeClock({dialog,getView,onPause,onResume,loadRenderer=()=>import('./life-clock-render.mjs')}){
 dialog.innerHTML=`<header class="life-clock-toolbar"><h2 id="life-clock-title">人生の時計 <small>V19</small></h2><button type="button" id="life-clock-flip" aria-pressed="false">裏へ</button><button type="button" id="life-clock-zoom" aria-pressed="false">拡大</button><button type="button" id="life-clock-close" autofocus>閉じる ×</button></header><div class="life-clock-body"><div class="life-clock-stage"><div class="life-clock-scene"><div id="life-clock-face"></div></div></div><aside class="life-clock-info"><p id="life-clock-status" role="status">対戦のいまを映しています</p><div id="life-clock-values"></div><p id="life-clock-hint" class="life-clock-note"></p><p class="life-clock-note">閲覧中は対戦の進行を止めています。閉じると対戦へ戻ります。</p></aside></div>`;
 const face=dialog.querySelector('#life-clock-face'),status=dialog.querySelector('#life-clock-status'),values=dialog.querySelector('#life-clock-values'),zoom=dialog.querySelector('#life-clock-zoom');
 const turn=mountClockTurn({scene:dialog.querySelector('.life-clock-scene'),rotor:face,button:dialog.querySelector('#life-clock-flip'),hint:dialog.querySelector('#life-clock-hint')});
 let revision=0,returnFocus=true;
 function close({focus=true}={}){returnFocus=focus;if(dialog.open){revision++;turn.reset();dialog.close();}}
 dialog.querySelector('#life-clock-close').onclick=()=>close();
 zoom.onclick=()=>{const enabled=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(enabled));zoom.textContent=enabled?'全体表示':'拡大';dialog.classList.toggle('life-clock-zoomed',enabled);turn.setZoom(enabled);if(!enabled){const stage=dialog.querySelector('.life-clock-stage');stage.scrollLeft=0;stage.scrollTop=0;}};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',()=>{if(dialog.open)return;revision++;turn.reset();face.replaceChildren();if(returnFocus)document.querySelector('[data-life-clock]')?.focus({preventScroll:true});onResume();});
 async function open(){
  if(dialog.open)return;
  const view=getView();if(!view)return;
  returnFocus=true;const request=++revision;turn.reset();
  dialog.classList.remove('life-clock-zoomed');zoom.setAttribute('aria-pressed','false');zoom.textContent='拡大';zoom.disabled=true;
  face.replaceChildren();values.replaceChildren();status.textContent='時計を読み込んでいます…';
  dialog.showModal();onPause();dialog.querySelector('#life-clock-close').focus({preventScroll:true});
  try{
   const state=clockState(view),seatName=seat=>seat+(view.mode==='cpu'?(seat===view.humanSeat?'（あなた）':'（CPU）'):'');
   const lines=[['gold','ラウンド',String(state.round)],['red',`先攻 ${seatName(state.firstSeat)}`,`時 ${state.firstTime} · そだち ${state.firstGrowth}`],['green',`後攻 ${seatName(state.secondSeat)}`,`時 ${state.secondTime} · そだち ${state.secondGrowth}`],['gold','終了ラウンド',`${['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][state.end]}（${state.end}）`]];
   for(const [color,label,value] of lines){const p=document.createElement('p');p.className='clock-value '+color;const strong=document.createElement('strong');strong.textContent=label;p.append(strong,document.createTextNode(value));values.append(p);}
   const renderer=await loadRenderer();if(request!==revision||!dialog.open)return;
   face.innerHTML=`<div class="life-clock-surface life-clock-front" data-clock-front>${renderer.renderClock(state)}</div><div class="life-clock-surface life-clock-back" data-clock-back aria-hidden="true">${renderer.renderBack()}</div>`;renderer.alignNumerals(face);
   if(document.fonts?.ready)document.fonts.ready.then(()=>{if(request===revision&&dialog.open)renderer.alignNumerals(face);});
   status.textContent='対戦のいまを映しています';zoom.disabled=false;turn.setEnabled(true);
  }catch{if(request!==revision||!dialog.open)return;face.replaceChildren();status.textContent='時計を読み込めませんでした。閉じてから、もう一度お試しください。';}
 }
 return {open,close,get isOpen(){return dialog.open;}};
}
