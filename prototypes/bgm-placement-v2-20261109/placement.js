// BGM 配置 VERSION 2 (2026-11-09) — 全場面の BGM 配置表
// 1 いまの BGM / 2 候補 / 3 既存曲を 残せるか / 4 流用 / 5 新曲 / 6 長さ・ループ / 7 時間帯 / 8 状況 と、分類 A〜E・無音。
// ミニゲームの 割当は docs/bgm-survey-20261108/data/minigames.json（本体を 起動して 実測）に もとづく。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const P = isNode ? require('./placement-songs.js') : root.NAOTOCCHI_BGM_PLACEMENT_SONGS;
  const INV = isNode ? require('./inventory.js') : root.NAOTOCCHI_BGM_INVENTORY;

  const HOME4 = ['home-morning', 'home-day', 'home-evening', 'home-night'];
  const LOOP_HOME = '16小節（朝・夕・夜）／8小節（昼）を ループ。時間帯が かわったら 切りかえ';
  const TIME_HOME = '必要（朝 05:00〜09:59・昼 10:00〜15:59・夕 16:00〜18:59・夜 19:00〜04:59）';
  const row = (o) => Object.assign({ candidates: [], reuse: '—', needNew: '不要', keepExisting: '—', timeOfDay: '不要' }, o);

  const SCENES = [
    // ---- ホーム ----
    row({ id: 'home', cls: 'A', area: '2.5D ホーム', scene: `${INV.REGION_COUNT}地域 × 朝昼夕夜（${INV.REGION_LABELS}）`, current: 'home（時間帯・地域で 変わらない）', candidates: HOME4, keepExisting: 'home は 昼「いつものにわ」の 原曲。アレンジA へ 移行予定', reuse: '—', needNew: '不要', length: LOOP_HOME, timeOfDay: TIME_HOME, status: '確定（アレンジA）。地域ごとの 変化は 将来の 編曲で 検討できる' }),
    row({ id: 'menus', cls: 'A', area: '本編の メニュー', scene: 'メニュー・お店・アイテム・図鑑・実績・アルバム・シール・デザイン・データ・せかい設定・旅行・つうしん・うそつきしょうぶ・むげんモード・なおころ。の 案内', current: 'home', candidates: HOME4, keepExisting: '—', reuse: 'ホーム4曲を そのまま 続ける', length: 'ホームの 曲を 止めずに 続ける', timeOfDay: TIME_HOME, status: '確定（ホーム曲の 継続）' }),
    row({ id: 'meguru', cls: 'A', area: 'めぐる（世界を 歩く）', scene: '地域を 歩いて 発見する', current: 'home', candidates: HOME4, reuse: 'ホーム4曲を そのまま', length: LOOP_HOME, timeOfDay: TIME_HOME, status: '確定（ホーム曲）。地域ごとの 編曲は 将来の 検討' }),
    row({ id: 'growth', cls: 'A', area: '成長・変身', scene: '成長（すがたが かわった）・そだちの 上昇・中年の できごと（44〜66さい）・へんしんを 選ぶ 画面・個性の 選択', current: 'home ＋ 効果音（levelup など）', candidates: HOME4, reuse: 'ホーム曲の 上で 既存の 効果音（ジングル）を 鳴らす', length: '一瞬（4.2秒の 演出）〜選ぶ 間。専用 BGM なし', timeOfDay: TIME_HOME, status: '確定（専用 BGM は 不要）' }),
    row({ id: 'companion', cls: 'A', area: '仲間・恋人', scene: '仲間の さそい・恋人に なった（お知らせ）・会話', current: 'home', candidates: HOME4, reuse: 'ホーム曲。恋の 場面の 強調が ほしければ「ふたりのきねんび」を 短く 流す 案', length: '一瞬〜会話の 間。専用 BGM なし', timeOfDay: TIME_HOME, status: '確定（ホーム曲の 継続）' }),
    row({ id: 'wedding', cls: 'A', area: '結婚・記念日', scene: '結婚した（お知らせ）・結婚記念日の 映画（1・10・25・50年目、1場面 4秒）', current: '結婚は home、記念日の 映画は movie（不採用）', candidates: ['event-2'], keepExisting: '記念日の movie は 不採用', reuse: '—', length: '64秒（3拍子 16小節×2）。映画の 長さ（約20〜30秒）で フェード', timeOfDay: '不要', status: '確定（ふたりのきねんび 採用）' }),
    row({ id: 'legend', cls: 'D', area: 'でんせつの であい', scene: '一生に 1度の 伝説の 出会いの 映画', current: 'movie（不採用）', candidates: ['home-evening', 'kisetsu', 'event-2'], keepExisting: '不可（movie は 不採用。統合までは 保護）', reuse: '幻想的な「ほしふるみずうみ」（採用）・「きせつのきおく」（保留）', needNew: '不要（流用候補あり）', length: '映画の 長さ（1場面 3.5秒 × 数場面）', timeOfDay: '不要', status: '未確定' }),
    row({ id: 'birth', cls: 'D', area: '誕生・誕生日・たまご', scene: 'たまご・たまごが かえる（2.8秒の おいわい）・誕生日（1.2秒の お知らせ。遊んだ 60秒ごとに 1さい）', current: 'home ＋ 効果音（hatch など）', candidates: ['event-1', 'ohayo'], keepExisting: '—（専用曲なし）', reuse: '「おはようのひかり」（保留）を たまごの 目ざめに', needNew: '不要（候補 2曲）', length: '66秒／48秒。演出が 短いので、たまごの 間 ずっと 流すか、かえる しゅんかんだけ 短く 鳴らすか を 決める 必要', timeOfDay: '不要', status: '未確定（おめでとうのひ 保留）' }),
    row({ id: 'date', cls: 'C', area: 'デート・映画', scene: 'デートを 選ぶ 画面・デートの 映画（1場面 3.5秒、約20〜30秒）', current: 'movie（不採用）', candidates: ['event-2', 'home-evening'], keepExisting: '不可（movie は 不採用。統合までは 保護）', reuse: '「ふたりのきねんび」（採用済み）を 流用', length: '64秒（3拍子 16小節×2）を ループ', timeOfDay: '不要', status: '流用案を 比較中' }),
    row({ id: 'sleep', cls: 'C', area: '睡眠', scene: 'ペットが 眠っている 間', current: 'night（不採用）', candidates: ['home-night'], keepExisting: '不可（night は 不採用。統合までは 保護）', reuse: '夜「ほしぞらのやくそく」を 静かな 編曲（メロディのみ・オルゴール風・テンポ 少し 遅く）で', length: '51秒（16小節）を ループ。眠る 間 ずっと', timeOfDay: '不要（時刻と 関係なく 眠りの 曲）', status: '流用案（編曲は 採用後に）' }),
    row({ id: 'farewell', cls: 'D', area: 'お別れ', scene: '死亡（てんごく）・100さいの さいごの じかん・一生カード', current: 'farewell（未確定）', candidates: ['bgm-farewell', 'kisetsu', 'home-night'], keepExisting: '未確定（比較して 決める）', reuse: '「きせつのきおく」（保留）・「ほしぞらのやくそく」（採用）', length: '64秒前後を ループ', timeOfDay: '不要', status: '未確定' }),
    row({ id: 'clear', cls: 'D', area: 'ゲームクリア', scene: 'GAME CLEAR（100さいの 一生・図鑑 コンプリート・実績 すべて）', current: '一生クリアは farewell、図鑑・実績クリアは home（同じ クリア画面で 曲が ちがう）', candidates: ['event-1', 'kisetsu', 'bgm-farewell'], keepExisting: '—', reuse: '「おめでとうのひ」（保留）・「きせつのきおく」（保留）', length: '演出の 長さ', timeOfDay: '不要', status: '未確定' }),
    row({ id: 'quick', cls: 'D', area: 'クイックモード', scene: 'クイックゲーム 50種（3〜6秒の 課題が つぎつぎ 続く 1ゲーム）', current: 'game（モード全体で 1曲）', candidates: ['bgm-game', 'game-1', 'game-2'], keepExisting: '未確定（せわしない クイックには 速い 既存 game が 合う 可能性）', reuse: 'ミニゲーム汎用の 採用曲に そろえる 案', length: 'モード全体（数十秒〜数分）を ループ', timeOfDay: '不要', status: '未確定（既存 game を 残すか）', quick: 50 }),
    row({ id: 'mg-result', cls: 'A', area: 'ミニゲームの 結果', scene: '結果の 表示（ゲーム画面を 閉じた あと）', current: 'home / night', candidates: HOME4, reuse: 'ホーム曲に もどる', length: '—', timeOfDay: TIME_HOME, status: '確定（ホーム曲へ もどる）' }),
    // ---- 通常ミニゲーム 100 ----
    ...INV.MINIGAME_ROWS.map(row),
    // ---- 独立ゲーム ----
    ...INV.INDEPENDENT_ROWS.map(row),
    // ---- 無音 ----
    row({ id: 'story', cls: '無音', area: 'ものがたり『微睡みの箱庭』', scene: '読む 画面すべて', current: 'なし', candidates: [], keepExisting: '—', reuse: '—', needNew: '不要（物語用の 曲は 作らない）', length: '—', timeOfDay: '不要', status: '方針どおり 初期は 無音。将来、希望者だけ 静かな BGM を オンに できる しくみは 検討の 余地' }),
    row({ id: 'before-tap', cls: '無音', area: '起動直後', scene: '最初の タップまで', current: 'なし（ブラウザの 決まりで 鳴らせない）', length: '—', status: '技術上 無音（変更 不要）' }),
    row({ id: 'bgm-off', cls: '無音', area: 'BGM オフ設定', scene: 'せかい設定で BGM を オフに した とき', current: 'なし', length: '—', status: '本人の 設定どおり 無音' }),
  ];

  const api = Object.assign({}, P, { SCENES, INV });
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_PLACEMENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
