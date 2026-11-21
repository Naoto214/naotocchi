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

  const STATUS_LABEL = { adopted: '採用', alt: '別案（候補として 保存）', hold: '保留', undecided: '未確定', pending: '評価待ち', new: '新曲（未評価）', migrating: '移行予定', rejected: '不採用（保護）' };
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
  // 2026-11-09 本人が iPhone Safari で 試聴して 確定（#531 の 新曲）
  const ADOPTED_NEW = { 'poyo-1': 'なおぽよ。', 'koro-1': 'なおころ。', 'card-2': 'CARD GAME', 'game-1': 'ミニゲーム汎用', 'explore-1': '3D ゲーム' };
  const ALT_NEW = { 'poyo-2': 'なおぽよ。', 'koro-2': 'なおころ。', 'card-1': 'CARD GAME', 'game-2': 'ミニゲーム汎用', 'explore-2': '3D ゲーム' };
  for (const [id, u] of Object.entries(ADOPTED_NEW)) SONG_STATUS[id] = S('adopted', `${u}で 採用（本人が iPhone Safari で 試聴して 確定）`);
  for (const [id, u] of Object.entries(ALT_NEW)) SONG_STATUS[id] = S('alt', `${u}の 別案。不採用では なく 候補として 保存（ほかの 用途への 流用も できる）`);
  for (const s of AD.ADD_SONGS) SONG_STATUS[s.id] = S('new', 'VERSION 2 で 追加作曲');

  const CLASS_INFO = { A: { short: '確定' }, B: { short: '既存曲で 対応' }, C: { short: '流用で 対応' }, D: { short: '未確定' }, E: { short: '不足' }, '無音': { short: '無音' } };

  // 試聴ページの 用途: まだ 決まっていない ものだけ。採用確定（A）の 曲は 選び直さない。
  // cover: 採用済みの 曲で カバーする 案が ある 用途（その 案で よいかを 決めるだけ）。
  const USES = [
    { id: 'puzzle', label: 'パズル', cls: 'D', scope: 'パズル 17本（ブロックパズル・2048・ナンプレ・ピクロス など）。いま puzzle 曲（不採用）。', note: '採用曲「ぽよぽよこもれび」（なおぽよ。）で カバーする 案。同じ パズルなので 合うが、なおぽよ。の 個性が うすれる。分けたい なら 追加作曲。', candidates: ['bgm-puzzle', 'poyo-1', 'poyo-2'], roles: { 'bgm-puzzle': '不採用（参考）', 'poyo-1': '採用曲で カバー', 'poyo-2': '別案の 流用' } },
    { id: 'board', label: 'ボード・テーブル', cls: 'D', scope: 'ボード・テーブル 12本（オセロ・どうぶつしょうぎ・五目ならべ・ソリティア・ブラックジャック など）。いま puzzle 曲（不採用）。', note: 'CARD GAME の 採用曲「デュエル・スタート」は 勝負の 曲で、考える ボードゲームには にぎやか すぎる。別案「カードをひらいて」（落ち着いた ドリア旋法）の 流用、または パズルと 同じ 曲。どれも 合わなければ 追加作曲。', candidates: ['bgm-puzzle', 'card-1', 'poyo-1', 'card-2'], roles: { 'bgm-puzzle': '不採用（参考）', 'card-1': '別案の 流用', 'poyo-1': '採用曲で カバー', 'card-2': '採用曲で カバー' } },
    { id: 'sports', label: 'スポーツ', cls: 'D', scope: 'ボウリング・アーチェリー・ミニゴルフ・バスケ・卓球・フリーキック・やきゅう・スキージャンプ・エアホッケー・テニス・ダーツ・りくじょう・カーリング 2・ビーチバレー・岩場のぼり・ゲレンデ（17本）。いま sports 曲（不採用）。', note: '採用曲「あそびのはじまり」（ミニゲーム汎用）で カバーする 案と、VERSION 2 の 追加作曲 2案（スポーツ専用）。', candidates: ['bgm-sports', 'game-1', 'sports-1', 'sports-2'], roles: { 'bgm-sports': '不採用（参考）', 'game-1': '採用曲で カバー' } },
    { id: 'fishing', label: '釣り', cls: 'D', scope: 'ほんかくさかなつり・うみ・しんかい・みずべ（4本）。いま sports 曲（不採用）。待つ 時間が 長い。', note: '3D の 採用曲「ふしぎのちか」は 地下の 曲で 水辺には 合いにくい。別案「そらとうみのさんぽ」（水辺）の 流用、スポーツの 曲（決まった もの）に そろえる、または スポーツ2。', candidates: ['bgm-sports', 'explore-2', 'sports-2', 'explore-1'], roles: { 'bgm-sports': '不採用（参考）', 'explore-2': '別案の 流用', 'sports-2': '追加作曲の 流用', 'explore-1': '採用曲で カバー' } },
    { id: 'race', label: 'レース・シューティング 3D', cls: 'D', scope: 'ハイウェイ3D・カーレース3D・グランプリ・リズムハイウェイ・スペースガンナー（5本）。いま race 曲（未確定）。', note: '既存 race（疾走感）を 残すか、採用曲「あそびのはじまり」で カバーするか。', candidates: ['bgm-race', 'game-1'], roles: { 'bgm-race': 'いまの 曲（未確定）', 'game-1': '採用曲で カバー' } },
    { id: 'flight', label: '3D 飛行・海（確認）', cls: 'C', scope: 'うちゅう・リング・なつのうみフライト・サブマリン・ハンググライダー・ひこうき着陸・ルナランダー（7本）。いま race 曲（未確定）。', note: '「3D ゲーム」で 採用した「ふしぎのちか」で カバーできる。ただし 地下・探検の 曲なので 空・海には 雰囲気が ちがう 可能性。別案「そらとうみのさんぽ」は もともと この 7本の ために 作った 曲。', candidates: ['explore-1', 'explore-2', 'bgm-race'], roles: { 'explore-1': '採用曲で カバー', 'explore-2': '別案の 流用', 'bgm-race': 'いまの 曲（未確定）' } },
    { id: 'quick', label: 'クイックモード', cls: 'D', scope: 'クイックゲーム 50種（3〜6秒の 課題が つぎつぎ 続く 1ゲーム）と なおころ。の クイック 4マス。いま game 曲（未確定）。', note: '既存 game（速い）を 残すか、採用曲「あそびのはじまり」に そろえるか。', candidates: ['bgm-game', 'game-1'], roles: { 'bgm-game': 'いまの 曲（未確定）', 'game-1': '採用曲で カバー' } },
    { id: 'farewell', label: 'お別れ・一生カード', cls: 'D', scope: '死亡（てんごく）・100さいの さいごの じかん・一生カード・一生の ゲームクリア。いま farewell 曲（未確定）。', note: '既存 farewell を 残すか、保留中の「きせつのきおく」、採用曲「ほしぞらのやくそく」の 流用か。', candidates: ['bgm-farewell', 'kisetsu', 'home-night'], roles: { 'bgm-farewell': 'いまの 曲（未確定）', kisetsu: '保留曲の 流用', 'home-night': '採用曲で カバー' } },
    { id: 'birth', label: '誕生・誕生日・たまご', cls: 'D', scope: 'たまご・たまごが かえる・誕生日・図鑑や 実績の ゲームクリア。いま home 曲（ホーム4曲で カバー中）。', note: '保留中の「おめでとうのひ」「おはようのひかり」を 使うか、ホーム4曲＋効果音の まま（専用曲なし）に するか。演出は 1〜3秒と 短い。', candidates: ['event-1', 'ohayo', 'home-morning'], roles: { 'event-1': '保留', ohayo: '保留曲の 流用', 'home-morning': 'ホーム曲の まま（例: 朝）' } },
    { id: 'legend', label: 'でんせつの であい', cls: 'D', scope: '一生に 1度の 伝説の 出会いの 映画。いま movie 曲（不採用）。', note: '採用曲「ほしふるみずうみ」「ふたりのきねんび」で カバーする 案と、保留中の「きせつのきおく」。', candidates: ['home-evening', 'event-2', 'kisetsu'], roles: { 'home-evening': '採用曲で カバー', 'event-2': '採用曲で カバー', kisetsu: '保留曲の 流用' } },
    { id: 'naokoro-result', label: 'なおころ。の 人生アルバム', cls: 'D', scope: '結果「こんな人生に、なりました。」と 過去の アルバム。', note: '採用曲「ころころじんせい」の まま、別案「いつかのゴール」（人生の ワルツ）、または「きせつのきおく」「ふたりのきねんび」。', candidates: ['koro-1', 'koro-2', 'kisetsu', 'event-2'], roles: { 'koro-1': '採用曲で カバー', 'koro-2': '別案の 流用', kisetsu: '保留曲の 流用', 'event-2': '採用曲で カバー' } },
    { id: 'sleep', label: '睡眠（確認）', cls: 'C', scope: 'ペットが 眠っている 間。いま night 曲（不採用）。', note: '採用曲 夜「ほしぞらのやくそく」を 静かな 編曲で カバーする 案で よいかの 確認。', candidates: ['bgm-night', 'home-night'], roles: { 'bgm-night': '不採用（参考）', 'home-night': '採用曲で カバー（静かな 編曲 前提）' } },
    { id: 'date', label: 'デート・映画（確認）', cls: 'C', scope: 'デートを 選ぶ 画面と デートの 映画。いま movie 曲（不採用）。', note: '採用曲「ふたりのきねんび」で カバーする 案で よいかの 確認。夕の「ほしふるみずうみ」も 別案。', candidates: ['bgm-movie', 'event-2', 'home-evening'], roles: { 'bgm-movie': '不採用（参考）', 'event-2': '採用曲で カバー', 'home-evening': '採用曲で カバー（別案）' } },
  ];

  const api = { SONGS, SONG_STATUS, STATUS_LABEL, CLASS_INFO, USES, flatten: C.flatten, solfege: C.solfege };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_PLACEMENT_SONGS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
