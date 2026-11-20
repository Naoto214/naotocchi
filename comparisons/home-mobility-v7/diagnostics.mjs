const metrics = [
  ['自律移動の指示','ambientRequests'], ['自律歩行の開始','ambientStarts'],
  ['自律経路の成立','ambientPlans'], ['自律経路の失敗','ambientFailures'], ['自律歩行の到着','ambientArrivals'],
  ['ドラッグ指示','dragRequests'], ['ドラッグ後の歩行','dragStarts'], ['ドラッグの到着','dragArrivals'],
  ['再探索','retries'], ['道を譲った回数','yieldsGiven'], ['道を譲ってもらった回数','yieldsReceived'],
  ['移動の失敗が続いた回数','failureEpisodes'], ['その後に歩けた回数','recoveredEpisodes'], ['最後の一歩から','lastMovedAgo'],
];
export function attachDiagnostics({root,game,onEnable}) {
  const byId=id=>root.getElementById(id), details=byId('diagnostics'), picker=byId('resident');
  const grid=byId('metrics'), note=byId('clock-note'), record=byId('record'), start=byId('start-record');
  let keys='',timer,labels=new Map();
  const fields=metrics.map(([title])=>{
    const dt=root.createElement('dt'),dd=root.createElement('dd');
    dt.textContent=title; grid.append(dt,dd); return dd;
  });
  function reset() {
    keys=''; picker.replaceChildren(); record.hidden=true;start.hidden=false;
    note.textContent='記録を開始すると、住民ごとの移動と待機を追跡できます。';
  }
  function refresh() {
    if(!details.open || !details.getClientRects().length || root.hidden) return;
    const frame=game(),report=frame?.HomeMobilityDiagnostics?.read();
    if(!report?.enabled) return;
    start.hidden=true; record.hidden=false;
    const rows=report.residents||[];
    const roster=rows.map(row=>row.key).join('|');
    if(roster!==keys) {
      keys=roster;
      const previous=picker.value;
      const actors=frame.HomeCastTrial.inspect();
      labels=new Map(actors.map(actor=>[actor.key,actor.name || actor.label || actor.key]));
      picker.replaceChildren(...rows.map(r=>new Option(labels.get(r.key)||r.key,r.key)));
      if(rows.some(r=>r.key===previous))picker.value=previous;
    }
    const row=rows.find(r=>r.key===picker.value);
    const secs=value=>Number.isFinite(value)?Math.floor(value)+'秒':'—';
    note.textContent='実時間 '+secs(report.wallSeconds)+'　ホームの進行 '+secs(report.modelSeconds);
    if(!row)return;
    metrics.forEach(([,key],i)=>{fields[i].textContent=key==='lastMovedAgo'?secs(row[key]):String(row[key]??'—');});
    const stateNames={rest:'休息',sit:'座る',look:'見回す',turn:'振り向く',walk:'歩行',idle:'待機',breathe:'休息',talk:'会話',curious:'興味'};
    const gateNames={'lower-notice':'下段の通知','trial-paused':'試遊を一時停止','camera-fit':'カメラの調整',menu:'メニュー',conversation:'会話',sleep:'睡眠',illness:'病気',hidden:'画面非表示'};
    const gates=(report.currentGateReasons||[]).map(k=>gateNames[k]||k);
    const name=key=>labels.get(key)||key;
    const nearest=row.nearest ? name(row.nearest.key)+'（足元間 '+row.nearest.distance.toFixed(1)+' 地形px）' : 'なし';
    byId('resident-state').textContent='現在　'+(gates.length?gates.join('、'):stateNames[row.activity]||row.activity||'待機')+'。最も近い住民　'+nearest+'。';
    const peers=Object.keys(row.blockingPeers||{}).map(name);
    const neighbours=(row.overlaps||[]).map(p=>name(p.key));
    byId('blockers').textContent='足元が重なる住民　'+(neighbours.join('、')||'なし')+'。歩行中に進路を塞いだ住民　'+(peers.join('、')||'なし')+'。';
    const open=row.openFailure;
    const examples=(row.failureSamples||[]).at(-1);
    byId('recent').textContent=open
      ?'経路が決まらなかった記録　開始 '+secs(open.start)+'、'+open.failures+'回。その後の歩行を観察中。'
      :examples?'経路が決まらなかった例　開始から'+secs(examples.clock)+'の'+(examples.source==='ambient'?'自律移動':'移動指示')+'。':'';
  }
  function toggle() {
    clearInterval(timer);
    if(details.open){refresh();timer=setInterval(refresh,1000);}
  }
  details.addEventListener('toggle',toggle);
  start.addEventListener('click',()=>{const api=game()?.HomeMobilityDiagnostics;if(!api)return;api.enable();onEnable();refresh();});
  picker.addEventListener('change',refresh);
  return {refresh,reset};
}
