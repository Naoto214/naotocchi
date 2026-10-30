import {BOARD} from './data.mjs';
import {tileDefinition} from './tiles.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const edges=BOARD.flatMap(n=>n.next.map(to=>[n,BOARD[to]]));
const distanceToSegment=(x,y,a,b)=>{const vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*vx+(y-a.y)*vy)/(vx*vx+vy*vy)));return Math.hypot(x-a.x-vx*t,y-a.y-vy*t);};
const clear=(x,y,r)=>edges.every(([a,b])=>distanceToSegment(x,y,a,b)>r)&&BOARD.every(n=>Math.hypot(x-n.x,y-n.y)>r+8);
const tree=(x,y,k=1,pine=false)=>`<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="7" rx="20" ry="7" fill="#34574724"/><path d="M-2 7V-33H3V7" fill="#80684c"/>${pine?'<path d="M0-58L-18-29H-12L-23-10H23L12-29H18Z" fill="#426b56"/><path d="M0-58L-12-29H-5L-16-12H1Z" fill="#668d67"/>':'<path d="M-5-54C-27-55-30-33-19-23C-30-9-10 4 3-7C23 2 34-17 25-29C29-49 9-62-5-54" fill="#527b56"/><path d="M-6-50C-24-48-25-35-15-28C-8-36 6-29 13-43C9-52 0-55-6-50" fill="#88a66e"/><path d="M7-20q10 5 16-4" stroke="#b2bf80" stroke-width="2" fill="none"/>'}</g>`;
const house=(x,y,k=1,roof='#687e7a',city=false)=>`<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="9" rx="34" ry="9" fill="#485b4226"/><path d="M-26-30H24V7H-26Z" fill="#f0dfba" stroke="#b1ae89" stroke-width="1.4"/><path d="M24-30L38-20V3L24 7Z" fill="#c4b995"/><path d="M-34-28L-5-49L34-28Z" fill="${roof}"/><path d="M-5-49L9-48L41-21L34-28Z" fill="#516561"/><path d="M-24-30H25M-18-35H16M-12-40H7" stroke="#e1dfbe55" stroke-width="1.3"/><path d="M-18-19H-5V-5H-18Z" fill="#82aaa3"/><path d="M-12-19V-5M-18-12H-5" stroke="#f8eed4"/><path d="M8-18H19V7H8Z" fill="#9b8766"/>${city?'<path d="M-29-21H26L29-12H-31Z" fill="#bf8566"/><path d="M-23-20v7m9-7v7m9-7v7m9-7v7m9-7v7" stroke="#f6e8ce" stroke-width="4"/>':''}</g>`;
const ridge=(x,y,k=1)=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M-65 36L-23-48L-6-20L16-69L65 36Z" fill="#81977b"/><path d="M16-69L7 6L65 36Z" fill="#627c6b"/><path d="M-23-48L-19 9L-65 36Z" fill="#a3b08b"/><path d="M-23-48L-36-23L-23-29L-13-15L-6-20M16-69L2-37L15-42L29-30Z" fill="#e6e7c9"/><path d="M-40 23l14-23 9 22M28 8l16 19" fill="none" stroke="#bac2a0" stroke-width="2"/></g>`;
const label=(x,y,text,size=17,color='#3f6450')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="700" fill="${color}" stroke="#f3efd5" stroke-width="5" paint-order="stroke">${text}</text>`;

/** A compact, north-up interpretation of WORLD_GEOGRAPHY v2 / canon v1 / D2. */
export function terrainSvg(){
 let art=`<defs>
 <linearGradient id="jp-land" x2="0.65" y2="1"><stop stop-color="#d2dcb0"/><stop offset=".55" stop-color="#b8cb96"/><stop offset="1" stop-color="#e3d4a6"/></linearGradient>
 <linearGradient id="jp-ocean" x2=".3" y2="1"><stop stop-color="#8fc6bd"/><stop offset="1" stop-color="#4a9aaa"/></linearGradient>
 <linearGradient id="jp-lake" x2=".7" y2="1"><stop stop-color="#b7dfca"/><stop offset="1" stop-color="#66a9ad"/></linearGradient>
 <pattern id="jp-grain" width="23" height="27" patternUnits="userSpaceOnUse"><circle cx="4" cy="8" r=".8" fill="#62744720"/><path d="M15 20h3" stroke="#fff9df4d"/></pattern>
 <pattern id="jp-fields" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M0 3h18M0 12h18" stroke="#e1dba8" stroke-width="3"/><path d="M5 3v4m8 5v4" stroke="#8da46d" stroke-width="1.3"/></pattern>
 <filter id="tile-shadow" x="-.3" y="-.4" width="1.6" height="1.9"><feDropShadow dx="0" dy="3" stdDeviation="1.7" flood-color="#425645" flood-opacity=".24"/></filter>
 <clipPath id="jp-frame"><rect width="900" height="800" rx="28"/></clipPath>
 </defs><g clip-path="url(#jp-frame)">
 <rect width="900" height="800" fill="url(#jp-ocean)"/>
 <path data-feature="coast" d="M0 0H900V485Q842 462 791 544Q775 670 688 748Q655 782 596 800H300Q253 762 215 756Q184 733 150 735Q62 738 0 691Z" fill="url(#jp-land)" stroke="#ecdeb3" stroke-width="16"/>
 <path d="M0 0H530Q498 80 469 137Q428 215 408 290Q371 355 300 400Q177 377 0 435Z" fill="#9db881" opacity=".58"/>
 <path d="M465 95Q540 110 525 200T474 320Q437 373 351 435L295 420Q397 323 416 233T465 95" fill="#6d966d" opacity=".3"/>
 <path d="M560 80Q624 115 634 230T663 435Q672 517 721 592L774 584Q741 469 759 326T749 91Z" fill="#dfe1b6"/>
 <path d="M35 461Q175 435 280 482L327 645Q263 731 113 715L22 665Z" fill="#c9c8ae"/>
 <path d="M50 475Q173 452 268 492L311 637Q249 710 113 697" fill="none" stroke="#e1dcc0" stroke-width="7"/>
 <path d="M115 322L213 292L238 373L136 401Z" fill="#acbf7c" stroke="#d6d4a0" stroke-width="5"/><path d="M115 322L213 292L238 373L136 401Z" fill="url(#jp-fields)"/>
 <path d="M281 421L334 414L359 469L290 486Z" fill="#c3c88c" stroke="#ddd6a7" stroke-width="4"/><path d="M281 421L334 414L359 469L290 486Z" fill="url(#jp-fields)"/>
 <g data-feature="west-range">${ridge(477,59,.88)}${ridge(478,142,.84)}${ridge(500,229,.65)}${ridge(486,340,.67)}${ridge(370,452,.64)}</g>
 <g data-feature="east-range">${ridge(817,63,1.1)}${ridge(834,165,1.03)}${ridge(838,264,.94)}${ridge(828,356,.85)}${ridge(799,444,.7)}${ridge(765,518,.55)}</g>
 <path data-feature="divide" d="M357 400Q305 423 259 443T210 490" fill="none" stroke="#8a8e66" stroke-width="15" opacity=".55"/>
 <path d="M357 400Q305 423 259 443T210 490" fill="none" stroke="#e8d9b1" stroke-width="2" stroke-dasharray="4 8"/>
 <path data-feature="tenryu" d="M682 177Q736 206 725 273T737 400Q755 476 727 544T683 651Q678 718 649 768L646 803" fill="none" stroke="#d5e5bb" stroke-width="26"/>
 <path d="M682 177Q736 206 725 273T737 400Q755 476 727 544T683 651Q678 718 649 768L646 803" fill="none" stroke="#73b1b0" stroke-width="18"/>
 <path d="M686 183Q739 208 729 274T741 400Q758 476 731 544T687 651Q682 718 653 768" fill="none" stroke="#c1e0cb" stroke-width="3"/>
 <path data-feature="source-lake" d="M625 149Q658 131 694 158Q719 180 694 210Q675 230 642 210Q613 194 625 149Z" fill="url(#jp-lake)" stroke="#e7e3ba" stroke-width="6"/>
 <path d="M643 168q15 6 29 0m-35 21q23 8 45 0" fill="none" stroke="#e2eee0" stroke-width="2"/>
 <path data-feature="shonai" d="M194 465Q175 492 176 542T158 610Q154 656 181 692T214 755" fill="none" stroke="#e5dfbc" stroke-width="22"/>
 <path d="M194 465Q175 492 176 542T158 610Q154 656 181 692T214 755" fill="none" stroke="#84b9b2" stroke-width="14"/>
 <path d="M191 479Q171 501 172 543T154 610Q150 656 177 694T210 755" fill="none" stroke="#cae2ce" stroke-width="2"/>
 <path data-feature="bay" d="M180 751Q209 759 254 784L268 800H153L141 769Z" fill="#73b2b5"/>
 <path d="M0 710Q80 752 147 752M273 786l23 14M699 755Q789 677 804 550" stroke="#d0e5cc" stroke-width="3" fill="none"/>
 `;
 // Scenery stays away from the actual route and tile hit areas.
 for(let y=70;y<420;y+=38)for(let x=280;x<535;x+=35)if(clear(x,y,30))art+=tree(x,y,.55+((x+y)%7)/30,y<180);
 for(let y=70;y<290;y+=52)for(let x=55;x<240;x+=45)if(clear(x,y,32))art+=tree(x+(y%7)*2-6,y+(x%11)-5,.55+((x+y)%9)/35,true);
 for(const [x,y,k]of [[624,359,.82],[617,422,.9],[652,477,.65],[322,330,.72],[170,294,.75],[305,497,.65]])if(clear(x,y,33))art+=house(x,y,k);
 for(let y=490;y<706;y+=47)for(let x=100;x<310;x+=55)if(clear(x,y,29))art+=house(x,y,.57,(x+y)%3?'#6b8b87':'#b67d61',true);
 for(let y=422;y<648;y+=40)for(let x=350;x<644;x+=42)if(clear(x,y,27))art+=tree(x+(y%9)-4,y+(x%9)-4,.4+((x+y)%7)/35);
 // Each edge exists once. Bridge material appears only at known river crossings.
 const bridgeEdges=new Set(['1-2','23-24','25-30','29-34','33-34']);
 for(const [a,b]of edges){const key=`${a.id}-${b.id}`,bridge=bridgeEdges.has(key),surface=bridge?'bridge':a.worldRegion==='city'&&b.worldRegion==='city'?'paving':a.worldRegion==='sea'&&b.worldRegion==='sea'?'sand':'soil';
 const palette={soil:['#9f9267','#d5be8c','#e8d5a5'],bridge:['#746e52','#b99764','#d7b982'],paving:['#8d9b8d','#b9c2ad','#dce0c7'],sand:['#c7b277','#ead7a6','#f5e6be']}[surface],d=`M${a.x} ${a.y}L${b.x} ${b.y}`;
 art+=`<g data-edge="${key}" data-surface="${surface}"><path d="${d}" stroke="${palette[0]}" stroke-width="36" stroke-linecap="round" fill="none" opacity=".5"/><path d="${d}" stroke="${palette[1]}" stroke-width="31" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${palette[2]}" stroke-width="23" stroke-linecap="round" fill="none"/>`;
 const len=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/len,dy=(b.y-a.y)/len;
 if(bridge||surface==='paving')for(let t=8;t<len-8;t+=bridge?8:17){const x=a.x+dx*t,y=a.y+dy*t;art+=`<path d="M${x-dy*12} ${y+dx*12}L${x+dy*12} ${y-dx*12}" stroke="${bridge?'#987b53':'#a7b3a2'}" stroke-width="${bridge?2:1}"/>`;}
 if(bridge)for(const side of [-1,1])art+=`<path d="M${a.x-dy*17*side} ${a.y+dx*17*side}L${b.x-dy*17*side} ${b.y+dx*17*side}" stroke="#8a7251" stroke-width="3"/>`;
 const x=a.x+(b.x-a.x)*.53,y=a.y+(b.y-a.y)*.53,angle=Math.atan2(dy,dx)*180/Math.PI;
 art+=`<path d="M-3-3L1 0L-3 3" transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke="#858264" stroke-width="1.8"/></g>`;
 }
 for(let i=0;i<125;i++){const x=40+(i*113)%710,y=60+(i*97)%650;if(clear(x,y,23)&&!(x>615&&x<755&&y<260))art+=`<path d="M${x-3} ${y}l3-5 2 5 4-3" fill="none" stroke="#8ca577" stroke-width="1.5" opacity=".8"/>`;}
 for(const [x,y]of [[824,600],[847,673],[788,740],[728,785],[57,770],[859,762]])art+=`<path d="M${x} ${y}q12 5 23 0m6 0q10 5 21 0" fill="none" stroke="#d4e9d5" stroke-width="2" opacity=".65"/>`;
 art+=`<g transform="translate(835 697)"><ellipse cy="20" rx="25" ry="4" fill="#3d899450"/><path d="M-25 8H24L15 20H-12Z" fill="#bf9567"/><path d="M0-30V9" stroke="#657a68" stroke-width="2"/><path d="M-3-25L-3 4H-22Z" fill="#f5ebcf"/><path d="M3-21L18 4H3Z" fill="#dfd8b9"/></g>`;
 art+=`<rect width="900" height="800" fill="url(#jp-grain)" pointer-events="none"/>`;
 art+=label(151,58,'なおとっちの日本めぐり',19)+label(151,81,'山と川のあいだで、ひとめぐり。',10,'#708364');
 art+=label(660,246,'かわ・みずうみ',13,'#427e80')+label(625,394,'おうち',17)+label(360,164,'もり',18)+label(165,428,'いなか',18)+label(93,504,'とかい',18)+label(540,695,'うみ',18,'#4d8280')+label(321,455,'ぶんすいかい',10)+label(797,421,'ひがしのやまなみ',11)+label(440,53,'にしのやまち',11);
 art+=`<g transform="translate(849 72)" fill="#617965"><path d="M0-22L-8 5L0 1L8 5Z"/><path d="M0 1V23" stroke="#617965" stroke-width="1.5"/><text y="-30" text-anchor="middle" font-size="12" font-family="sans-serif">北</text></g></g>`;
 return art;
}
export function tileSvg(n,fill,icon,{active=false,visited=false,fork=false,debug=false}={}){
 const def=tileDefinition(n.type),paint=fill??def.fill,symbol=icon??def.icon,stroke=active?'#c78938':fork?'#b18b3f':visited?'#ae8b4c':'#8c9273';
 let shape=def.shape==='gable'?'M-22 18V-13L0-24L22-13V18Z':def.shape==='arch'?'M-22 18V-4A22 22 0 0 1 22-4V18Z':def.shape==='cut'?'M-15-20H15L23-12V13L16 20H-16L-23 13V-12Z':null;
 return `<g id="tile-${n.id}" data-node="${n.id}" data-tile-type="${n.type}" data-world-region="${n.worldRegion}" data-shape="${def.shape}" aria-label="${esc(`${n.label}：${def.label}。${def.description}`)}"><title>${esc(`${n.label} · ${def.description}`)}</title><g transform="translate(${n.x} ${n.y})">${shape?`<path class="tile-surface" d="${shape}"`:'<rect class="tile-surface" x="-23" y="-20" width="46" height="40" rx="10"'} fill="${paint}" stroke="${stroke}" stroke-width="${active?4:fork?3:1.7}" filter="url(#tile-shadow)"/><path d="M-15-13H15" stroke="#fff8e4" stroke-width="2" opacity=".7"/><text x="0" y="6" text-anchor="middle" fill="#3d5145" font-family="sans-serif" font-size="${symbol.length>2?12:symbol.length>1?16:19}" font-weight="700">${esc(symbol)}</text>${debug?`<text class="tile-number" x="18" y="31" text-anchor="middle" fill="#3d5145" stroke="#fff5da" stroke-width="3" paint-order="stroke" font-size="11" font-weight="700">${n.id+1}</text>`:''}</g></g>`;
}
