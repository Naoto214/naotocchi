// Reuse the approved app/controller/history/presentation without editing them.
import{sixWorlds}from './six-terrain.mjs';
const terrain=document.querySelector('#terrain-style');terrain.options[0].value='old';
await import('./app.mjs');
const world=document.querySelector('#world'),puzzle=document.querySelector('#puzzle');
for(const option of world.options){option.hidden=option.disabled=!sixWorlds[option.value];if(sixWorlds[option.value])option.textContent=sixWorlds[option.value].name}
const requested=new URLSearchParams(location.search).get('world');world.value=sixWorlds[requested]?requested:'sea';terrain.options[0].value='six';
const render=world.onchange;world.onchange=()=>{const w=sixWorlds[world.value];document.querySelector('#environment-legend').textContent='床／固定壁：'+w.legend;document.querySelector('#environment-rules').textContent=w.rules;render()};
const change=puzzle.onchange;puzzle.onchange=()=>{const selected=world.value,style=terrain.value;terrain.options[0].value='old';terrain.value='old';change();world.value=selected;terrain.options[0].value='six';terrain.value=style;world.onchange()};
world.onchange();
