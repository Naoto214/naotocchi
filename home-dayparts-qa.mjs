// Opt-in, presentation-only controls. No storage access and no state mutations.
if(new URLSearchParams(location.search).get('daypartsQA')==='1'){
 const panel=document.createElement('details');panel.className='dayparts-qa';panel.innerHTML='<summary>背景統合 VERSION 1・表示QA</summary><p>表示だけを変更します。育成・保存設定は変更しません。</p>';
 for(const [key,label,values] of [['region','地域',['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake']],['time','時間',['morning','day','evening','night']],['weather','天気',['sunny','cloudy','rain','snow']],['season','季節',['spring','summer','autumn','winter']]]){
  const field=document.createElement('label');field.textContent=label;const select=document.createElement('select');select.innerHTML='<option value="">ゲーム設定</option>'+values.map(v=>`<option>${v}</option>`).join('');field.append(select);panel.append(field);
  select.onchange=()=>{const next={...window.NaotocchiDaypartsQA};if(select.value)next[key]=select.value;else delete next[key];window.NaotocchiDaypartsQA=next;window.dispatchEvent(new Event('dayparts-qa-change'));};
 }
 const reset=document.createElement('button');reset.textContent='ゲームの表示へ戻す';reset.onclick=()=>{delete window.NaotocchiDaypartsQA;panel.querySelectorAll('select').forEach(s=>s.value='');window.dispatchEvent(new Event('dayparts-qa-change'));};panel.append(reset);document.body.append(panel);
}
