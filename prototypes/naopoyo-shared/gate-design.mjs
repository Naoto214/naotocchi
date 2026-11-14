// Shared presentation entry. Original painters are called, never redrawn here.
import {drawGate} from '../naopoyo-chapter2/gate-art.mjs';
import {paintTile} from '../../docs/naopoyo-gimmick-atlas-v2/tile-art.mjs';
export {DEFAULT_DESIGN} from './gate-choice.mjs';
export const conditionText=g=>g.exact!==undefined?'='+g.exact:g.min!==undefined?'≥'+g.min:g.max!==undefined?'≤'+g.max:'';
export const APPROVED_DESIGN='A';
export function gateVisual(gate){return {...gate,exact:gate.exact===undefined?conditionText(gate):gate.exact}}
export function paintGate(c,gate,{design='A',state='normal',symbols=false,opening,glow=0}={}){
 if(design==='A'){
  // Original exact-number glyph is the default. min/max/symbols are explicitly
  // labelled comparison extensions; only the painter's text argument changes.
  const exact=symbols||gate.exact===undefined?conditionText(gate):gate.exact;
  drawGate(c,{...gate,exact,pulse:opening===undefined&&state==='met'?1:0,occupied:opening===undefined?false:!!gate.occupied,...(opening===undefined?{}:{opening,glow})});
 }else if(design==='B'){
  c.save();c.translate(gate.x,gate.y);
  // Preserve the V2 painter byte-for-byte, replacing only its example '=2' text.
  const fill=c.fillText;
  c.fillText=function(text,...args){return fill.call(this,text==='=2'?conditionText(gate):text,...args)};
  try{paintTile(c,'fixture.gate',{phase:state==='met'?1:0})}finally{c.fillText=fill;c.restore()}
 }else throw Error('Unknown gate design');
}
