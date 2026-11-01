import {render as v9,sample} from '../v9/clock-v9.mjs';
export * from '../v9/clock-v9.mjs';
export const variants={A:{name:'A · V9 B現行',size:40},B:{name:'B · 数字＋10%',size:44},C:{name:'C · 数字＋15%',size:46}};
export function render(state=sample,{variant='A',crop='full'}={}){
 if(!variants[variant])throw Error('Unknown variant');
 const custom={upper:'120 65 470 340',leaves:'75 240 310 260'}[crop];
 let s=v9(state,{variant:'B',crop:custom?'full':crop});
 s=s.replace(/(<g data-main-number="\d+"><text[^>]*font-size=")[^"]+/g,(_,prefix)=>prefix+variants[variant].size);
 if(custom)s=s.replace(/viewBox="[^"]+"/,`viewBox="${custom}"`);
 return s;
}
