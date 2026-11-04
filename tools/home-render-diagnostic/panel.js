/* A reversible layer probe. No palette suppression or attempted production fix. */
(()=>{
 'use strict';
 const api=window.HomeRenderDiagnostic;if(!api)return;
 const probe=document.createElement('style');probe.id='render-diagnostic-probe';document.head.append(probe);
 const rules={normal:'',shadow:'.diorama-shadow{visibility:hidden!important}',target:'.diorama-target{visibility:hidden!important}',mask:'#castStage .character-asset{mask-image:none!important;-webkit-mask-image:none!important}',accent:'#castStage .pet-expression-accent{visibility:hidden!important}'};
 const labels={normal:'通常表示',shadow:'影だけを隠す',target:'移動目標だけを隠す',mask:'前景マスクだけ解除',accent:'表情マークだけを隠す'};
 let mode='normal',events=[];
 const host=document.createElement('div');host.id='render-diagnostic-controls';host.style.cssText='position:fixed;right:8px;top:8px;z-index:2147483647';const root=host.attachShadow({mode:'open'});document.body.append(host);
 root.innerHTML=`<style>:host{font:14px/1.5 system-ui;color:#17343d}button,select,textarea{font:inherit}button,select{min-height:38px;margin:3px;border:1px solid #9aaba9;border-radius:6px;background:#fff;color:inherit;padding:4px 8px}section{box-sizing:border-box;background:#fffffff5;border:1px solid #9aaba9;border-radius:10px;padding:10px;width:min(360px,calc(100vw - 16px));max-height:calc(100dvh - 60px);overflow:auto;box-shadow:0 2px 10px #0003}h2{font-size:16px;margin:0 0 5px}p{margin:5px 0}textarea{box-sizing:border-box;width:100%;height:100px;font-size:11px}[hidden]{display:none!important}#open{float:right}</style>
 <button id="open">V17 紫線の検証</button><section hidden aria-label="紫線の切り分け"><h2>V17 紫線の切り分け用</h2><p>ゲームの修正版ではありません。通常のセーブとは別の検証データを使います。</p><button id="awake">実機画像に近い状態</button><button id="sleep">同じ住民を睡眠状態へ</button><button id="hold">いまの位置を固定</button><p>線が出たら位置を固定し、下の項目を1つずつ切り替えてください。</p><label>描画の切り分け <select id="layer">${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><p id="status">通常表示</p><button id="gone">線が消えたと記録</button><button id="stays">線が残ると記録</button><button id="none">線が再現しないと記録</button><p>記録はこの画面内だけに残り、自動送信しません。</p><textarea id="report" readonly aria-label="検証記録"></textarea><button id="copy">記録をコピー</button><button id="close">パネルを閉じる</button></section>`;
 const panel=root.querySelector('section'),status=root.querySelector('#status'),report=root.querySelector('#report');
 const get=s=>root.querySelector(s),r=n=>n?.getBoundingClientRect().toJSON();
 function capture(verdict){const nodes=['.diorama-shadow','.diorama-target','#petSprite .character-asset','#petSprite .pet-expression-accent'].flatMap(selector=>[...document.querySelectorAll(selector)].map(n=>{const c=getComputedStyle(n);return {selector,rect:r(n),display:c.display,visibility:c.visibility,background:c.backgroundColor,transform:c.transform,scale:c.scale,maskActive:c.maskImage!=='none'};}));events.push({at:new Date().toISOString(),mode,label:labels[mode],verdict,screen:{width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,visualHeight:visualViewport?.height,dpr:devicePixelRatio},scene:api.snapshot(),nodes});report.value=JSON.stringify({baseline:'V17 c0a05f8',userAgent:navigator.userAgent,events},null,2);status.textContent=labels[mode]+'：'+verdict;}
 function setMode(value){mode=Object.hasOwn(rules,value)?value:'normal';probe.textContent=rules[mode];status.textContent=labels[mode];get('#layer').value=mode;}
 get('#open').onclick=()=>{panel.hidden=!panel.hidden;};get('#close').onclick=()=>{panel.hidden=true;};
 get('#awake').onclick=()=>{setMode('normal');api.seed(false);status.textContent='44歳・1体・おうち。ドラッグして再現を確認してください。';panel.hidden=true;};
 get('#sleep').onclick=()=>{setMode('normal');api.seed(true);status.textContent='同じ住民の睡眠状態';panel.hidden=true;};
 get('#hold').onclick=()=>{api.hold();status.textContent='自律移動を停止しました。身体・表情の描画は継続します。';};
 get('#layer').onchange=e=>setMode(e.target.value);
 get('#gone').onclick=()=>capture('消えた');get('#stays').onclick=()=>capture('残る');get('#none').onclick=()=>capture('再現しない');
 get('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(report.value);status.textContent='検証記録をコピーしました';}catch(_){report.focus();report.select();status.textContent='記録欄を選択しました。コピーしてください。';}};
})();
