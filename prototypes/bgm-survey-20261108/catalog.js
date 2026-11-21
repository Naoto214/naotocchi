// BGM 総点検 (2026-11-08) — 試聴ページの 曲目録
// 正式採用ホーム4曲 (#528 の データを 参照)・既存BGM 8曲 (audio.js の 転記)・新曲候補 を 1つの 一覧に まとめる。
// 曲データは どれも 元の オブジェクトを 参照するだけで 変えない。ここで 足すのは 表示用の 文と 評価だけ。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const F = isNode ? require('../main-theme-favorites-20261108/favorites.js') : root.NAOTOCCHI_FAVORITES;
  const EX = isNode ? require('./existing-bgm.js') : root.NAOTOCCHI_EXISTING_BGM;
  const NB = isNode ? require('./songs-bgm.js') : root.NAOTOCCHI_NEW_BGM;
  const fav = (id) => F.FAVORITES.find((f) => f.id === id).song;

  const GROUPS = [
    { id: 'home', label: '正式ホーム4曲', note: 'PR #530 アレンジA で 採用済み。ここでは 原曲の 旋律を 同じ 音色で 鳴らす（アレンジA の 録音は #530 の 試聴ページで）。' },
    { id: 'existing', label: '既存BGM 8曲', note: 'audio.js の TRACKS。「ゲームの 音で」は 今 ゲームで 鳴っている 音そのもの。' },
    { id: 'naopoyo', label: 'なおぽよ。', note: '新曲候補（いまは BGM なし）' },
    { id: 'naokoro', label: 'なおころ。', note: '新曲候補（いまは BGM なし）' },
    { id: 'card', label: 'CARD GAME', note: '新曲候補（いまは BGM なし）' },
    { id: 'minigame', label: 'ミニゲーム', note: '汎用 game 曲（34本＋クイック）の 改善候補' },
    { id: 'explore', label: '3D（レース以外）', note: '探検・飛行の 3D ゲーム。いまは レース用の race 曲（152）が 流れている' },
    { id: 'event', label: '特別イベント', note: '誕生日・たまご・結婚・記念日。いまは 専用曲が なく home が 流れる' },
  ];

  const HOME = [
    { id: 'home-morning', group: 'home', label: '朝', title: 'そよかぜの まど', subtitle: '朝 05:00〜09:59（PR #527 朝C）', song: fav('soyokaze') },
    { id: 'home-day', group: 'home', label: '昼', title: 'いつもの にわ', subtitle: '昼 10:00〜15:59（現行メインテーマ）', song: fav('current') },
    { id: 'home-evening', group: 'home', label: '夕', title: 'ほしふる みずうみ', subtitle: '夕 16:00〜18:59（PR #524 D案）', song: fav('starlake') },
    { id: 'home-night', group: 'home', label: '夜', title: 'ほしぞらの やくそく', subtitle: '夜 19:00〜04:59（PR #526 新B）', song: fav('hoshizora') },
  ].map((h) => Object.assign({ character: h.song.character, hook: h.song.hook }, h));

  // 既存8曲の 分析 (音楽理論上。聴感では ない)
  const EXISTING_NOTES = {
    home: { verdict: 'keep', text: 'ハ長調・96。和音を 8分で のぼりおりする 明るい 8小節。正式採用の 昼「いつものにわ」の 原曲で、アレンジA が 決まっている ので そのまま。' },
    night: { verdict: 'keep', text: 'イ短調・66・サイン波。4分音符で 和音を 下りるだけの 子守歌（旋律の 100% が 和音の 音）。眠りの 場面の 役目は 果たしている。夜の ホーム曲（ほしぞら）が 決まったので、将来 その 静かな 編曲に そろえる 案は ある。新曲は 作らない。' },
    game: { verdict: 'improve', text: 'ハ長調・138・矩形波。「ソ ソ ミ (ソ) ラ ソ ミ ド」の 連打。1秒に 4.3音と 速く、1周 わずか 14秒。アクション32本・ストラテジー2本・クイックモード全体で 流れる いちばん よく 聴く 曲なのに いちばん 短く、1回の ゲームで 同じ 所が 何度も もどる。改善候補（ゲーム1・2）。' },
    movie: { verdict: 'keep', text: 'ハ長調・112・サイン波。ワルツ風に 和音を 置き、「ソー ミ レー ド」と 下りる。デートの 映画と デートを 選ぶ 画面で 流れる。甘さは 出ている。新曲は 作らない。' },
    puzzle: { verdict: 'keep', text: 'イ短調寄り（Am7–Fmaj7–Cmaj7）・100・サイン波・軽い スウィング。7th 和音の 分散で 考える 場面を じゃましない。パズル17本と ボード・テーブル12本（計29本）で 流れる。' },
    race: { verdict: 'partial', text: 'イ短調・152・矩形波。もっとも 速く、1周 13秒。3D・のりもの 16本 すべてで 流れるが、レース（カーレース・グランプリ・ハイウェイ）には 合う 一方、おばけやしき・ダンジョン・迷路・マイニング・フライト・サブマリン・着陸には 速すぎる。レースは このまま、レース以外に 新曲候補（たんけん1・2）。' },
    sports: { verdict: 'keep', text: 'ヘ長調・124・三角波。スポーツ21本（釣り4本を ふくむ）で 流れる。明るいが 旋律が G6 まで 高く、長く 聴くと 耳に 刺さる おそれ。今回は 作り直さず、編曲（1オクターブ 下げる 等）で 直せる 点として 記録。' },
    farewell: { verdict: 'keep', text: 'イ短調・60・サイン波。1秒に 0.7音の ごく 静かな 下行。お別れの 場面に ふさわしく、主張しない。新曲は 作らない。' },
  };
  const EXISTING = EX.EXISTING.map((s) => ({ id: s.id, group: 'existing', label: s.trackId, title: s.title, subtitle: s.subtitle, song: s, character: EXISTING_NOTES[s.trackId].text, hook: '', verdict: EXISTING_NOTES[s.trackId].verdict, gameSound: true }));

  // 新曲の 理論上の 見立て (Claude は 音を 聴けない。聴いた 感想では ない)
  const THEORY = {
    'poyo-1': '休符を ふくむ 動機で 考える 時間を じゃましにくい。パズルの 長い 時間に 向く。',
    'poyo-2': '3拍子で ゆったり。ほしふるみずうみ（3拍子）と 世界観が 近い ぶん、ホームとの 区別は つきにくい かも しれない。',
    'koro-1': '3連符の「ころころ」が すごろくの 動きと 結びつく。にぎやかで 覚えやすい。',
    'koro-2': '人生を ふりかえる あたたかさ。速い ワルツなので、すごろくの テンポ感とは 好みが 分かれる。',
    'card-1': '考える 時間の 多い カードゲーム向き。ドリア旋法で 暗くなりすぎない。',
    'card-2': '勝負の 高揚感。CPU の 番を 待つ 間に 流し続けるには にぎやか すぎる 可能性。',
    'game-1': '汎用 game 曲の 2倍の 長さ。付点の 弾みで 明るい。いちばん 王道。',
    'game-2': '裏拍から 跳びこむ 少し とぼけた 明るさ。好みが 分かれる ぶん、個性は 強い。',
    'explore-1': 'おばけやしき・ダンジョン・迷路・マイニングの「こわいけど かわいい」。半音の 動きが 多いので、長時間だと 落ち着かない 人も いる かも しれない。',
    'explore-2': 'フライト・海の ゲームに 浮遊感。もっとも 穏やかで、ホームの 朝曲と 雰囲気が 近い。',
    'event-1': 'ファンファーレの 動機で お祝いが すぐ 伝わる。短い 場面でも 頭の 2小節で 用が 足りる。',
    'event-2': '結婚・記念日の 静かな 幸せ。3拍子・ゆっくりで、短い 演出には 長い かも しれない。',
  };
  const NEW = NB.NEW_SONGS.map((s) => ({ id: s.id, group: s.use, label: s.label, title: s.title, subtitle: s.subtitle, song: s, character: s.character, hook: s.hook, theory: THEORY[s.id] || '' }));

  const CATALOG = [...HOME, ...EXISTING, ...NEW];
  const api = { GROUPS, CATALOG, EXISTING_NOTES, THEORY, flatten: F.flatten, solfege: F.solfege };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_CATALOG = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
