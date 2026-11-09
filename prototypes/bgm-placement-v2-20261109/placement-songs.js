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

  const STATUS_LABEL = { adopted: '採用', confirm: '採用決定・曲名確認待ち', hold: '保留', undecided: '未確定', pending: '評価待ち', new: '新曲（未評価）', migrating: '移行予定', rejected: '不採用（保護）' };
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
  // 2026-11-09 本人の 判断:「なおぽよ。・なおころ。・CARD GAME・ミニゲーム汎用・3D の 気に入った 新曲は 採用」。
  // ただし どの 曲を 気に入ったかは #531 の 試聴ページ（本人の ブラウザ内）にしか なく、こちらからは 見えない。
  // 推測で 採用確定に しない ため、各用途の 2曲を「採用決定・曲名確認待ち」と する（気に入った 方が 採用、両方なら 両方 採用）。
  const CONFIRM_USE = { 'poyo-1': 'なおぽよ。', 'poyo-2': 'なおぽよ。', 'koro-1': 'なおころ。', 'koro-2': 'なおころ。', 'card-1': 'CARD GAME', 'card-2': 'CARD GAME', 'game-1': 'ミニゲーム汎用', 'game-2': 'ミニゲーム汎用', 'explore-1': '3D ゲーム', 'explore-2': '3D ゲーム' };
  for (const [id, u] of Object.entries(CONFIRM_USE)) SONG_STATUS[id] = S('confirm', `${u}で「気に入った 新曲は 採用」と 決定済み。この 曲が 気に入った 曲か どうかの 確認だけ 必要（推測では 確定しない）`);
  for (const s of AD.ADD_SONGS) SONG_STATUS[s.id] = S('new', 'VERSION 2 で 追加作曲');

  const CLASS_INFO = { A: { short: '確定' }, B: { short: '既存曲で 対応' }, C: { short: '流用で 対応' }, D: { short: '未確定' }, E: { short: '不足' }, '無音': { short: '無音' } };

  // 試聴ページの 用途。mode: 'confirm' = 採用は 決定、どの 曲かを 確かめるだけ / 'compare' = まだ 決まっていない
  // 採用確定（A）の 曲は 選び直さない ので ここには 出さない。split は 両方 採用だった ときの 使い分け案。
  const USES = [
    { id: 'naopoyo', mode: 'confirm', label: 'なおぽよ。', cls: 'D', scope: 'なおぽよ。の 全ステージ（公開入口: 時の手 第1章「地下牢」10ステージ。旧ページの こもれびの森・洞窟も URL で 公開中）。', note: '採用は 決定。気に入った 方（両方でも）を えらんで ください。', candidates: ['poyo-1', 'poyo-2'], split: '両方なら: ステージを 遊ぶ 間は「ぽよぽよこもれび」（考える 間の ある 動機）、ステージ選択・クリア・旧ページの こもれびの森は「みんなでかえろう」（3拍子の 帰り道）。' },
    { id: 'naokoro', mode: 'confirm', label: 'なおころ。', cls: 'D', scope: 'なおころ。の タイトル・キャラクター選択・すごろく盤。', note: '採用は 決定。気に入った 方（両方でも）を えらんで ください。', candidates: ['koro-1', 'koro-2'], split: '両方なら: すごろく盤は「ころころじんせい」（サイコロの 3連符）、タイトル・キャラクター選択・ひとやすみは「いつかのゴール」（人生の ワルツ）。' },
    { id: 'card', mode: 'confirm', label: 'CARD GAME', cls: 'D', scope: 'CARD GAME の メニュー・デッキ・対戦・結果。', note: '採用は 決定。気に入った 方（両方でも）を えらんで ください。', candidates: ['card-1', 'card-2'], split: '両方なら: メニュー・デッキ・ふだんの 対戦は「カードをひらいて」、9〜10ラウンドや そだち100 目前の 勝負どころは「デュエル・スタート」（終盤を 判定する 画面は コードに ない ので 実装時に 追加。提案）。' },
    { id: 'minigame', mode: 'confirm', label: 'ミニゲーム汎用', cls: 'D', scope: 'アクション 32本・ストラテジー 2本・なおころ。の 埋めこみゲーム。', note: '採用は 決定。気に入った 方（両方でも）を えらんで ください。クイックモードは 別の タブ（既存 game を 残すかの 比較）。', candidates: ['game-1', 'game-2'], split: '両方なら: 速い 動きの アクション（ラン・シューター・ジャンプ）は「あそびのはじまり」、つみあげ・ジェンガ・たこやき など 間の ある ゲームと ストラテジーは「ぴょこぴょこステップ」。または 毎回 交互に。' },
    { id: 'explore', mode: 'confirm', label: '3D ゲーム', cls: 'D', scope: '3D の 探検 4本（おばけやしき・ダンジョン・たまころがし迷路・ボクセルマイニング）と 飛行・海 7本（うちゅう・リング・なつのうみフライト・サブマリン・ハンググライダー・ひこうき着陸・ルナランダー）。', note: '採用は 決定。気に入った 方（両方でも）を えらんで ください。', candidates: ['explore-1', 'explore-2'], split: '両方なら（もともとの ねらい）: 探検 4本は「ふしぎのちか」、飛行・海 7本は「そらとうみのさんぽ」。' },
    { id: 'sports', mode: 'compare', label: 'スポーツ', cls: 'E', scope: 'ボウリング・アーチェリー・ミニゴルフ・バスケ・卓球・フリーキック・やきゅう・スキージャンプ・エアホッケー・テニス・ダーツ・りくじょう・カーリング 2・ビーチバレー・岩場のぼり・ゲレンデ（17本）。いま sports 曲（不採用）。', note: '追加作曲 2案（VERSION 2）。ミニゲーム汎用で 採用する 曲が 決まれば、その 流用も 候補。', candidates: ['bgm-sports', 'sports-1', 'sports-2'], roles: { 'bgm-sports': '不採用（参考）' } },
    { id: 'fishing', mode: 'compare', label: '釣り', cls: 'D', scope: 'ほんかくさかなつり・うみ・しんかい・みずべ（4本）。いま sports 曲（不採用）。待つ 時間が 長い。', note: '3D で「そらとうみのさんぽ」が 採用なら その 流用が 自然。スポーツ2 も 候補。', candidates: ['bgm-sports', 'explore-2', 'sports-2'], roles: { 'bgm-sports': '不採用（参考）', 'explore-2': '流用候補（3D 曲・確認待ち）', 'sports-2': '流用候補' } },
    { id: 'puzzle', mode: 'compare', label: 'パズル・ボード', cls: 'D', scope: 'パズル 17本と ボード・テーブル 12本。いま puzzle 曲（不採用）。', note: 'なおぽよ。・CARD GAME で 採用する 曲の 流用を 検討（パズル←ぽよぽよこもれび、ボード←カードをひらいて）。ただし 独立ゲームの 曲を 本編でも 流すと 独立ゲームの 個性が うすれる。流用しない なら 追加作曲（E）。', candidates: ['bgm-puzzle', 'poyo-1', 'card-1'], roles: { 'bgm-puzzle': '不採用（参考）', 'poyo-1': '流用候補（パズル）', 'card-1': '流用候補（ボード）' } },
    { id: 'race', mode: 'compare', label: 'レース・シューティング 3D', cls: 'D', scope: 'ハイウェイ3D・カーレース3D・グランプリ・リズムハイウェイ・スペースガンナー（5本）。いま race 曲（未確定）。', note: '本物の レースには 既存 race の 疾走感が 合う。残すか、ミニゲーム汎用の 採用曲に そろえるか。', candidates: ['bgm-race', 'game-1', 'game-2'], roles: { 'bgm-race': 'いまの 曲（未確定）', 'game-1': '流用候補（ミニゲーム汎用）', 'game-2': '流用候補（ミニゲーム汎用）' } },
    { id: 'quick', mode: 'compare', label: 'クイックモード', cls: 'D', scope: 'クイックゲーム 50種（3〜6秒の 課題が つぎつぎ 続く 1ゲーム）。いま game 曲（未確定）。', note: 'せわしない クイックには 既存 game（1秒に 4.3音）の 速さが 合う 可能性。残すか、ミニゲーム汎用の 採用曲に そろえるか。', candidates: ['bgm-game', 'game-1', 'game-2'], roles: { 'bgm-game': 'いまの 曲（未確定）', 'game-1': '流用候補（ミニゲーム汎用）', 'game-2': '流用候補（ミニゲーム汎用）' } },
    { id: 'farewell', mode: 'compare', label: 'お別れ・一生カード', cls: 'D', scope: '死亡（てんごく）・100さいの さいごの じかん・一生カード・一生の ゲームクリア。いま farewell 曲（未確定）。', note: '既存 farewell と、保留中の「きせつのきおく」、採用済みの「ほしぞらのやくそく」の 流用を 比較。', candidates: ['bgm-farewell', 'kisetsu', 'home-night'], roles: { 'bgm-farewell': 'いまの 曲（未確定）', kisetsu: '保留曲の 流用', 'home-night': '採用曲の 流用' } },
    { id: 'birth', mode: 'compare', label: '誕生・誕生日・たまご', cls: 'D', scope: 'たまご・たまごが かえる・誕生日・図鑑や 実績の ゲームクリア。いま home 曲。', note: '保留中の「おめでとうのひ」と「おはようのひかり」（たまごの 目ざめ）。演出が 短い ので、ホーム曲の まま 効果音だけでも よい。', candidates: ['event-1', 'ohayo'], roles: { 'event-1': '保留', ohayo: '保留曲の 流用' } },
    { id: 'legend', mode: 'compare', label: 'でんせつの であい', cls: 'D', scope: '一生に 1度の 伝説の 出会いの 映画。いま movie 曲（不採用）。', note: '採用済み「ほしふるみずうみ」の 流用、保留中の「きせつのきおく」、採用済み「ふたりのきねんび」。', candidates: ['home-evening', 'kisetsu', 'event-2'], roles: { 'home-evening': '採用曲の 流用', kisetsu: '保留曲の 流用', 'event-2': '採用曲の 流用' } },
    { id: 'naokoro-result', mode: 'compare', label: 'なおころ。の 人生アルバム', cls: 'D', scope: '結果「こんな人生に、なりました。」と 過去の アルバム。', note: 'なおころ。で 採用する 曲（いつかのゴール なら 合う）か、「きせつのきおく」（保留）・「ふたりのきねんび」（採用）の 流用。', candidates: ['koro-2', 'kisetsu', 'event-2'], roles: { 'koro-2': 'なおころ。曲（確認待ち）', kisetsu: '保留曲の 流用', 'event-2': '採用曲の 流用' } },
    { id: 'sleep', mode: 'compare', label: '睡眠（流用案の 確認）', cls: 'C', scope: 'ペットが 眠っている 間。いま night 曲（不採用）。', note: '採用済み 夜「ほしぞらのやくそく」を 静かな 編曲で 流用する 案で よいかの 確認。', candidates: ['bgm-night', 'home-night'], roles: { 'bgm-night': '不採用（参考）', 'home-night': '採用曲の 流用（静かな 編曲 前提）' } },
    { id: 'date', mode: 'compare', label: 'デート・映画（流用案の 確認）', cls: 'C', scope: 'デートを 選ぶ 画面と デートの 映画。いま movie 曲（不採用）。', note: '採用済み「ふたりのきねんび」の 流用で よいかの 確認。夕の「ほしふるみずうみ」も 別案。', candidates: ['bgm-movie', 'event-2', 'home-evening'], roles: { 'bgm-movie': '不採用（参考）', 'event-2': '採用曲の 流用', 'home-evening': '採用曲の 流用（別案）' } },
  ];

  const api = { SONGS, SONG_STATUS, STATUS_LABEL, CLASS_INFO, USES, flatten: C.flatten, solfege: C.solfege };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_PLACEMENT_SONGS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
