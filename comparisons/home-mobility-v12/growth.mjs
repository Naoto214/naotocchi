const find = selector => document.querySelector(selector);
const stage = find('.stage'), frame = find('iframe'), width = find('#width');
const grow = find('#grow'), status = find('#status'), result = find('#result');
let mode = 'auto', revision = 0;

function fit() {
  const pixels = Number(width.value);
  const scale = Math.min(stage.clientWidth / pixels, 1);
  frame.style.width = pixels + 'px';
  frame.style.transform = 'scale(' + scale + ')';
  stage.style.height = 792 * scale + 'px';
  stage.style.maxWidth = pixels + 'px';
}
new ResizeObserver(fit).observe(stage);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function reset() {
  const current = ++revision;
  fit();
  grow.disabled = true;
  result.replaceChildren();
  status.textContent = '森を読み込んでいます…';
  document.querySelectorAll('[data-guard]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guard===mode)));
  const url = new URL(mode==='live'?'../game/mobility-v12-life.html':'../game/mobility-v12-growth.html',location.href);
  url.search = new URLSearchParams({count:'28',region:'forest',time:'day',season:'autumn',weather:'sunny',
    ground:'on',variant:'B',paired:'1',paused:'1',clock:'0',growthPolicy:mode,growthLive:mode==='live'?1:0,waitForPainting:'1'});
  frame.onload = async () => {
    try {
      const win = frame.contentWindow, until = performance.now() + 90000;
      while (!(win.HomeCareGrowthTrial && win.HomeCastTrial?.ready && win.HomeDragTrial?.opening())) {
        if (current !== revision) return;
        if (performance.now() > until) throw Error('timeout');
        await sleep(100);
      }
      await Promise.all([...frame.contentDocument.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()));
      if (current !== revision) return;
      if(mode==='live'){
        status.textContent='以前の退路を少しずつ測っています…';
        await win.HomeV12LifeGrowth.preflight();
        if(current!==revision)return;
      }
      grow.disabled = false;
      status.textContent = '28体の成長前の位置を確認できます。';
    } catch {
      if (current === revision) status.textContent = '森を読み込めませんでした。「初期状態に戻す」で再試行できます。';
    }
  };
  frame.src = url;
}

grow.addEventListener('click',async () => {
  const current = revision;
  grow.disabled = true;
  status.textContent = '成長後の足元を測っています…';
  await sleep(30);
  if (current !== revision) return;
  const win = frame.contentWindow;
  if (!win.HomeCareGrowthTrial.grow()) {
    status.textContent = 'この状態では成長を再生できません。「初期状態に戻す」で再試行できます。';
    return;
  }
  await sleep(1200);
  if (current !== revision) return;
  while(mode!=='live'&&!win.HomeV12Growth.read().complete){if(current!==revision)return;await sleep(60);}
  const report = win.HomeCareGrowthTrial.read();
  const labels = new Map(win.HomeCastTrial.inspect().map(a=>[a.key,a.name || a.label || a.key]));
  const fields = [
    ['主人公の年齢', report.ageBefore + ' → ' + report.ageAfter],
    ['最大の画面変位', report.maxScreenCss.toFixed(2) + ' CSS px'],
    ['対象の住民', labels.get(report.residentKey) || '変位なし'],
  ];
  if (mode !== 'legacy') {
    if(mode==='live'&&!report.steps.length)fields.push(['照合','有効な事前測定がなく従来の配置を適用']);
    fields.push(['足位置を保持した回数',report.steps.filter(step=>step.accepted).length + ' / ' + report.steps.length]);
    for (const step of report.steps) {
      const reasons = {'new-or-deeper-contact':'接触が増える','projected-foot-invalid':'投影先の足位置が無効',
        'time-budget':'48msの照合枠に達したため従来の配置を適用','legacy':'従来の配置を適用','resident-walk':'主人公の歩行で退路を回復','neighbour-yield':'近くの住民が歩き退路を回復','local-foot-restores-directions':'最小補正で退路を回復','previous-direction-lost':'以前の退路が失われる','previous-directions-preserved':'以前の退路を保持'};
      fields.push(['再計算 ' + step.sequence, reasons[step.reason] || '従来の配置条件を適用']);
    }
  }
  const list = document.createElement('dl');
  for (const [name,value] of fields) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;list.append(dt,dd);
  }
  const bounds=win.HomeV12Growth?.directions?.();
  const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('ul');
  summary.textContent='28体の成長前後の退路';
  for(const [key,directions] of Object.entries(bounds||{})){
    const li=document.createElement('li');li.textContent=(labels.get(key)||key)+'　'+directions.before.length+' → '+directions.after.length+'方向（失われた方向 '+directions.lost.length+'）';body.append(li);
  }
  details.append(summary,body);result.replaceChildren(list);if(bounds)result.append(details);
  status.textContent='成長前後の測定結果';
});
for (const button of document.querySelectorAll('[data-guard]')) {
  button.addEventListener('click',()=>{mode=button.dataset.guard;reset();});
}
width.addEventListener('change',reset);
find('#restart').addEventListener('click',reset);
reset();
