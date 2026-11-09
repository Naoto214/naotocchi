// なおとっち BGM 完全設計 VERSION 3 — 採用曲の 変奏（メロディは 1音も 変えない）
// 変奏は「テンポ」「使う 小節の 範囲」「周回数」だけを 変える。音高・リズム・和音は 元の 採用曲の まま。
// 元の 曲データは 参照するだけで 書きかえない（bars は 元の 配列の 要素を そのまま 使う）。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const F = isNode ? require('../main-theme-favorites-20261108/favorites.js') : root.NAOTOCCHI_FAVORITES;
  const NB = isNode ? require('../bgm-survey-20261108/songs-bgm.js') : root.NAOTOCCHI_NEW_BGM;
  const fav = (id) => F.FAVORITES.find((f) => f.id === id).song;
  const nb = (id) => NB.NEW_SONGS.find((s) => s.id === id);
  // from 小節目〜to 小節目（1 から 数える）を 取りだし、テンポだけ 変える
  const variant = (base, o) => Object.assign({}, base, {
    id: o.id, use: o.use, kind: o.kind, title: o.title, baseId: o.baseId, arrangement: o.arrangement, character: o.character,
    bpm: o.bpm || base.bpm, repeats: o.repeats || 1,
    bars: o.range ? base.bars.slice(o.range[0] - 1, o.range[1]) : base.bars,
  });
  const VARIANTS = [
    variant(fav('hoshizora'), { id: 'var-sleep', baseId: 'home-night', use: 'sleep', kind: 'loop', title: 'ほしぞらの やくそく（子守歌）', bpm: 60, repeats: 1,
      arrangement: 'テンポ 76 → 60。編曲は オルゴール風（メロディのみ・1オクターブ上・伴奏なし）を 想定', character: '採用曲 夜「ほしぞらのやくそく」を そのまま ゆっくりに した 変奏。夜の ホーム曲と 同じ 旋律なので、眠りに 入っても 世界が つながって 聴こえる。' }),
    variant(nb('poyo-1'), { id: 'var-poyo-clear', baseId: 'poyo-1', use: 'naopoyo-end', kind: 'jingle', title: 'ぽよぽよこもれび（ステージクリア）', range: [13, 16],
      arrangement: '13〜16小節（動機が いちばん 高く もどる 句と 終止）だけを 1回', character: 'ステージクリア「みんな、おかえり。」で 鳴らす 約 10秒。遊んでいた 曲の いちばん 明るい 所で しめくくる。' }),
    variant(nb('poyo-1'), { id: 'var-poyo-chapter', baseId: 'poyo-1', use: 'naopoyo-end', kind: 'loop', title: 'ぽよぽよこもれび（章の おわり）', bpm: 80, repeats: 1,
      arrangement: 'テンポ 100 → 80、全16小節を 1回', character: '第1章クリア（地下牢を ぬけて やわらかな 光へ）の 画面用。同じ 旋律を ゆっくり 聴かせて、旅の ひと区切りを 感じさせる。' }),
    variant(nb('koro-1'), { id: 'var-koro-goal', baseId: 'koro-1', use: 'naokoro-end', kind: 'jingle', title: 'ころころじんせい（ゴール）', range: [13, 16],
      arrangement: '13〜16小節（いちばん 高く ころがる 句と 終止）だけを 1回', character: 'ゴール・最終ターンの 終わりに 鳴らす 約 9秒。' }),
    variant(nb('koro-1'), { id: 'var-koro-album', baseId: 'koro-1', use: 'naokoro-end', kind: 'loop', title: 'ころころじんせい（人生アルバム）', bpm: 84, repeats: 1,
      arrangement: 'テンポ 112 → 84、全16小節を 1回（ループ可）', character: '「こんな人生に、なりました。」の 人生アルバム用。遊んだ 曲を ゆっくり ふりかえる。' }),
    variant(nb('card-2'), { id: 'var-card-late', baseId: 'card-2', use: 'card-end', kind: 'loop', title: 'デュエル・スタート（終盤）', bpm: 156, repeats: 3,
      arrangement: 'テンポ 138 → 156（同じ 旋律を 速く）', character: '9〜10ラウンド目や そだち100 目前の 勝負どころ用。同じ 曲の まま テンポだけ 上げて 逆転の 緊張を 出す（終盤を 判定する 画面は いまの コードに ない ので 実装時に 追加）。' }),
    variant(nb('card-2'), { id: 'var-card-win', baseId: 'card-2', use: 'card-end', kind: 'jingle', title: 'デュエル・スタート（勝利）', range: [13, 16],
      arrangement: '13〜16小節（ト長調側で 動機が 高く もどる 句と 終止）だけを 1回', character: '勝利の 結果画面で 鳴らす 約 7秒。' }),
    variant(nb('explore-2'), { id: 'var-flight', baseId: 'explore-2', use: 'flight', kind: 'loop', title: 'そらとうみのさんぽ（きらめき・はやめ）', bpm: 120, repeats: 2,
      arrangement: 'テンポ 108 → 120（本人の メモ「煌びやかに、もう少し テンポ 早く」）。煌びやかさは 編曲で（高音の ベル・グロッケンの 分散和音・ハープの グリッサンドを 想定）', character: '3D 飛行・海で 採用した「そらとうみのさんぽ」を、本人の メモに 合わせて 速く した 変奏。旋律は 同じ。きらめく 音色は 採用後の 編曲で 足す。' }),
  ];
  const api = { VARIANTS };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_V3_VARIANTS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
