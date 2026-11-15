// The existing controller, gestures, presentation and engine are loaded unchanged.
// The DOM selector starts with nature terrain, so use a supported world during startup.
import{natureWorlds}from './nature-terrain.mjs';
// app initializes the first puzzle as sky. Hide no geometry and alter no rule:
// defer terrain selection until its initial scene has been created.
const terrain=document.querySelector('#terrain-style');terrain.options[0].value='old';
await import('./app.mjs');
const world=document.querySelector('#world'),puzzle=document.querySelector('#puzzle');
for(const option of world.options){option.hidden=option.disabled=!natureWorlds[option.value];if(natureWorlds[option.value])option.textContent=natureWorlds[option.value].name}
world.value=new URLSearchParams(location.search).get('world')==='snow'?'snow':'sea';
terrain.options[0].value='nature';
const change=puzzle.onchange;puzzle.onchange=()=>{const selected=world.value;terrain.options[0].value='old';change();world.value=selected;terrain.options[0].value='nature';world.onchange()};
world.onchange();
