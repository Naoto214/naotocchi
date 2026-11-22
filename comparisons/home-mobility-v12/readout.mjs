const reason = {
  region:'地域変更', projection:'投影・画面変更', population:'住民数変更',
  body:'体格・装備変更', arrangement:'配置変更', 'stable-layout-sync':'同じ配置での再同期',
  'same-ground':'足元を保持', 'reserved-exit-open':'通れる退路を確認',
  'existing-contact':'接触あり', 'resident-geometry':'住民の体格変更',
  'reserved-exit-closed':'退路を再配置', 'geometry-or-population':'地形・人数変更',
  'invalid-foot':'現在の足場を再検査', 'route-or-budget':'既存経路を再検査',
  'corridor-budget':'退路の探索上限',
};
const point = p => p.map(v=>v.toFixed(1)).join(', ');
export function showResidentChanges(root, frame, key) {
  const foot = frame.HomeFootDiagnostics?.read(key);
  const last = foot?.events.at(-1);
  const decision = frame.HomeV12Reflow?.read(key);
  const lines = [];
  if (foot) lines.push('足位置を補正した回数　'+foot.changes+'回。');
  if (last) lines.push('直近は'+(reason[last.reason]||last.reason)+'、'+last.distanceCSS.toFixed(2)+
    ' CSS px。地形座標 ('+point(last.from)+') → ('+point(last.to)+')。');
  if (decision) lines.push('最新の地形再確認　'+(reason[decision.reason]||decision.reason)+
    '、このときの変位 '+decision.distanceCSS.toFixed(2)+' CSS px。');
  root.getElementById('foot-events').textContent = lines.join('');
  const api = frame.HomeV12OwnerEvents;
  api?.enable();
  const row = api?.read(key);
  root.getElementById('help-events').textContent = api ? '曲がる道譲りの探索 '+(row?.searches||0)+
    '回、成立 '+(row?.plans||0)+'件。この住民のために助け手が歩き始めた回数 '+(row?.starts||0)+
    '回、この住民がほかの住民に譲り始めた回数 '+(row?.helps||0)+'回。' : '';
}
