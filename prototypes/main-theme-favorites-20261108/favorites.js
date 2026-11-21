// なおとっち お気に入り 6曲 統合比較 (2026-11-08)
// 先に V1 songs.js → V2 songs-v2.js → V3 songs-v3.js を 読みこむ こと。
// 6曲の 楽曲データは V1〜V3 の ものを そのまま 参照し、1音も 変えない (コピーも 加工も しない)。
// ここで 足すのは、表示用の 名前・出典 と、曲間の 音量を そろえる ための 補正値 だけ。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const V3 = isNode ? require('../main-theme-v3-morning-20261108/songs-v3.js') : root.NAOTOCCHI_THEME_V3;
  const from = (list, id) => { const s = list.find((x) => x.id === id); if (!s) throw new Error('missing ' + id); return s; };

  // 原曲データの 出どころ。song は V1〜V3 の オブジェクトそのもの (参照)
  const FAVORITES = [
    { id: 'current', title: 'いまの メインテーマ', origin: 'audio.js「home」（PR #524 で 転記）', song: from(V3.V1_SONGS, 'current') },
    { id: 'starlake', title: 'ほしふる みずうみ', origin: 'PR #524 D案', song: from(V3.V1_SONGS, 'D') },
    { id: 'hoshizora', title: 'ほしぞらの やくそく', origin: 'PR #526 新B', song: from(V3.V2_SONGS, 'B') },
    { id: 'kisetsu', title: 'きせつの きおく', origin: 'PR #526 新C', song: from(V3.V2_SONGS, 'C') },
    { id: 'ohayo', title: 'おはようの ひかり', origin: 'PR #527 朝B', song: from(V3.SONGS, 'B') },
    { id: 'soyokaze', title: 'そよかぜの まど', origin: 'PR #527 朝C', song: from(V3.SONGS, 'C') },
  ];

  // 曲間の 音量補正 (dB)。tools/measure-loudness.cjs で 測った 1周ぶんの RMS を、
  // 6曲の 平均に そろえる 値。原曲データは 変えず、再生時の 音量だけに かける。
  const LOUDNESS_DB = {"melody": {"current": -0.8, "starlake": 0, "hoshizora": 0.5, "kisetsu": 0, "ohayo": 0.1, "soyokaze": 0.1}, "piano": {"current": -0.3, "starlake": 0.5, "hoshizora": 0, "kisetsu": 0.2, "ohayo": -0.2, "soyokaze": 0}, "band": {"current": -0.2, "starlake": 0.1, "hoshizora": 0.2, "kisetsu": 0.1, "ohayo": 0, "soyokaze": 0}};
  // 測定値 (補正前): 1周の RMS と、3秒窓で いちばん 大きい 場面の RMS
  const MEASURED_RMS = {"melody": {"current": -20.6, "starlake": -21.4, "hoshizora": -21.9, "kisetsu": -21.4, "ohayo": -21.5, "soyokaze": -21.5}, "piano": {"current": -18.9, "starlake": -19.7, "hoshizora": -19.2, "kisetsu": -19.4, "ohayo": -19, "soyokaze": -19.2}, "band": {"current": -16.4, "starlake": -16.7, "hoshizora": -16.8, "kisetsu": -16.7, "ohayo": -16.6, "soyokaze": -16.6}};
  const MAX3S_RMS = {"melody": {"current": -19.9, "starlake": -20.5, "hoshizora": -20.8, "kisetsu": -20.7, "ohayo": -20.4, "soyokaze": -20.4}, "piano": {"current": -18.3, "starlake": -19, "hoshizora": -18.1, "kisetsu": -18, "ohayo": -17, "soyokaze": -18.4}, "band": {"current": -15.7, "starlake": -15.6, "hoshizora": -16.1, "kisetsu": -16, "ohayo": -15.8, "soyokaze": -15.8}};

  const api = Object.assign({}, V3, { FAVORITES, LOUDNESS_DB, MEASURED_RMS, MAX3S_RMS });
  if (isNode) module.exports = api;
  root.NAOTOCCHI_FAVORITES = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
