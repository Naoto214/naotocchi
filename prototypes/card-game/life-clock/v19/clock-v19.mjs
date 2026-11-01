import {render as adopted} from '../v18/clock-v18.mjs';
export {alignNumerals,renderBack} from '../v18/clock-v18.mjs';

// V18 is immutable. Move whole central-hand groups, preserving paths, materials,
// angles and the following bearing cap. SVG paints the last sibling on top.
export function render(state){
 const svg=adopted(state),pattern=/<g data-hand="([012])"[^]*?<\/g>/g;
 const hands=new Map([...svg.matchAll(pattern)].map(m=>[Number(m[1]),m[0]]));
 if(hands.size!==3)throw Error('Expected three central clock hands');
 let layer=0;
 return svg.replace(pattern,()=>hands.get(layer++));
}
