const result = document.querySelector('#result');
const replace = document.querySelector('#replace');
const frame = document.querySelector('#replay');
const buttons = [...document.querySelectorAll('[data-arm]')];
const fixture = fetch('recorded-panda.json').then(response => {
  if (!response.ok) throw Error('recording');
  return response.json();
});
let variant = 'v11';
let loadRevision = 0;
function reset() {
  const revision = ++loadRevision;
  replace.disabled = true;
  result.textContent = '森の記録を読み込んでいます…';
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.arm === variant));
  const params = new URLSearchParams({region:'forest',count:28,paused:1,paired:1,variant:'B',ground:'on',
    time:'day',season:'autumn',weather:'sunny',clock:0,waitForPainting:1});
  const target = new URL('../game/mobility-v11-replay-' + variant + '.html', location.href);
  target.search = params;
  frame.onload = async () => {
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      const nextCheck = () => new Promise(resolve => setTimeout(resolve, 100));
      const timeout = performance.now() + 75000;
      while (!(win.FootReplay && win.HomeCastTrial?.ready && win.HomeDragTrial?.opening())) {
        if (revision !== loadRevision) return;
        if (performance.now() > timeout) throw Error('timeout');
        await nextCheck();
      }
      const recording = await fixture;
      await Promise.all([...doc.querySelectorAll('#castStage img.character-asset')].map(image => image.decode()));
      if (revision !== loadRevision) return;
      win.FootReplay.restore(recording.peers);
      result.textContent = '28体を当時の位置に戻しました。';
      replace.disabled = false;
    } catch {
      if (revision === loadRevision) result.textContent = '記録を読み込めませんでした。「記録位置に戻す」で再試行できます。';
    }
  };
  frame.src = target.href;
}
for (const button of buttons) button.addEventListener('click', () => { variant=button.dataset.arm; reset(); });
document.querySelector('#restart').addEventListener('click', reset);
replace.addEventListener('click', () => {
  const {distance,before,after} = frame.contentWindow.FootReplay.replacePanda();
  const point = p => '(' + p.map(n=>n.toFixed(2)).join(', ') + ')';
  result.textContent = '足元の変化 ' + distance.toFixed(2) + ' CSS px。地形座標 ' + point(before) + ' → ' + point(after) + '。';
  replace.disabled = true;
});
reset();
