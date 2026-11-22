const reasons = {
  region:'地域変更', projection:'投影・画面の変更', population:'住民数変更',
  body:'体格・表示範囲変更', arrangement:'初期配置', 'stable-layout-sync':'同じ配置での再同期',
};
const states = {
  sampled:'探索前', planned:'経路成立', declined:'経路不成立', interrupted:'別の行動へ移行', arrived:'歩行完了',
};
const position = ([x,y]) => '(' + x.toFixed(1) + ', ' + y.toFixed(1) + ')';

export function showChanges(root, frame, key) {
  const log = frame.HomeFootDiagnostics?.read(key);
  const last = log?.events.at(-1);
  const foot = root.getElementById('foot-events');
  foot.textContent = log ? '足位置を補正した回数　' + log.changes + '回。' : '';
  if (last) {
    foot.textContent += '直近　' + (reasons[last.reason] || last.reason) + '、' +
      last.distanceCSS.toFixed(2) + ' CSS px。地形座標 ' + position(last.from) + ' → ' + position(last.to) + '。';
  }
  const goal = frame.HomeGoalDiagnostics?.read(key);
  const node = root.getElementById('wander-goal');
  const refusal = frame.HomeRefusalDiagnostics?.read(key);
  node.textContent = goal ? '直近の散歩先　' + goal.rawDistance.toFixed(1) + 'px・' +
    Math.round(goal.rawBearing) + '° → ' + goal.chosenDistance.toFixed(1) + 'px・' +
    Math.round(goal.chosenBearing) + '°（右が0°）。' + (states[goal.status] || goal.status) +
    '。実歩行距離 ' + goal.actualDistance.toFixed(1) + 'px。' : '';
  if (refusal) {
    node.textContent += '経路不成立後の探索 ' + refusal.checks + '回、前方に経路が見つかった回数 ' + refusal.offers + '回。';
    if (refusal.checks) node.textContent += refusal.lastDistance === null
      ? '直近は進める地点なし。' : '直近の代替地点まで ' + refusal.lastDistance.toFixed(1) + ' CSS px。';
  }
}
