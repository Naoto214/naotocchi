const main=document.getElementById('main');
try{
 const {entries}=await fetch('comparison.json').then(r=>{if(!r.ok)throw Error('比較情報を読み込めません');return r.json()});
 const p=new URLSearchParams(location.search),entry=entries.find(e=>e.id===p.get('scene'));
 const play=(e,n)=>`play.html?scene=${e.id}&count=${n}`;
 const card=e=>`<article><a href="?scene=${e.id}"><img src="${e.src}" alt="${e.name}" loading="lazy" width="1024" height="1536"></a><div class="body"><h2>${e.name}</h2><p class="note">${e.note}</p><div class="links"><a href="?scene=${e.id}">全体・配置比較</a><a class="primary" href="${play(e,6)}">試遊</a></div></div></article>`;
 if(!entry){main.innerHTML=`${["forest","jungle"].map(r=>`<h2>${r==="forest"?"森：滝と苔から、新緑の広場へ":"ジャングル：亜熱帯林から、神秘的な湿地へ"}</h2><p class="links"><a href="comparison-evidence/${r}-originals-v2.jpg">3候補の横並び比較画像</a></p><section class="grid">${entries.filter(e=>e.region===r).map(card).join('')}</section>`).join('')}<details><summary>見比べるポイント</summary><p>F2の穏やかな広場から、F3は透ける若葉と爽やかな午前の光へ。J3の水辺から、J4は深い翡翠色の水面と薄霧、濃密な陰影へ。植生・地面・光・空間の違いを比べられます。</p><p>原画にはキャラクターを描き込まず、試遊では既存の正式2D画像と自由生活処理を使用しています。1・6・28体をそれぞれ別ページで確認できます。</p></details>`;}
 else{
 main.innerHTML=`<nav class="nav"><a href="./">← 6つの景観</a>${entries.filter(e=>e.id!==entry.id&&e.region===entry.region).map(e=>`<a href="?scene=${e.id}">${e.name}</a>`).join('')}</nav><h2>${entry.name}</h2><p>${entry.note}</p><div class="nav"><a href="${entry.original}">原画を開く</a><button id="terrain" aria-pressed="false">歩行領域を見る</button>${[1,6,28].map(n=>`<a class="primary" href="${play(entry,n)}">${n}体で試遊</a>`).join('')}</div><section class="detail"><div class="art-wrap"><img src="${entry.src}" alt="${entry.name}"><svg id="mask" viewBox="0 0 1024 1536" hidden></svg></div></section><h2>正式キャラクターの配置</h2><p>実際のホームを撮影した1・6・28体の比較です。画像を押すと同じ人数で試遊できます。</p><section class="shots">${[1,6,28].map(n=>`<a href="${play(entry,n)}"><img src="comparison-evidence/${entry.id}-${n}.jpg" alt="${entry.name}・${n}体" loading="lazy"><span>${n}体で試遊 →</span></a>`).join('')}</section>`;
 const mask=document.getElementById('mask'),poly=(pts,fill,stroke)=>`<polygon points="${pts.map(([x,y])=>`${x*1024},${y*1536}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
 mask.innerHTML=poly(entry.geometry.ground,'#5fe79544','#b6ffd0')+entry.geometry.foreground.map(x=>poly(x,'#ffbf6344','#ffce88')).join('');
 document.getElementById('terrain').onclick=e=>{const hidden=mask.toggleAttribute('hidden');e.currentTarget.setAttribute('aria-pressed',String(!hidden));};
 }
}catch(e){main.textContent=e.message;main.classList.add('error');}
