const element = id => document.getElementById(id);
const width = element('width'), seats = element('seats'), phase = element('phase');
const resident = element('resident'), range = element('range'), map = element('map');
const ctx = map.getContext('2d');
const colors = {ground:'#ead9b6', background:'#e4e8dc', walk:'#217c5d', blocked:'#a44d20', selected:'#493e52'};

const names = {
  "pet:dog": "主人公の犬",
  "partner:forest_bear": "恋人のクマ",
  "companion:cat_friend": "きまぐれなねこ",
  "companion:rabbit_friend": "すばしっこいうさぎ",
  "companion:tanuki": "いたずらたぬき",
  "companion:squirrel": "おっちょこちょいリス",
  "companion:owl": "ものしりふくろう",
  "companion:otter": "あそびずきカワウソ",
  "companion:hamster": "ほおぶくろハムスター",
  "companion:panda": "ぐうたらパンダ",
  "companion:monkey": "まねっこサル",
  "companion:parrot": "おしゃべりオウム",
  "companion:sheep": "ふわふわヒツジ",
  "companion:seal": "ごろごろアザラシ",
  "companion:bat": "よふかしコウモリ",
  "companion:chicken": "はやおきニワトリ",
  "companion:penguin_friend": "すべりたがりペンギン",
  "companion:hedgehog": "びっくりハリネズミ",
  "companion:shiba": "ひとなつっこいしばいぬ",
  "companion:snail": "せっかちなカタツムリ",
  "companion:punyu": "とけかけのぷにゅ",
  "companion:sekizou": "むひょうじょうのせきぞう",
  "companion:chameleon": "サングラスのカメレオン",
  "companion:clock": "じかんにルーズなとけい",
  "companion:unicorn": "まよいこんだユニコーン",
  "companion:many_tail_fox": "しっぽのおおいきつね",
  "companion:watcher": "みているなにか",
  "companion:box": "ただのはこ"
};
let chart;
const layers = new Map();
function makeLayer(grid) {
  const canvas = document.createElement('canvas');
  canvas.width=grid.cols; canvas.height=grid.rows;
  const c=canvas.getContext('2d'), packed=atob(grid.mask);
  c.fillStyle=colors.background; c.fillRect(0,0,grid.cols,grid.rows);
  c.fillStyle=colors.ground;
  for(let i=0;i<grid.cols*grid.rows;i++) if(packed.charCodeAt(i>>3)&(1<<(i&7))) {
    c.fillRect(i%grid.cols,Math.floor(i/grid.cols),1,1);
  }
  return canvas;
}
function options(select, values) {
  const old=select.value;
  select.replaceChildren(...values.map(([id,label])=>new Option(label,id)));
  if(values.some(([id])=>id===old))select.value=old;
}
function draw() {
  const family=chart.cases.find(row=>row.width===Number(width.value)&&row.seats===seats.value);
  const frame=family.phases.find(p=>p.label===phase.value) || family.phases[0];
  const chosen=frame.rows.find(row=>row[0]===resident.value) || frame.rows[0];
  const grid=chart.grids[width.value], layer=layers.get(width.value);
  const distance=Number(range.value), index=[3,8,16].indexOf(distance);
  const w=grid.cols*grid.step,h=grid.rows*grid.step;
  const ratio = Math.min(3,window.devicePixelRatio||1);
  map.width=Math.ceil(w*ratio);map.height=Math.ceil(h*ratio);
  map.style.width='min(100%, '+w+'px, '+(56*w/h)+'vh)';
  map.style.aspectRatio=w+'/'+h;
  ctx.setTransform(map.width/w,0,0,map.height/h,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(layer,0,0,w,h);
  for(const row of frame.rows){
    if(row===chosen)continue;
    ctx.beginPath();ctx.arc(row[1],row[2],3.4,0,2*Math.PI);
    ctx.fillStyle=row[3+index]>0?colors.walk:colors.blocked;
    ctx.fill();ctx.strokeStyle='#fffcf3';ctx.lineWidth=1.15;ctx.stroke();
  }
  const [key,x,y]=chosen, directions=atob(chosen[6][index]);
  ctx.lineWidth=1.25;ctx.strokeStyle=colors.walk;ctx.beginPath();
  for(let i=0;i<96;i++)if(directions.charCodeAt(i>>3)&(1<<(i&7))){
    const angle=2*Math.PI*i/96;
    ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance);
  }
  ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,5.2,0,2*Math.PI);ctx.lineWidth=1.8;ctx.strokeStyle='#fffcf3';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,3.2,0,2*Math.PI);ctx.fillStyle=colors.selected;ctx.fill();
  const peers = chosen[7].split(' ').filter(Boolean).map(k=>names[k]).join('、');
  const stuck=frame.rows.filter(row=>row[3+index]===0).length;
  element('reading').textContent=names[key]+'は'+distance+'px進める方向が96方位中'+chosen[3+index]+'方向。'+
    (peers?'接触中の住民は'+peers+'。':'足元で接触中の住民は0体。')+
    '世帯全体では28体中'+stuck+'体の単独の進路が塞がれています。観察時刻は'+frame.clock+'秒。';
  map.setAttribute('aria-label',width.value+'pxの森、'+names[key]+'の足位置と通路');
  map.onclick=e=>{
    const rect=map.getBoundingClientRect(),px=(e.clientX-rect.left)*w/rect.width,py=(e.clientY-rect.top)*h/rect.height;
    const nearest=frame.rows.reduce((best,row)=>{
      const d=Math.hypot(row[1]-px,row[2]-py);return d<best.distance?{row,distance:d}:best;
    },{row:null,distance:16*w/rect.width});
    if(nearest.row){resident.value=nearest.row[0];draw();}
  };
}
function changeFamily(){
  const family=chart.cases.find(row=>row.width===Number(width.value)&&row.seats===seats.value);
  options(phase,family.phases.map(p=>[p.label,p.label==='opening'?'開始時':p.label==='aged'?'10分経過後':(Number(p.label)/60)+'分']));
  options(resident,family.phases[0].rows.map(row=>[row[0],names[row[0]]]));
  draw();
}
try {
  const response=await fetch(new URL('./space-map.json',import.meta.url));
  if(!response.ok)throw Error('data');
  chart=await response.json();
  for(const [width,grid] of Object.entries(chart.grids))layers.set(width,makeLayer(grid));
  changeFamily();
  for(const select of [seats,width])select.addEventListener('change',changeFamily);
  for(const select of [phase,resident,range])select.addEventListener('change',draw);
}catch{
  element('reading').textContent='';
  element('error').textContent='測定記録を読み込めませんでした。本人限定試遊にサインインしてから、もう一度開いてください。';
}
