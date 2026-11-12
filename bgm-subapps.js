// なおとっち BGM VERSION 2 — なおぽよ。・CARD GAME の 場面と 曲の つなぎ（PR #534 の 配置表 50行に したがう）。
// 各アプリの コードは 変えず、画面（DOM）を 見て 場面を 判定する。bgm-v2.js と assets/bgm/catalog.js の あとで 読みこむ。
//   <script src="../../assets/bgm/catalog.js"></script><script src="../../bgm-v2.js"></script>
//   <script src="../../bgm-subapps.js" data-app="naopoyo"></script>   （card-game なら data-app="card"）
(function (root) {
  'use strict';
  const me = root.document.currentScript; const app = me && me.dataset.app;
  const B = root.NAOTOCCHI_BGM2; if (!B || !app) return;
  const bgm = B.forPage({ base: new URL('assets/bgm/catalog.js', me.src).href.replace(/catalog\.js$/, '') });
  root.NAOTOCCHI_SUBAPP_BGM = bgm;
  const $ = (s) => root.document.querySelector(s);
  let last = '';

  // なおぽよ。（第1章 地下牢）: 遊ぶ・ステージ選択・おてほん・説明・失敗は「ぽよぽよこもれび」（scene-18〜20・23）
  // ステージクリア「みんな、おかえり。」→ ジングル（scene-21）、第1章クリア → 章の おわり（scene-22）
  function naopoyo() {
    const dlg = $('#dialog'), star = dlg && dlg.open && $('#content .victory-star');
    if (star && ($('#content #chapterMap') || /第1章/.test(($('#content h2') || {}).textContent || ''))) return 'chapter';
    if (star) return 'clear';
    return 'play';
  }
  // CARD GAME: メニュー・準備・通常の 対戦は「デュエル・スタート」（scene-32・33・37）、終盤（ラウンド9〜10 または そだち 90 以上）は 速い 変奏（scene-34）
  // 勝利 → 勝利の ジングル（scene-35）、敗北・引き分け → つぎはかつぞ（scene-36）
  function card() {
    const body = root.document.body, game = $('#game');
    if (!body.classList.contains('playing') || !game || game.hidden) return 'menu';
    const result = $('#result');
    if (result) {
      const h = (result.querySelector('h2') || {}).textContent || '';
      if (/引き分け/.test(h)) return 'lose';
      const own = $('.player-board.own'); const seat = own && own.dataset.player;
      const winner = (h.match(/([AB]) の勝利/) || [])[1];
      return !seat || !winner || winner === seat ? 'win' : 'lose';
    }
    const m = (($('.turn-indicator small') || {}).textContent || '').match(/ROUND (\d+)/); const round = m ? +m[1] : 0;
    const growth = [...root.document.querySelectorAll('[data-player] .player-heading span b:first-child')].map((b) => +b.textContent || 0);
    return round >= 9 || Math.max(0, ...growth) >= 90 ? 'late' : 'battle';
  }
  // なおころ。: タイトル・キャラ選択・ひとやすみ・対戦コード・すごろく盤・終盤は「ころころじんせい」（scene-25・26・30）
  // 盤の ゲームマス（そだちの ごほうび）→「あそびのはじまり」（scene-27）、クイックマス（お金の ごほうび）→ 既存 game（scene-28）
  // 対戦の おわり → ゴールの ジングル（scene-29）の あと 人生アルバム（scene-31）。過去の アルバムも 人生アルバム
  function naokoro() {
    const txt = (sel) => { const e = $(sel); return e ? e.textContent || '' : ''; };
    if ($('#official-frame')) return /お金/.test(txt('.official-panel .caption')) ? 'quick' : 'minigame';
    const main = txt('#app');
    if (/こんな人生に、なりました。|PAST JOURNEYS/.test(main)) return 'album';
    return $('#board-wrap') ? 'board' : 'title';
  }
  function tick() {
    if (!B.mainBgmEnabled()) { if (last !== 'off') { bgm.stop(); last = 'off'; } return; }
    const s = app === 'naopoyo' ? naopoyo() : app === 'naokoro' ? naokoro() : card();
    if (s === last) return; const prev = last; last = s;
    if (app === 'naopoyo') {
      if (s === 'play') bgm.setSong('poyo-1');
      else if (s === 'clear') bgm.jingle('var-poyo-clear', { then: 'poyo-1' });
      else if (s === 'chapter') bgm.setSong('var-poyo-chapter');
    } else if (app === 'naokoro') {
      if (s === 'board' || s === 'title') bgm.setSong('koro-1');
      else if (s === 'minigame') bgm.setSong('game-1');
      else if (s === 'quick') bgm.setSong('bgm-game');
      else if (s === 'album') {
        // 盤や ゲームから 来た（＝いま 対戦が 終わった）ときだけ ゴールの ジングル。タイトルから 過去の アルバムを 開いた ときは 曲だけ
        if (prev === 'board' || prev === 'minigame' || prev === 'quick') bgm.jingle('var-koro-goal', { then: 'var-koro-album' });
        else bgm.setSong('var-koro-album');
      }
    } else {
      if (s === 'menu' || s === 'battle') bgm.setSong('card-2');
      else if (s === 'late') bgm.setSong('var-card-late');
      else if (s === 'win') bgm.jingle('var-card-win', { then: null });
      else if (s === 'lose') bgm.jingle('jingle-card-lose', { then: null });
    }
  }
  root.setInterval(tick, 300);
  root.document.addEventListener('pointerdown', () => { if (!last) tick(); }, true);
  tick();
  root.NAOTOCCHI_SUBAPP_BGM_STATE = () => last;
})(typeof globalThis !== 'undefined' ? globalThis : this);
