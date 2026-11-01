import {render as adopted,alignNumerals} from '../v17/clock-v17.mjs';
export {alignNumerals};

// Keep adopted assets immutable. The clip edge lies beneath the opaque 473..503 bezel.
const shadow=`<defs><filter id="v18-shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="13"/></filter><clipPath id="v18-plate-clip"><circle cx="512" cy="495" r="493"/></clipPath></defs><circle data-v18-shadow="true" cx="512" cy="510" r="500" fill="#030b12" opacity=".42" filter="url(#v18-shadow)"/>`;
export function render(state){
 let s=adopted(state,{variant:'A'});
 s=s.replace('<g data-static-face=',shadow+'<g data-static-face=');
 s=s.replace(/<image href="[^\"]*plate\.webp"/g,m=>m+' clip-path="url(#v18-plate-clip)"');
 s=s.replace(/(<linearGradient id="v6-\d+-hand[345]"[^>]*>)[\s\S]*?<\/linearGradient>/g,(_,start)=>start+'<stop stop-color="#566979"/><stop offset=".22" stop-color="#B3C0CA"/><stop offset=".48" stop-color="#F8FAFC"/><stop offset=".55" stop-color="#D9E2E8"/><stop offset=".72" stop-color="#8B9CAA"/><stop offset="1" stop-color="#526575"/></linearGradient>');
 s=s.replace(/<g data-hand="[345]"[\s\S]*?<\/g>/g,group=>group.replace('<path ', '<path data-silver-small-hand="true" ').replace(/stroke="[^"]+"/g,'stroke="#455767"').replace(/stroke-width="[^"]+"/g,'stroke-width="1.2"'));
 return s;
}

export function renderBack(){
 const grain=Array.from({length:110},(_,i)=>`<circle cx="512" cy="495" r="${22+i*4}" fill="none" stroke="${i%2?'#fff':'#526576'}" stroke-opacity=".045" stroke-width=".7"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -76 1152 1152" role="img" aria-label="人生の時計の銀色の裏面。NAOTOCCHI、LIFE CLOCK、双葉の刻印">
 <defs><linearGradient id="v18-back-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#929DA9"/><stop offset=".2" stop-color="#F6F7F8"/><stop offset=".42" stop-color="#A6B0BA"/><stop offset=".58" stop-color="#E7EBEE"/><stop offset=".78" stop-color="#919EAC"/><stop offset="1" stop-color="#E9ECEF"/></linearGradient><linearGradient id="v18-back-face" x1=".15" y1="0" x2=".85" y2="1"><stop stop-color="#DAE1E6"/><stop offset=".29" stop-color="#F0F3F5"/><stop offset=".52" stop-color="#B4C0CA"/><stop offset=".76" stop-color="#DCE3E8"/><stop offset="1" stop-color="#9EADB9"/></linearGradient><filter id="v18-back-shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="13"/></filter><filter id="v18-engraving"><feDropShadow dx="0" dy="1.8" stdDeviation=".65" flood-color="#fff" flood-opacity=".8"/></filter></defs>
 <circle cx="512" cy="510" r="500" fill="#030b12" opacity=".42" filter="url(#v18-back-shadow)"/>
 <circle cx="512" cy="495" r="503" fill="url(#v18-back-metal)" stroke="#657380" stroke-width="1.5"/>
 <circle cx="512" cy="495" r="500.5" fill="none" stroke="#F8FAFB"/>
 <circle cx="512" cy="495" r="473" fill="url(#v18-back-face)" stroke="#6C7D8A" stroke-width="2"/>
 <circle cx="512" cy="495" r="469" fill="none" stroke="#F4F7F9" stroke-opacity=".7"/>
 <g data-brushed-silver="true">${grain}</g>
 <g fill="#526574" filter="url(#v18-engraving)" text-anchor="middle" font-family="Georgia,serif"><text x="512" y="475" font-size="47" letter-spacing="8">NAOTOCCHI</text><text x="512" y="523" font-size="21" letter-spacing="6">LIFE CLOCK</text><g data-sprout-engraving="true" transform="translate(512 581)" fill="none" stroke="#617583" stroke-width="2.4" stroke-linecap="round"><path d="M 0 22 Q 0 1 -18 -9 M 0 22 Q 0 0 18 -9"/><path d="M -1 10 Q -27 12 -30 -14 Q -8 -14 -1 10 Z M 1 10 Q 27 12 30 -14 Q 8 -14 1 10 Z"/></g></g></svg>`;
}
