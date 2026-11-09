// BGM 配置 VERSION 2 (2026-11-09) — 曲の 一覧・採用状況・用途ごとの 比較候補
// 曲データは どれも 元の オブジェクト (#528 favorites・#531 catalog・songs-add) を 参照するだけで 変えない。
// 採用状況は 本人が 明示した ものだけを 採用・保留・不採用・未確定に する。明示の ない #531 の 新曲は「評価待ち」。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const C = isNode ? require('../bgm-survey-20261108/catalog.js') : root.NAOTOCCHI_BGM_CATALOG;
  const F = isNode ? require('../main-theme-favorites-20261108/favorites.js') : root.NAOTOCCHI_FAVORITES;
  const AD = isNode ? require('./songs-add.js') : root.NAOTOCCHI_ADD_BGM;
  const cat = (id) => C.CATALOG.find((x) => x.id === id);
  const fav = (id) => F.FAVORITES.find((f) => f.id === id);

  const SONGS = {};
  const COLOR = { home: 'home', existing: 'existing', naopoyo: 'naopoyo', naokoro: 'naokoro', card: 'card', minigame: 'minigame', explore: 'minigame', event: 'event' };
  for (const x of C.CATALOG) {
    const source = x.group === 'home' ? `ホーム ${x.label}（PR #530 アレンジA 採用。ここでは 原曲の 旋律）` : x.group === 'existing' ? `audio.js「${x.label}」（いま ゲームで 流れている）` : `PR #531 新曲（${(C.GROUPS.find((g) => g.id === x.group) || {}).label}）`;
    SONGS[x.id] = { song: x.song, title: x.title, source, color: COLOR[x.group] || 'existing', gameSound: !!x.gameSound, character: x.character || '', hook: x.hook || '' };
  }
  for (const [id, f] of [['kisetsu', fav('kisetsu')], ['ohayo', fav('ohayo')]]) SONGS[id] = { song: f.song, title: f.title, source: `${f.origin}（PR #529 で 保留）`, color: 'home', gameSound: false, character: f.song.character, hook: f.song.hook };
  for (const s of AD.ADD_SONGS) SONGS[s.id] = { song: s, title: s.title, source: 'VERSION 2 追加作曲（スポーツ）', color: 'sports', gameSound: false, character: s.character, hook: s.hook };

  const STATUS_LABEL = { adopted: '採用', hold: '保留', undecided: '未確定', pending: '評価待ち', new: '新曲（未評価）', migrating: '移行予定', rejected: '不採用（保護）' };
  const S = (status, note) => ({ status, note });
  const SONG_STATUS = {
    'home-morning': S('adopted', '朝 05:00〜09:59。アレンジA 採用。原曲・アレンジB は #528・#530 に 保存'),
    'home-day': S('adopted', '昼 10:00〜15:59。アレンジA 採用（原曲 = audio.js の home）'),
    'home-evening': S('adopted', '夕 16:00〜18:59。アレンジA 採用'),
    'home-night': S('adopted', '夜 19:00〜04:59。アレンジA 採用'),
    'event-2': S('adopted', '本人が 採用と 明示（結婚・記念日）'),
    'event-1': S('hold', '本人が 保留と 明示'),
    kisetsu: S('hold', '#529 で 保留（特別な 場面・地域の 候補）'),
    ohayo: S('hold', '#529 で 保留'),
    'bgm-home': S('migrating', 'ホーム4大テーマ アレンジA へ 移行予定。正式統合までは audio.js に 残す'),
    'bgm-game': S('undecided', '本人が 未確定と 明示。新曲候補と 比較'),
    'bgm-race': S('undecided', '本人が 未確定と 明示。新曲候補と 比較'),
    'bgm-farewell': S('undecided', '本人が 未確定と 明示。候補と 比較'),
    'bgm-night': S('rejected', '本人が 不採用と 明示。新しい BGM の 正式統合までは audio.js に 残し 復元できる'),
    'bgm-movie': S('rejected', '同上'),
    'bgm-puzzle': S('rejected', '同上'),
    'bgm-sports': S('rejected', '同上'),
  };
  for (const id of ['poyo-1', 'poyo-2', 'koro-1', 'koro-2', 'card-1', 'card-2', 'game-1', 'game-2', 'explore-1', 'explore-2']) SONG_STATUS[id] = S('pending', '本人の 明示的な 評価が まだ 届いていない（#531 の 試聴ページの 評価は 本人の ブラウザ内だけに ある）');
  for (const s of AD.ADD_SONGS) SONG_STATUS[s.id] = S('new', 'VERSION 2 で 追加作曲');

  const CLASS_INFO = { A: { short: '確定' }, B: { short: '既存曲で 対応' }, C: { short: '流用で 対応' }, D: { short: '未確定' }, E: { short: '不足' }, '無音': { short: '無音' } };

  // 比較する 用途 (確定 A の 用途は 選び直し 不要なので 出さない)
  const USES = [
    { id: 'minigame', label: 'ミニゲーム汎用', cls: 'D', scope: 'アクション 32本・ストラテジー 2本・クイックモード（50種）。いま game 曲。', note: '既存 game（未確定）と #531 の ゲーム1・2 を 比較。', candidates: ['bgm-game', 'game-1', 'game-2'], roles: { 'bgm-game': 'いまの 曲' } },
    { id: 'race', label: 'レース・シューティング 3D', cls: 'D', scope: 'ハイウェイ3D・カーレース3D・グランプリ・リズムハイウェイ・スペースガンナー（5本）。いま race 曲。', note: '既存 race（未確定）を 残すか。速い 流用候補として ゲーム1。', candidates: ['bgm-race', 'game-1'], roles: { 'bgm-race': 'いまの 曲', 'game-1': '流用候補' } },
    { id: 'explore', label: '3D 探検・飛行・海', cls: 'D', scope: 'おばけやしき・ダンジョン・たまころがし迷路・ボクセルマイニング（探検 4本）と、うちゅう・リング・なつのうみフライト・サブマリン・ハンググライダー・ひこうき着陸・ルナランダー（飛行・海 7本）。いま race 曲（152）。', note: '既存 race（未確定）と #531 の たんけん1（探検）・たんけん2（飛行・海）を 比較。', candidates: ['bgm-race', 'explore-1', 'explore-2'], roles: { 'bgm-race': 'いまの 曲' } },
    { id: 'sports', label: 'スポーツ', cls: 'E', scope: 'ボウリング・アーチェリー・ミニゴルフ・バスケ・卓球・フリーキック・やきゅう・スキージャンプ・エアホッケー・テニス・ダーツ・りくじょう・カーリング 2・ビーチバレー・岩場のぼり・ゲレンデ（17本）。いま sports 曲（不採用）。', note: '代わりに 使える 採用曲・候補が ない ため、追加作曲 2案。流用候補として ゲーム2 も。', candidates: ['bgm-sports', 'sports-1', 'sports-2', 'game-2'], roles: { 'bgm-sports': '不採用（参考）', 'game-2': '流用候補' } },
    { id: 'fishing', label: '釣り', cls: 'D', scope: 'ほんかくさかなつり・うみ・しんかい・みずべ（4本）。いま sports 曲（不採用）。待つ 時間が 長い。', note: '水辺の ゆったりした 流用候補 たんけん2 と、落ち着いた スポーツ2。', candidates: ['bgm-sports', 'explore-2', 'sports-2'], roles: { 'bgm-sports': '不採用（参考）', 'explore-2': '流用候補', 'sports-2': '流用候補' } },
    { id: 'puzzle', label: 'パズル・ボード', cls: 'D', scope: 'パズル 17本と ボード・テーブル 12本。いま puzzle 曲（不採用）。', note: '新曲を 作る 前に 流用を 検討: 考える 間の ある ぽよ1（パズル向き）、知的な カード1（ボード・テーブル向き）。どちらも 評価待ち。両方 合わなければ 追加作曲（E）。', candidates: ['bgm-puzzle', 'poyo-1', 'card-1'], roles: { 'bgm-puzzle': '不採用（参考）', 'poyo-1': '流用候補（パズル）', 'card-1': '流用候補（ボード）' } },
    { id: 'sleep', label: '睡眠', cls: 'C', scope: 'ペットが 眠っている 間。いま night 曲（不採用）。', note: '採用済みの 夜「ほしぞらのやくそく」を 静かな 編曲（メロディのみ・オルゴール風）で 流用する 案。新曲は 作らない。', candidates: ['bgm-night', 'home-night'], roles: { 'bgm-night': '不採用（参考）', 'home-night': '採用曲の 流用（静かな 編曲 前提）' } },
    { id: 'date', label: 'デート・映画', cls: 'C', scope: 'デートを 選ぶ 画面と デートの 映画。いま movie 曲（不採用）。記念日の 映画は ふたりのきねんび で 確定、でんせつの であい の 映画は 配置表で 別に 検討。', note: '採用済みの「ふたりのきねんび」（恋と 記念日の ワルツ）を 流用する 案。夕の「ほしふるみずうみ」も 参考に。新曲は 作らない。', candidates: ['bgm-movie', 'event-2', 'home-evening'], roles: { 'bgm-movie': '不採用（参考）', 'event-2': '採用曲の 流用', 'home-evening': '採用曲の 流用（別案）' } },
    { id: 'farewell', label: 'お別れ・一生カード', cls: 'D', scope: '死亡・旅立ち・100さいの さいごの じかん・一生カード。いま farewell 曲（未確定）。', note: '既存 farewell（未確定）と、保留中の「きせつのきおく」（懐かしさと 切なさ）を 比較。夜の「ほしぞらのやくそく」も 参考。', candidates: ['bgm-farewell', 'kisetsu', 'home-night'], roles: { 'bgm-farewell': 'いまの 曲', kisetsu: '保留曲の 流用', 'home-night': '採用曲の 流用（別案）' } },
    { id: 'birth', label: '誕生・誕生日・たまご', cls: 'D', scope: 'たまご・たまごが かえる・誕生日・図鑑や 実績の ゲームクリア（おいわいの 場面）。いま home 曲。', note: '保留中の「おめでとうのひ」と、目ざめの 曲で 保留中の「おはようのひかり」（たまごが かえる 場面向き）を 比較。', candidates: ['event-1', 'ohayo'], roles: { 'event-1': '保留曲', ohayo: '保留曲の 流用' } },
    { id: 'naopoyo', label: 'なおぽよ。', cls: 'D', scope: 'なおぽよ。の 全ステージ（いまは 音楽なし）。公開入口は 時の手 第1章「地下牢」10ステージ。旧ページの こもれびの森・洞窟も URL で 公開中。', note: '#531 の ぽよ1・ぽよ2（評価待ち）。地下・洞窟の 雰囲気に「ふしぎのちか」（評価待ち）も 流用候補。1曲を 全ステージ共通に する 案。', candidates: ['poyo-1', 'poyo-2', 'explore-1'], roles: { 'explore-1': '流用候補（地下・洞窟）' } },
    { id: 'naokoro', label: 'なおころ。', cls: 'D', scope: 'なおころ。の すごろく盤面（いまは BGM オフ）。', note: '#531 の ころ1・ころ2（評価待ち）。', candidates: ['koro-1', 'koro-2'] },
    { id: 'card', label: 'CARD GAME', cls: 'D', scope: 'CARD GAME の 対戦（いまは 音楽なし）。', note: '#531 の カード1（ふだんの 対戦）・カード2（勝負どころ）。2曲を 場面で 使い分ける 案も。', candidates: ['card-1', 'card-2'], roles: { 'card-1': 'ふだんの 対戦', 'card-2': '勝負どころ' } },
  ];

  const api = { SONGS, SONG_STATUS, STATUS_LABEL, CLASS_INFO, USES, flatten: C.flatten, solfege: C.solfege };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_PLACEMENT_SONGS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
