const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

test('a correct Sudoku cell keeps the incomplete board; only the last cell advances once', () => {
  const h=harness();vm.runInContext('Math.random=()=>0.5',h.sandbox);
  h.api.state().ageTicks=0;
  h.api.startMinigame(h.api.games.find(g=>g.id==='sudoku-mini'));
  const view=h.get('minigameOverlay'),canvas=view.querySelector('#sdCanvas');
  const pad=view.querySelector('#sdPad'),round=view.querySelector('#sdRound');
  const put=(r,c,n)=>{
    h.dispatch(canvas,'pointerdown',{clientX:45+c*70,clientY:45+r*70,pointerId:1});
    const digit=pad.children.find(b=>b.dataset.v===String(n));
    digit.closest=selector=>selector==='button'?digit:null;
    pad.listeners.find(l=>l.type==='pointerdown'&&!l.capture).fn({target:digit,preventDefault(){}});
  };
  put(0,0,1);h.advance(1701);
  assert.equal(round.textContent,'1/3問目','one correct digit is not a completed board');
  for(const [r,c,n] of [[0,1,2],[0,2,3],[0,3,4],[1,0,3],[1,1,4],[1,2,1]])put(r,c,n);
  h.advance(1701);assert.equal(round.textContent,'2/3問目');
  h.advance(1701);assert.equal(round.textContent,'2/3問目','one solved board schedules one transition');
});

const rain=h=>(h.get('weatherFx').innerHTML.match(/wx-drop/g)||[]).length;
function rainyHome(reducedMotion=false) {
  const h=harness({reducedMotion});
  h.api.state().lifetime.weatherMode='rain';h.api.state().lifetime.timeMode='day';
  h.api.renderEnvironment();return h;
}
test('weather follows motion preferences immediately in both directions', () => {
  const h=rainyHome(true);assert.equal(rain(h),0);
  h.setReducedMotion(false);assert.equal(rain(h),42);
  h.setReducedMotion(true);assert.equal(rain(h),0);
});
test('returning home after a slow minigame rebuilds the unchanged rain in lightweight mode', () => {
  const h=rainyHome();assert.equal(rain(h),42);
  for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  h.api.renderEnvironment();assert.equal(rain(h),18);
});
test('life records suppress weather and seasonal foreground effects until returning home', () => {
  const h=rainyHome();h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
  assert.equal(h.get('weatherFx').classList.contains('suppressed'),false);
  h.get('lifeCardOverlay').classList.remove('hidden');h.api.render();
  assert.equal(h.get('screenNormal').classList.contains('hidden'),true);
  assert.equal(h.get('weatherFx').classList.contains('suppressed'),true);
  assert.equal(h.get('seasonFrontFx').classList.contains('suppressed'),true);
});
