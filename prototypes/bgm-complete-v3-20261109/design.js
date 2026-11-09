// なおとっち BGM 完全設計 VERSION 3 (2026-11-09) — 曲の 一覧・採用状況・比較用途・最終配置表
// 曲データは どれも 元の オブジェクトを 参照するだけ。採用は 本人が 決めた 10曲だけ。新曲・変奏は すべて「候補」。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const C = isNode ? require('../bgm-survey-20261108/catalog.js') : root.NAOTOCCHI_BGM_CATALOG;
  const F = isNode ? require('../main-theme-favorites-20261108/favorites.js') : root.NAOTOCCHI_FAVORITES;
  const AD = isNode ? require('../bgm-placement-v2-20261109/songs-add.js') : root.NAOTOCCHI_ADD_BGM;
  const N3 = isNode ? require('./songs-v3.js') : root.NAOTOCCHI_BGM_V3_SONGS;
  const VR = isNode ? require('./variants.js') : root.NAOTOCCHI_BGM_V3_VARIANTS;
  const INV = isNode ? require('../bgm-placement-v2-20261109/inventory.js') : root.NAOTOCCHI_BGM_INVENTORY;
  const fav = (id) => F.FAVORITES.find((f) => f.id === id);

  // ---- 曲の 一覧 ----
  const SONGS = {};
  const add = (id, song, title, source, color, extra = {}) => { SONGS[id] = Object.assign({ id, song, title, source, color, gameSound: false, character: song.character || '', hook: song.hook || '', kind: song.kind || 'loop' }, extra); };
  for (const x of C.CATALOG) add(x.id, x.song, x.title, x.group === 'home' ? `ホーム ${x.label}（PR #530 アレンジA。ここでは 原曲の 旋律）` : x.group === 'existing' ? `audio.js「${x.label}」` : 'PR #531 新曲', x.group === 'home' ? 'home' : x.group === 'existing' ? 'existing' : 'p531', { gameSound: !!x.gameSound, character: x.character || '', hook: x.hook || '' });
  for (const id of ['kisetsu', 'ohayo']) { const f = fav(id); add(id, f.song, f.title, `${f.origin}（#529 で 保留）`, 'home'); }
  for (const s of AD.ADD_SONGS) add(s.id, s, s.title, 'PR #533 追加作曲（スポーツ）', 'p533');
  for (const s of N3.SONGS) add(s.id, s, s.title, s.kind === 'jingle' ? 'VERSION 3 新曲（ジングル）' : 'VERSION 3 新曲', 'v3');
  for (const s of VR.VARIANTS) add(s.id, s, s.title, `VERSION 3 変奏（元: ${s.baseId}。${s.arrangement}）`, 'variant', { baseId: s.baseId });
  SONGS['home-day'].title = 'いつもの にわ';

  // ---- 採用状況（本人の 判断の とおり。新曲・変奏は 候補） ----
  const STATUS_LABEL = { adopted: '採用', hold: '保留', undecided: '未確定', alt: '別案（保存）', candidate: '新曲候補（未評価）', variant: '変奏候補（未評価）', migrating: '移行予定', rejected: '不採用（保護）' };
  const ST = {};
  const set = (ids, status, note) => ids.forEach((id) => { ST[id] = { status, note }; });
  set(['home-morning', 'home-day', 'home-evening', 'home-night'], 'adopted', 'ホーム 朝昼夕夜（PR #530 アレンジA）。メロディは 変更しない');
  set(['poyo-1'], 'adopted', 'なおぽよ。'); set(['koro-1'], 'adopted', 'なおころ。'); set(['card-2'], 'adopted', 'CARD GAME');
  set(['game-1'], 'adopted', 'ミニゲーム汎用'); set(['explore-1'], 'adopted', '3D 探検'); set(['event-2'], 'adopted', '結婚・記念日');
  set(['event-1', 'kisetsu', 'ohayo'], 'hold', '保留');
  set(['bgm-game', 'bgm-race', 'bgm-farewell'], 'undecided', '既存曲。未確定（不採用では ない）');
  set(['bgm-night', 'bgm-movie', 'bgm-puzzle', 'bgm-sports'], 'rejected', '既存曲。不採用。正式統合までは audio.js に 残し 復元できる');
  set(['bgm-home'], 'migrating', 'ホーム4曲へ 移行予定');
  set(['poyo-2', 'koro-2', 'card-1', 'game-2', 'explore-2'], 'alt', '#531 の 別案。削除せず 候補として 保存');
  set(['sports-1', 'sports-2'], 'candidate', 'PR #533 の 追加作曲。未評価');
  for (const s of N3.SONGS) ST[s.id] = { status: 'candidate', note: 'VERSION 3 の 新曲。未評価（勝手に 採用しない）' };
  for (const s of VR.VARIANTS) ST[s.id] = { status: 'variant', note: `採用曲の 変奏（メロディは 元の まま）。${s.arrangement}` };
  const ADOPTED = Object.keys(ST).filter((id) => ST[id].status === 'adopted');

  // ---- 比較する 用途（新曲と 未確定曲だけ。採用済み 10曲は 選び直さない） ----
  const U = (id, label, scope, note, candidates, roles = {}) => ({ id, label, scope, note, candidates, roles });
  const USES = [
    U('puzzle', 'パズル 17本', 'ブロックパズル・2048・ナンプレ・ピクロス・マッチ3 など。いま puzzle（不採用）。', 'なおぽよ。と 区別できる 本編パズル専用曲を 2案。長い 音中心の「しずかなひらめき」と、手を 動かす パズル向けの「つみきのまど」。', ['puzzle-a', 'puzzle-b', 'poyo-2', 'bgm-puzzle'], { 'poyo-2': '別案の 流用', 'bgm-puzzle': '参考（不採用）' }),
    U('board', 'ボード・テーブル 12本', 'オセロ・どうぶつしょうぎ・五目ならべ・ソリティア・ブラックジャック・上海 など。いま puzzle（不採用）。', '卓上ゲーム専用曲を 2案。喫茶店の ような「テーブルのまんなか」と、盤を はさんで 向かい合う 品の よい メヌエット「きしとおしろ」。', ['board-a', 'board-b', 'card-1', 'bgm-puzzle'], { 'card-1': '別案の 流用', 'bgm-puzzle': '参考（不採用）' }),
    U('sports', 'スポーツ 17本', 'ボウリング・バスケ・テニス・やきゅう・カーリング など。いま sports（不採用）。', 'PR #533 で 作った スポーツ専用 2案が すでに ある ので 新曲は 足さない。', ['sports-1', 'sports-2', 'game-2', 'bgm-sports'], { 'game-2': '別案の 流用', 'bgm-sports': '参考（不採用）' }),
    U('fishing', '釣り 4本', 'ほんかくさかなつり・うみ・しんかい・みずべ。待つ 時間が 長い。いま sports（不採用）。', '水辺の 専用曲「みずべのうたたね」（1秒に 約1音）と、空と 海の 別案「そらとうみのさんぽ」。', ['fishing-a', 'explore-2', 'bgm-sports'], { 'explore-2': '別案の 流用', 'bgm-sports': '参考（不採用）' }),
    U('race', 'レース・シューティング 5本', 'ハイウェイ3D・カーレース3D・グランプリ・リズムハイウェイ・スペースガンナー。いま race（未確定）。', '既存 race と、新曲 2案（短調の 疾走「ゴールまでいっしょに」、星空の 高速道路「ほしのハイウェイ」）。', ['bgm-race', 'race-a', 'race-b'], { 'bgm-race': 'いまの 曲（未確定）' }),
    U('flight', '3D 飛行・海 7本', 'うちゅう・リング・なつのうみフライト・サブマリン・ハンググライダー・着陸・ルナランダー。いま race（未確定）。', '採用曲「ふしぎのちか」は 地下・探検の 曲なので、空・海には 専用の 案を。もともと この 7本の ために 作った 別案「そらとうみのさんぽ」と、うちゅう系に 合う「ほしのハイウェイ」。', ['explore-2', 'race-b', 'bgm-race'], { 'explore-2': '別案の 流用', 'race-b': '新曲（レースと 共通案）', 'bgm-race': 'いまの 曲（未確定）' }),
    U('quick', 'クイックモード 50種', '3〜6秒の 課題が つぎつぎ 続く 1ゲーム（なおころ。の クイック 4マスも）。いま game（未確定）。', '既存 game の 速さを 残すか、別案「ぴょこぴょこステップ」か。採用曲「あそびのはじまり」は 通常ミニゲーム用。', ['bgm-game', 'game-2'], { 'bgm-game': 'いまの 曲（未確定）', 'game-2': '別案の 流用' }),
    U('sleep', '睡眠', 'ペットが 眠っている 間（ねる〜おきる）。いま night（不採用）。', '採用曲 夜「ほしぞらのやくそく」の 子守歌変奏（メロディ同じ・テンポ 60）と、専用の 子守歌「ねむりのほし」。', ['var-sleep', 'lullaby-a', 'bgm-night'], { 'bgm-night': '参考（不採用）' }),
    U('farewell', 'お別れ・旅立ち', '死亡・100さいの さいごの じかん・一生カード・一生の ゲームクリア。いま farewell（未確定）。', 'なおとっちの 物語の 中心の 場面なので、専用曲を 2案。既存 farewell と 保留中の「きせつのきおく」とも 比較。', ['farewell-a', 'farewell-b', 'bgm-farewell', 'kisetsu'], { 'bgm-farewell': 'いまの 曲（未確定）', kisetsu: '保留' }),
    U('birth', '誕生・誕生日・達成', 'たまごが かえる（2.8秒）・誕生日（1.2秒）・図鑑や 実績の 達成・ゲームクリア。いま home。', '演出が 数秒と 短い ので、ループ曲では なく ジングルを 2つ。クリア画面に 長く いる 場合は 保留曲も 候補。', ['jingle-birth', 'jingle-achieve', 'event-1', 'ohayo'], { 'event-1': '保留', ohayo: '保留' }),
    U('naopoyo-end', 'なおぽよ。の クリア・章の おわり', 'ステージクリア「みんな、おかえり。」と 第1章クリア。', '採用曲「ぽよぽよこもれび」の 変奏（メロディ同じ）で、なおぽよ。の 個性を 保つ。', ['var-poyo-clear', 'var-poyo-chapter', 'poyo-2'], { 'poyo-2': '別案の 流用' }),
    U('naokoro-end', 'なおころ。の ゴール・人生アルバム', '最終ターンの ゴールと「こんな人生に、なりました。」。', '採用曲「ころころじんせい」の 変奏（ゴールの ジングル・ゆっくりの 人生アルバム版）と、別案「いつかのゴール」・保留中の「きせつのきおく」。', ['var-koro-goal', 'var-koro-album', 'koro-2', 'kisetsu'], { 'koro-2': '別案の 流用', kisetsu: '保留' }),
    U('card-end', 'CARD GAME の 終盤・勝敗', '9〜10ラウンド・そだち100 目前の 勝負どころ（判定は 実装時に 追加）と、勝利・敗北の 結果。', '採用曲「デュエル・スタート」の 変奏（終盤は テンポだけ 上げる・勝利は 終わりの 4小節）と、敗北の 新しい ジングル。', ['var-card-late', 'var-card-win', 'jingle-card-lose'], {}),
    U('date', 'デート・映画（配置の 確認）', 'デートを 選ぶ 画面と デートの 映画（約20〜30秒）。いま movie（不採用）。', '新曲は 作らず、採用曲「ふたりのきねんび」を 配置する 案。夕「ほしふるみずうみ」・保留の「きせつのきおく」とも 比べて、配置だけ 決めて ほしい。', ['event-2', 'home-evening', 'kisetsu', 'bgm-movie'], { 'event-2': '採用曲の 配置案', 'home-evening': '採用曲の 配置案（別案）', kisetsu: '保留', 'bgm-movie': '参考（不採用）' }),
  ];

  // ---- 最終配置表 ----
  // exists: 実在 = いまの コードに ある 画面 / 将来構想 = いまは ない（実装時に 追加が 必要）
  // status: 採用 = 本人が 採用した 曲 / 候補比較中 = 新曲・変奏・未確定曲から 本人が えらぶ / 無音
  const HOME4 = ['home-morning', 'home-day', 'home-evening', 'home-night'];
  const SW = '時間帯（朝 05:00・昼 10:00・夕 16:00・夜 19:00、背景と 同じ 判定）で 4秒 クロスフェード';
  const R = (o) => Object.assign({ exists: '実在', loop: 'あり', volume: '0 dB（ホーム基準）', fade: '場面の 切りかえで 0.8秒 クロスフェード（いまの audio.js と 同じ）', sfx: '効果音は そのまま。声の よみあげ中は BGM を 下げる（いまの audio.js と 同じ）', notes: '' }, o);
  const MG = (id) => (INV.MINIGAME_ROWS.find((r) => r.id === id) || {});
  const TABLE = [
    // ===== ホーム・育成 =====
    R({ game: 'ホーム', scene: '2.5D ホーム 朝昼夕夜（おうち）', songs: HOME4, status: '採用', arrangement: 'アレンジA（#530）', start: 'ホーム画面に いる 間', stop: 'ほかの 場面へ 移る とき', fade: SW, notes: '現行 audio.js は 時刻で 曲を 変えない。world-environment.js の timeOfDay() と 同じ 判定を 使う' }),
    R({ game: 'ホーム', scene: '13地域（とかい〜きおくのみずうみ）', songs: HOME4, status: '採用', arrangement: 'アレンジA（地域ごとの 音色の 変奏は 将来構想）', start: '地域に いる 間', stop: '同上', fade: SW, notes: '13地域ごとの 編曲（楽器の 色かえ）は 将来構想。旋律は 同じ ホーム4曲' }),
    R({ game: 'ホーム', scene: 'メニュー・お店・アイテム・図鑑・実績・アルバム・シール・設定・旅行・つうしん', songs: HOME4, status: '採用', arrangement: 'ホーム曲を 止めずに 続ける', start: '—', stop: '—', volume: '0 dB', fade: 'なし（同じ 曲が 続く）', notes: '画面を 開くたびに 曲を 変えない' }),
    R({ game: 'ホーム', scene: 'めぐる（世界を 歩く）', songs: HOME4, status: '採用', arrangement: 'アレンジA', start: 'めぐる 開始', stop: '終了', fade: SW, notes: '地域ごとの 変奏は 将来構想' }),
    R({ game: 'ホーム', scene: '成長・変身・そだち・中年の できごと', songs: HOME4, status: '採用', arrangement: 'ホーム曲の まま（専用 BGM なし）', start: '—', stop: '—', loop: '—', fade: 'なし', sfx: '既存の 効果音（levelup など）が 主役。BGM は 変えない', notes: '4.2秒の 演出。専用曲は 不要と 判断' }),
    R({ game: 'ホーム', scene: '仲間の さそい・恋人に なった', songs: HOME4, status: '採用', arrangement: 'ホーム曲の まま', start: '—', stop: '—', loop: '—', fade: 'なし', sfx: '既存の 効果音（love など）', notes: '一瞬の お知らせ。専用曲 不要' }),
    R({ game: 'ホーム', scene: '睡眠（ねる〜おきる）', songs: ['var-sleep', 'lullaby-a'], status: '候補比較中', arrangement: '子守歌変奏（ほしぞらのやくそく・テンポ 60・オルゴール風）／新曲 子守歌', start: '「ねる」を 押した とき', stop: '「おきる」', volume: '−8 dB', fade: '入り 3秒・出 1.5秒', sfx: '効果音（sleep / wake）の あとに 入る', notes: 'いまの night は 不採用。時刻とは 関係なく 眠りの 曲' }),
    R({ game: 'ホーム', scene: 'デートを 選ぶ 画面・デートの 映画', songs: ['event-2', 'home-evening', 'kisetsu'], status: '候補比較中（配置の 確認）', arrangement: '採用曲を そのまま 配置', start: 'デート選択を 開いた とき', stop: '映画の おわり', volume: '0 dB', notes: 'いまの movie は 不採用。新曲は 作らない' }),
    R({ game: 'ホーム', scene: '結婚記念日の 映画（1・10・25・50年）', songs: ['event-2'], status: '採用', arrangement: 'ふたりのきねんび（原曲）', start: '映画の 開始', stop: '映画の おわり（約 20〜30秒）で 2秒 フェードアウト', loop: 'なし（途中で フェード）', notes: '' }),
    R({ game: 'ホーム', scene: '結婚した（お知らせ）', songs: ['event-2'], status: '採用', arrangement: 'ふたりのきねんび の 頭 4小節（実装時に 切りだし）', start: 'お知らせ 表示', stop: '数秒で フェード', loop: 'なし', sfx: 'ホーム曲を −10 dB に 下げて 重ねる', notes: '一瞬の 演出なので 頭だけ' }),
    R({ game: 'ホーム', scene: 'でんせつの であい（映画）', songs: ['home-evening', 'kisetsu', 'event-2'], status: '候補比較中（配置の 確認）', arrangement: '採用曲・保留曲を そのまま 配置', start: '映画の 開始', stop: '映画の おわり', loop: 'なし', notes: '一生に 1度。新曲は 作らない' }),
    R({ game: 'ホーム', scene: 'お別れ（死亡・100さいの さいごの じかん・一生カード）', songs: ['farewell-a', 'farewell-b', 'bgm-farewell', 'kisetsu'], status: '候補比較中', arrangement: '専用曲', start: '旅立ち・死亡の 画面', stop: '新しい たまごを 始める とき', volume: '−2 dB', fade: '入り 2秒・出 3秒', notes: 'いまの farewell は 未確定' }),
    R({ game: 'ホーム', scene: 'たまごが かえる・誕生日', songs: ['jingle-birth'], status: '候補比較中', arrangement: 'ジングル（約 5秒）', start: '演出の 開始', stop: 'ジングルの おわり', loop: 'なし', volume: 'ジングル 0 dB／ホーム曲は −10 dB に 下げる', fade: 'ホーム曲を 0.2秒で 下げ、1秒で もどす', sfx: 'hatch 効果音と 重ならない よう 0.3秒 後に 鳴らす', notes: '候補: うまれたよ（新）・おめでとうのひ（保留）・おはようのひかり（保留）' }),
    R({ game: 'ホーム', scene: '図鑑・実績の 達成／GAME CLEAR（図鑑・すべての 実績）', songs: ['jingle-achieve', 'event-1'], status: '候補比較中', arrangement: '達成は ジングル（8秒）、クリア画面に とどまる 間は 保留曲も 候補', start: '達成・クリア 表示', stop: '画面を 閉じる', loop: 'ジングルは なし', notes: 'いまは 図鑑・実績の クリアが home、一生の クリアが farewell と 分かれている。一生の クリアは お別れの 曲に そろえる' }),
    R({ game: 'ホーム', scene: 'たまご（かえるまで）・むげんモード・個性の 選択', songs: HOME4, status: '採用', arrangement: 'ホーム曲', start: '—', stop: '—', notes: '' }),
    // ===== なおぽよ。 =====
    R({ game: 'なおぽよ。', scene: '遊ぶ 画面・ステージ選択・おてほん・説明（第1章 地下牢 10ステージ）', songs: ['poyo-1'], status: '採用', arrangement: '原曲', start: 'ページを 開いて 最初の タップ', stop: 'ホームに もどる', volume: '−3 dB（考える 時間を じゃましない）', notes: 'なおぽよ。は いま 音が まったく ない。audio.js とは 別に 小さな 再生しかけが 必要（実装時）。タイトル画面は ない（いきなり 遊ぶ 画面）' }),
    R({ game: 'なおぽよ。', scene: '地下牢・苔・冷たい広間・夜明け（ステージの 雰囲気）・重力の ステージ', songs: ['poyo-1'], status: '採用', arrangement: '原曲（雰囲気ごとの 音色かえは 将来構想）', start: '—', stop: '—', notes: '特殊ギミック（重力）で 曲は 変えない。効果音で 伝える' }),
    R({ game: 'なおぽよ。', scene: '旧ページ（ひかりの牢屋・こもれびの森・rescue の 洞窟/古城）', songs: ['poyo-1'], status: '採用', arrangement: '原曲', start: '—', stop: '—', notes: 'URL で 公開中の 旧ページも 同じ 曲で まとめる' }),
    R({ game: 'なおぽよ。', scene: 'ステージクリア「みんな、おかえり。」', songs: ['var-poyo-clear'], status: '候補比較中', arrangement: '変奏: 13〜16小節（約 10秒）', start: 'クリア表示', stop: '1回で おわり、次の ステージで 本曲へ', loop: 'なし', fade: '本曲を 0.3秒で 下げて 入れかえ', notes: '' }),
    R({ game: 'なおぽよ。', scene: '第1章クリア（地下牢を ぬけて 光へ）', songs: ['var-poyo-chapter'], status: '候補比較中', arrangement: '変奏: テンポ 80（約 48秒）', start: '章クリア表示', stop: '画面を 閉じる', loop: 'あり', notes: '' }),
    R({ game: 'なおぽよ。', scene: '失敗・やりなおし', songs: [], status: '無音（BGM は 変えない）', arrangement: '—', start: '—', stop: '—', loop: '—', notes: 'いまの なおぽよ。には 失敗画面が ない（もどす・やりなおす）。曲は 止めない' }),
    R({ game: 'なおぽよ。', scene: '第2章以降（地底洞窟・古城・光の森 … 時の塔）', exists: '将来構想', songs: ['poyo-1'], status: '採用（将来は 章ごとの 変奏を 検討）', arrangement: '原曲／章ごとの 変奏', start: '—', stop: '—', notes: 'ロードマップに 10章。いまは 第1章だけ' }),
    // ===== なおころ。 =====
    R({ game: 'なおころ。', scene: 'タイトル・キャラクター選択・ひとやすみ・対戦コード', songs: ['koro-1'], status: '採用', arrangement: '原曲', start: 'タイトル表示', stop: 'ホームに もどる', notes: 'いまは audio.js を 読むが BGM を オフに している（main-v4.mjs:16）。統合時に オンに する' }),
    R({ game: 'なおころ。', scene: 'すごろく盤（できごと・仲間・恋人・結婚・とき・へんしん・お店）', songs: ['koro-1'], status: '採用', arrangement: '原曲', start: '盤の 開始', stop: 'ゴール', sfx: 'マスの できごとは 効果音で。曲は 止めない', notes: '仲間・恋人・結婚の マスも 曲は 変えない（一瞬の 演出）' }),
    R({ game: 'なおころ。', scene: '盤の ゲーム 2マス（通常ミニゲーム 15本）', songs: ['game-1'], status: '採用', arrangement: '原曲（本編の ミニゲームと 同じ）', start: 'ミニゲーム 開始', stop: '終了で 盤の 曲へ', volume: '−2 dB', notes: '' }),
    R({ game: 'なおころ。', scene: '盤の クイック 4マス（45種）', songs: ['bgm-game', 'game-2'], status: '候補比較中', arrangement: '本編の クイックモードと 同じ', start: 'クイック 開始', stop: '終了', volume: '−2 dB', notes: '' }),
    R({ game: 'なおころ。', scene: '最終ターンの ゴール', songs: ['var-koro-goal'], status: '候補比較中', arrangement: '変奏: 13〜16小節（約 9秒）', start: 'ゴール', stop: '1回', loop: 'なし', notes: '' }),
    R({ game: 'なおころ。', scene: '終盤（のこり 3ターン など）', exists: '将来構想', songs: ['koro-1'], status: '採用（変奏は 将来構想）', arrangement: '同じ 曲の テンポを 少し 上げる 案', start: '—', stop: '—', notes: '終盤を 判定する 画面は いまの コードに ない' }),
    R({ game: 'なおころ。', scene: '人生アルバム「こんな人生に、なりました。」・過去の アルバム', songs: ['var-koro-album', 'koro-2', 'kisetsu'], status: '候補比較中', arrangement: '変奏: テンポ 84／別案／保留曲', start: '結果表示', stop: '画面を 閉じる', notes: '' }),
    // ===== CARD GAME =====
    R({ game: 'CARD GAME', scene: 'はじめの メニュー・対戦の 準備・マイデッキ・コレクション・戦績・あそびかた・ルールブック', songs: ['card-2'], status: '採用', arrangement: '原曲', start: 'ページを 開いて 最初の タップ', stop: 'ホームに もどる', volume: '−4 dB（考える 画面なので 小さめ）', notes: 'いまは 音が まったく ない。メニューで にぎやか すぎる と 感じたら、別案「カードをひらいて」を メニューだけに 使う 余地を 残す' }),
    R({ game: 'CARD GAME', scene: '通常の 対戦（ラウンド 1〜8）', songs: ['card-2'], status: '採用', arrangement: '原曲', start: '対戦 開始', stop: '終盤 または 結果', volume: '−2 dB', notes: '' }),
    R({ game: 'CARD GAME', scene: '終盤の 逆転（ラウンド 9〜10・そだち100 目前）', exists: '将来構想（判定は 実装時に 追加）', songs: ['var-card-late'], status: '候補比較中', arrangement: '変奏: テンポ 156', start: '終盤の 条件を 満たした とき', stop: '結果', fade: '同じ 曲の まま テンポを 切りかえ（拍の 頭で）', notes: 'いまの コードに 終盤の 画面は ない' }),
    R({ game: 'CARD GAME', scene: '勝利', songs: ['var-card-win'], status: '候補比較中', arrangement: '変奏: 13〜16小節（約 7秒）', start: '結果表示', stop: '1回', loop: 'なし', notes: '最後の 弱起（シ シ）は 曲の 一部なので そのまま。気に なれば 実装時に フェード' }),
    R({ game: 'CARD GAME', scene: '敗北・引き分け', songs: ['jingle-card-lose'], status: '候補比較中', arrangement: '新ジングル（約 5秒）', start: '結果表示', stop: '1回', loop: 'なし', notes: 'ふたりで 遊ぶ ときは 勝者側の ジングルだけ' }),
    R({ game: 'CARD GAME', scene: '特別な カード演出（けっこん・おわかれ・たんじょう・成長の お知らせ）', songs: ['card-2'], status: '採用', arrangement: '曲は 変えない', start: '—', stop: '—', loop: '—', sfx: '効果音で 伝える（今は 音が ないので 実装時に 追加）', notes: '短い お知らせ。専用曲は 不要' }),
    // ===== ミニゲーム =====
    R({ game: '通常ミニゲーム', scene: `アクション ${MG('mg-action').minigames}本`, songs: ['game-1'], status: '採用', arrangement: '原曲', start: 'ゲーム開始', stop: '結果で ホーム曲へ', volume: '−2 dB（効果音が 多い）', notes: (MG('mg-action').gameIds || []).join(', '), gameIds: MG('mg-action').gameIds || [] }),
    R({ game: '通常ミニゲーム', scene: `ストラテジー ${MG('mg-strategy').minigames}本`, songs: ['game-1'], status: '採用', arrangement: '原曲', start: '同上', stop: '同上', volume: '−2 dB', notes: (MG('mg-strategy').gameIds || []).join(', '), gameIds: MG('mg-strategy').gameIds || [] }),
    R({ game: '通常ミニゲーム', scene: `パズル ${MG('mg-puzzle').minigames}本`, songs: ['puzzle-a', 'puzzle-b'], status: '候補比較中', arrangement: '専用曲', start: '同上', stop: '同上', volume: '−4 dB', notes: (MG('mg-puzzle').gameIds || []).join(', '), gameIds: MG('mg-puzzle').gameIds || [] }),
    R({ game: '通常ミニゲーム', scene: `ボード・テーブル ${MG('mg-board').minigames}本`, songs: ['board-a', 'board-b'], status: '候補比較中', arrangement: '専用曲', start: '同上', stop: '同上', volume: '−4 dB', notes: (MG('mg-board').gameIds || []).join(', '), gameIds: MG('mg-board').gameIds || [] }),
    R({ game: '通常ミニゲーム', scene: `スポーツ ${MG('mg-sports').minigames}本`, songs: ['sports-1', 'sports-2'], status: '候補比較中', arrangement: '専用曲（PR #533）', start: '同上', stop: '同上', volume: '−2 dB', notes: (MG('mg-sports').gameIds || []).join(', '), gameIds: MG('mg-sports').gameIds || [] }),
    R({ game: '通常ミニゲーム', scene: `釣り ${MG('mg-fishing').minigames}本`, songs: ['fishing-a', 'explore-2'], status: '候補比較中', arrangement: '専用曲／別案', start: '同上', stop: '同上', volume: '−4 dB', sfx: 'うき・あわせる の 効果音が 主役', notes: (MG('mg-fishing').gameIds || []).join(', '), gameIds: MG('mg-fishing').gameIds || [] }),
    R({ game: '3D ゲーム', scene: `レース・シューティング ${MG('mg-race').minigames}本`, songs: ['race-a', 'race-b', 'bgm-race'], status: '候補比較中', arrangement: '専用曲／既存 race', start: '同上', stop: '同上', volume: '−1 dB', notes: (MG('mg-race').gameIds || []).join(', '), gameIds: MG('mg-race').gameIds || [] }),
    R({ game: '3D ゲーム', scene: `探検・ダンジョン ${MG('mg-explore').minigames}本`, songs: ['explore-1'], status: '採用', arrangement: '原曲', start: '同上', stop: '同上', volume: '−2 dB', notes: (MG('mg-explore').gameIds || []).join(', '), gameIds: MG('mg-explore').gameIds || [] }),
    R({ game: '3D ゲーム', scene: `飛行・海 ${MG('mg-flight').minigames}本`, songs: ['explore-2', 'race-b', 'explore-1'], status: '候補比較中', arrangement: '別案・新曲／採用曲で カバー', start: '同上', stop: '同上', volume: '−2 dB', notes: `${(MG('mg-flight').gameIds || []).join(', ')}。「3D ゲーム」の 採用曲 ふしぎのちか でも カバーは できる`, gameIds: MG('mg-flight').gameIds || [] }),
    R({ game: 'クイックモード', scene: 'クイックゲーム 50種（1つの ゲームとして 続けて 遊ぶ）', songs: ['bgm-game', 'game-2'], status: '候補比較中', arrangement: '既存 game／別案', start: 'クイック 開始', stop: '結果で ホーム曲へ', volume: '−2 dB', sfx: '指示の 声（よみあげ）の 間は BGM を 下げる（いまの audio.js と 同じ）', notes: '課題ごとに 曲は 変えない' }),
    R({ game: '通常ミニゲーム', scene: 'ミニゲームの 結果', songs: HOME4, status: '採用', arrangement: 'ホーム曲に もどる', start: '結果表示', stop: '—', fade: '0.8秒 クロスフェード', notes: '' }),
    // ===== その他 =====
    R({ game: 'ものがたり『微睡みの箱庭』', scene: '読む 画面すべて', songs: [], status: '無音', arrangement: '—', start: '—', stop: '—', loop: '—', volume: '—', fade: '—', sfx: '—', notes: '方針どおり 初期は 無音。将来、希望者だけ 静かな BGM を オンに する しくみは 将来構想' }),
    R({ game: '共通', scene: '起動直後（最初の タップまで）・BGM オフ設定', songs: [], status: '無音', arrangement: '—', start: '—', stop: '—', loop: '—', volume: '—', fade: '—', sfx: '—', notes: 'ブラウザの 決まり・本人の 設定どおり' }),
  ];

  // ===== 2026-11-09 本人の 試聴結果（試聴ページの 評価を db で 共有して 読み取り） =====
  // 「採用」は 本人が その 用途で 採用を 押した もの。押していない 曲は 不採用に せず 候補として 保存。
  const DECISIONS = [
    { use: 'puzzle', song: 'poyo-2' }, { use: 'board', song: 'board-b' }, { use: 'sports', song: 'game-2' },
    { use: 'fishing', song: 'fishing-a' }, { use: 'race', song: 'bgm-race' }, { use: 'flight', song: 'explore-2', memo: '煌びやかに、もう少しテンポ早くして' },
    { use: 'quick', song: 'bgm-game' }, { use: 'sleep', song: 'lullaby-a' }, { use: 'farewell', song: 'bgm-farewell' },
    { use: 'achieve', song: 'jingle-achieve' }, { use: 'naopoyo-end', song: 'var-poyo-clear' }, { use: 'naokoro-end', song: 'var-koro-goal' },
    { use: 'card-end', song: 'var-card-late' }, { use: 'card-end', song: 'jingle-card-lose' }, { use: 'date', song: 'event-2' },
    // 2026-11-09 2回目の 試聴（のこり 6か所）
    { use: 'birth', song: 'ohayo' }, { use: 'card-win', song: 'var-card-win' }, { use: 'flight', song: 'var-flight' },
    { use: 'legend', song: 'kisetsu' }, { use: 'naokoro-album', song: 'var-koro-album' }, { use: 'naopoyo-chapter', song: 'var-poyo-chapter' },
    // 2026-11-09 3回目（最後の 1か所）
    { use: 'clear', song: 'event-1' },
  ];
  const REJECTED_BY_RATING = [{ use: 'puzzle', song: 'bgm-puzzle' }];
  const HOLD_BY_RATING = [{ use: 'birth', song: 'ohayo' }, { use: 'farewell', song: 'kisetsu' }, { use: 'naokoro-end', song: 'kisetsu' }];
  const USE_LABEL = { puzzle: 'パズル', board: 'ボード・テーブル', sports: 'スポーツ', fishing: '釣り', race: 'レース・シューティング', flight: '3D 飛行・海', quick: 'クイックモード', sleep: '睡眠', farewell: 'お別れ', achieve: '達成', 'naopoyo-end': 'なおぽよ。ステージクリア', 'naokoro-end': 'なおころ。ゴール', 'card-end': 'CARD GAME 終盤・敗北', date: 'デート・映画', birth: '誕生・誕生日', 'card-win': 'CARD GAME 勝利', legend: 'でんせつの であい', 'naokoro-album': 'なおころ。人生アルバム', 'naopoyo-chapter': 'なおぽよ。第1章クリア', clear: 'GAME CLEAR 画面' };
  for (const d of DECISIONS) {
    const prev = ST[d.song]; const where = USE_LABEL[d.use];
    if (prev && prev.status === 'adopted') { prev.note += `／${where}にも 採用（2026-11-09）`; continue; }
    ST[d.song] = { status: 'adopted', note: `${where}で 採用（2026-11-09 本人の 試聴）${d.memo ? `。本人メモ「${d.memo}」→ 変奏「そらとうみのさんぽ（きらめき・はやめ）」を 用意` : ''}` };
  }
  for (const id of ['puzzle-a', 'puzzle-b', 'board-a', 'race-a', 'race-b', 'farewell-a', 'farewell-b', 'sports-1', 'sports-2', 'var-sleep'])
    if (ST[id].status !== 'adopted') ST[id] = { status: 'unpicked', note: '今回の 試聴では 選ばれなかった（不採用の 印は ない）。削除せず 候補として 保存' };
  STATUS_LABEL.unpicked = '選ばれなかった 候補（保存）';
  if (ST['jingle-birth'].status !== 'adopted') ST['jingle-birth'] = { status: 'unpicked', note: '誕生・誕生日では おはようのひかり が 採用された。削除せず 候補として 保存' };
  ADOPTED.length = 0; for (const id of Object.keys(ST)) if (ST[id].status === 'adopted') ADOPTED.push(id);

  // 比較する 用途は、まだ 決まっていない ものだけに しぼる
  const OPEN_USES = [
    U('clear', 'GAME CLEAR 画面', '図鑑 コンプリート・すべての 実績で 出る GAME CLEAR 画面に とどまる 間。いまは home。達成の お知らせは ジングル「やったね」で 確定。一生の クリアは お別れ（farewell）。', 'のこる 最後の 1か所。保留の「おめでとうのひ」、誕生で 採用した「おはようのひかり」、でんせつの であいで 採用した「きせつのきおく」、または ホーム曲に もどす（例: 昼「いつものにわ」）。', ['event-1', 'ohayo', 'kisetsu', 'home-day'], { 'event-1': '保留', ohayo: '採用曲の 流用（誕生）', kisetsu: '採用曲の 流用（でんせつ）', 'home-day': 'ホーム曲に もどす 案' }),
  ];
  USES.length = 0; // 2026-11-09: すべての 場面の 曲が 決まった ため、比較する 用途は ない
  for (const id of ['var-ohayo-birth2', 'var-ohayo-birth4']) ST[id] = { status: 'variant', note: 'おはようのひかり の 長さの 案。たまごが かえる ときも 効果音だけに した ため、いまは 使わない（保存）' };

  // 最終配置表に 反映
  const row = (pre) => { const r = TABLE.find((x) => x.scene.startsWith(pre)); if (!r) throw new Error('no row ' + pre); return r; };
  const adopt = (pre, songs, extra = {}) => Object.assign(row(pre), { songs, status: '採用' }, extra);
  adopt('睡眠', ['lullaby-a'], { arrangement: '新曲「ねむりのほし」（オルゴール風の 編曲を 想定）' });
  adopt('デートを 選ぶ', ['event-2'], { arrangement: 'ふたりのきねんび（原曲）' });
  adopt('お別れ', ['bgm-farewell'], { arrangement: '既存 audio.js「farewell」（そのまま。新しい 音色への 編曲は 実装時に 検討）' });
  adopt('ステージクリア', ['var-poyo-clear']);
  adopt('最終ターンの ゴール', ['var-koro-goal']);
  adopt('盤の クイック', ['bgm-game'], { arrangement: '既存 audio.js「game」（本編の クイックモードと 同じ）' });
  adopt('終盤の 逆転', ['var-card-late']);
  adopt('敗北・引き分け', ['jingle-card-lose']);
  adopt('パズル', ['poyo-2'], { arrangement: '「みんなでかえろう」（なおぽよ。の 別案。3拍子）' });
  adopt('ボード・テーブル', ['board-b'], { arrangement: '新曲「きしとおしろ」' });
  adopt('スポーツ', ['game-2'], { arrangement: '「ぴょこぴょこステップ」（ミニゲーム汎用の 別案）' });
  adopt('釣り', ['fishing-a'], { arrangement: '新曲「みずべのうたたね」' });
  adopt('レース・シューティング', ['bgm-race'], { arrangement: '既存 audio.js「race」（そのまま）' });
  adopt('クイックゲーム', ['bgm-game'], { arrangement: '既存 audio.js「game」（そのまま）' });
  const ach = row('図鑑・実績の 達成');
  Object.assign(ach, { scene: '図鑑・実績の 達成（お知らせ）', songs: ['jingle-achieve'], status: '採用', arrangement: 'ジングル「やったね」（8秒）' });
  TABLE.splice(TABLE.indexOf(ach) + 1, 0, R({ game: 'ホーム', scene: 'GAME CLEAR 画面（図鑑・すべての 実績）に とどまる 間', songs: ['jingle-achieve', 'event-1'], status: '採用', arrangement: 'クリア表示で「やったね」（8秒）→ 画面に とどまる 間は「おめでとうのひ」を ループ', start: 'クリア表示', stop: '画面を 閉じる', notes: '一生の クリアは お別れの 曲（farewell）' }));
  const hatch = row('たまごが かえる');
  Object.assign(hatch, { scene: 'たまごが かえる しゅんかん', songs: [], status: '採用（BGM は 変えず 効果音だけ）', arrangement: 'ジングルなし。既存の 効果音「hatch」（ポンッ＋ド・ソ・ド の 上がる 3音、約 0.5秒）が もう 鳴っている ので、それを そのまま 使う', start: 'かえる 演出の 開始（2.8秒の 演出）', stop: '—', loop: '—', volume: '効果音は いまの まま。ホーム曲は 下げない', fade: 'なし', sfx: 'hatch（いまの ゲームでも hatchEgg() で 鳴っている）。もっと 派手に したい 場合は、効果音を 変えない 約束が とける あとで 新しい 効果音を 作る', notes: '短い 演出なので 曲は 鳴らさない（2026-11-09 本人の 判断）。おはようのひかり は 採用曲の まま 保存し、配置は なし' });
  TABLE.splice(TABLE.indexOf(hatch) + 1, 0, R({ game: 'ホーム', scene: '誕生日（年齢が 上がる お知らせ）', songs: [], status: '採用（BGM は 変えず 効果音だけ）', arrangement: 'ジングルなし。既存の 効果音「ピコン」（audio.js の notify、約 0.3秒）を 鳴らす', start: 'お知らせ 表示（1.2秒）', stop: '—', loop: '—', volume: '効果音は いまの まま。ホーム曲は 下げない', fade: 'なし', sfx: 'notify（ピコン）。いまの 誕生日の お知らせは 音が 鳴らない ので、実装時に 1行 足す', notes: '遊んだ 60秒ごとに 1さい 上がる ため、毎回 音楽を 鳴らすと うるさい。ホーム曲を 止めない（2026-11-09 本人の 判断）' }));
  Object.assign(row('飛行・海'), { songs: ['var-flight'], status: '採用', arrangement: '「そらとうみのさんぽ」テンポ 120 版（本人メモ「煌びやかに、もう少しテンポ早くして」）。きらめきは 編曲で ベル・グロッケン・ハープを 足す' });
  adopt('勝利', ['var-card-win']);
  adopt('第1章クリア', ['var-poyo-chapter']);
  adopt('人生アルバム', ['var-koro-album']);
  adopt('でんせつの であい', ['kisetsu'], { arrangement: '「きせつのきおく」（原曲）', loop: 'なし（映画の 長さで フェード）' });

  const api = { SONGS, STATUS: ST, STATUS_LABEL, ADOPTED, USES, TABLE, DECISIONS, flatten: C.flatten, solfege: C.solfege };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_V3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
