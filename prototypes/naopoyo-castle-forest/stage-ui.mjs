// Official chapter1/app.mjs selectScreen/victory templates, with only stage and
// progress adapters. Official CSS is imported unchanged by style.css.
export function stageGrid(stages,progress){
 return `<span class="tag">CHAPTER 02</span><h2>古城と仕掛けの森</h2><p>星の道のはじまり</p><div class="stage-grid">`+stages.map((s,i)=>{
 const cleared=progress.completed[i],open=progress.unlocked(i);
 return `<button class="level ${cleared?'cleared':open?'available':'locked'}" data-stage="${i}" ${open?'':'disabled'}><b>${s.id}</b><span>${cleared?'★ クリア':open?'✧ 挑戦できる':'🔒 未開放'}</span><small>${open?s.title:'まだ見ぬ星の道'}</small></button>`;
 }).join('')+`</div><small>開いた道には、いつでも戻れます。</small>`;
}
export function victory(index){return `<div class="victory-star">★</div><h2>${index<9?'みんな、おかえり。':'第2章 クリア！'}</h2><p>${index<9?'みんな、行こう。次の光が見えてきた。':'古い鉄格子の向こうに、やわらかな光。みんなで抜けた古城と仕掛けの森の先に、地底洞窟が広がっていた。'}</p>${index<9?'<p class="unlock">✧ 新しい星の道が開きました</p><button class="primary" id="nextStage">次の星の道へ →</button>':'<p>VERSION 1の試遊はここまでです</p><button class="primary" id="chapterMap">星の道をふりかえる</button>'}`;}
