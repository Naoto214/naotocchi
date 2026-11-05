// The game owns its save. An ordinary exit follows the native link; warn only
// if the current position is missing from storage (including another tab's save).
export function guardHomeReturn(hasUnsavedProgress) {
  document.querySelector('[data-game-home]')?.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    let unsaved;
    try { unsaved = hasUnsavedProgress(); } catch { unsaved = true; }
    if (unsaved && !window.confirm('今回の進み具合を保存できていません。ホームにもどりますか？')) event.preventDefault();
  });
}
if (document.querySelector('[data-puzzle-home]')) {
  guardHomeReturn(() => document.getElementById('saved')?.textContent.includes('保存できません'));
}
