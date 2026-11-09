// BGM 配置 VERSION 2 — 調査部分（tools/build-inventory.cjs が 生成。手で 編集しない）
(function (root) {
  'use strict';
  const api = {
 "REGION_COUNT": 13,
 "REGION_LABELS": "おうち・とかい・いなか・もり・やま・ゆきぐに・うみ・しんかい・みずべ・ジャングル・さばく・ほしぞらのていりゅうじょ・きおくのみずうみ",
 "REGIONS": [
  {
   "id": "home",
   "label": "おうち",
   "kind": "base (拠点)"
  },
  {
   "id": "city",
   "label": "とかい",
   "kind": "normal"
  },
  {
   "id": "countryside",
   "label": "いなか",
   "kind": "normal"
  },
  {
   "id": "forest",
   "label": "もり",
   "kind": "normal"
  },
  {
   "id": "mountain",
   "label": "やま",
   "kind": "normal"
  },
  {
   "id": "snow",
   "label": "ゆきぐに",
   "kind": "normal"
  },
  {
   "id": "sea",
   "label": "うみ",
   "kind": "normal"
  },
  {
   "id": "deepsea",
   "label": "しんかい",
   "kind": "normal"
  },
  {
   "id": "river_lake",
   "label": "みずべ",
   "kind": "normal"
  },
  {
   "id": "jungle",
   "label": "ジャングル",
   "kind": "normal"
  },
  {
   "id": "desert",
   "label": "さばく",
   "kind": "normal"
  },
  {
   "id": "star_stop",
   "label": "ほしぞらのていりゅうじょ",
   "kind": "special (SPECIAL_REGIONS, unlocked at そだち70「たびだち」)"
  },
  {
   "id": "memory_lake",
   "label": "きおくのみずうみ",
   "kind": "special (SPECIAL_REGIONS, unlocked at そだち70)"
  }
 ],
 "DAYPARTS": {
  "exists": true,
  "ids": [
   "morning",
   "day",
   "evening",
   "night"
  ],
  "labels_ja": {
   "morning": "あさ",
   "day": "ひる",
   "evening": "ゆう",
   "night": "よる"
  },
  "labels_source": "script.js:14734 TIME_CHOICES = {auto:げんざい, morning:あさ, day:ひる, evening:ゆう, night:よる}",
  "decision": "currentEnvironment time = NaotocchiEnvironment.timeOfDay(state.lifetime.timeMode) (script.js:14820-14821, 15468-15469). timeMode defaults to 'auto' (script.js:1566); the player can force a daypart in the せかい screen (timeModeGrid, script.js:19013-19015).",
  "auto_hour_boundaries_local_device_clock": {
   "morning": "05:00-09:59 (hour 5..9)",
   "day": "10:00-15:59 (hour 10..15)",
   "evening": "16:00-18:59 (hour 16..18)",
   "night": "19:00-04:59 (all other hours)",
   "source": "world-environment.js:13-20 timeOfDay()"
  },
  "home_render": "home-production-world.mjs:16 calls dayparts.select(e.region, e.time) to crossfade the background image (home-dayparts.mjs createDayparts, presentation only).",
  "other_effects": "Daypart also changes meguru.js lighting (e.g. meguru.js:646, 4860, 5430) and env modifiers (script.js:14737 comment: weather/time/season/region status modifiers)."
 },
 "MINIGAME_ROWS": [
  {
   "id": "mg-action",
   "scene": "32本: ロードラン・つみあげタワー・ゆきだるまタワー・クレーンゲーム・ピンボール・ブロックくずし・かくとうバトル・スカイシューター・ジャンプクエスト・スネーク・カタパルト・かえるのおうちがえり・タンクバトル・ボンバー・フルーツ斬り・かいてんずし・アステロイド・ぴょんぴょんジャンプ・ジェンガ・ハーフパイプ・ドミノたおし・ドットイーター・ミサイルコマンド・じんとり・たこやきやさん・とかいラン・しゅうかくタワー・きのみタワー・ジャングルラン・さばくラン・さくらタワー・おちばタワー",
   "minigames": 32,
   "gameIds": [
    "road-themed",
    "stack-themed",
    "stack-snowman",
    "crane-game-3d",
    "pinball-physics",
    "breakout-classic",
    "street-fight",
    "sky-shooter",
    "jump-quest",
    "snake-classic",
    "catapult-castle",
    "frogger-road",
    "tank-battle",
    "bomber-maze",
    "fruit-slice",
    "sushi-belt",
    "asteroids-classic",
    "doodle-jump",
    "jenga-tower",
    "halfpipe-skate",
    "domino-run",
    "dot-eater",
    "missile-command",
    "area-claim",
    "takoyaki-grill",
    "road-city",
    "stack-harvest",
    "stack-acorn",
    "road-jungle",
    "road-desert",
    "stack-sakura",
    "stack-leaves"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "confirm": true,
   "area": "ミニゲーム アクション",
   "current": "game（未確定）",
   "candidates": [
    "game-1",
    "game-2"
   ],
   "keepExisting": "既存 game は 不採用では ない（クイックモードで 残すかを 比較）",
   "reuse": "—",
   "needNew": "不要",
   "length": "ゲーム中 ループ（1回 30〜90秒）。新曲は 16小節（約 27〜30秒）",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら 速い アクション＝あそびのはじまり、間の ある ゲーム＝ぴょこぴょこステップ"
  },
  {
   "id": "mg-strategy",
   "scene": "2本: タワーディフェンス・ローグライク",
   "minigames": 2,
   "gameIds": [
    "tower-defense",
    "roguelike-dungeon"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "confirm": true,
   "area": "ミニゲーム ストラテジー",
   "current": "game（未確定）",
   "candidates": [
    "game-1",
    "game-2"
   ],
   "keepExisting": "同上",
   "reuse": "ミニゲーム汎用の 採用曲",
   "needNew": "不要",
   "length": "ゲーム中 ループ（数分）",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）（ミニゲーム汎用と 同じ 曲）"
  },
  {
   "id": "mg-puzzle",
   "scene": "17本: ブロックパズル・ケーキデコレーション・おべんとうづくり・れんさパズル・そうこばん・マインスイーパー・バブルシューター・2048・フルーツマッチ3・ピクロス・パイプつなぎ・ライツアウト・せんなぞり・しんけいすいじゃく・ナンプレ・ヒット&ブロー・スライドパズル",
   "minigames": 17,
   "gameIds": [
    "falling-block-puzzle",
    "dragDecorate-cake",
    "dragDecorate-bento",
    "chain-puzzle",
    "push-puzzle",
    "minesweeper-8",
    "bubble-shooter",
    "puzzle-2048",
    "match-3",
    "picross-5",
    "pipe-connect",
    "lights-out",
    "line-trace",
    "memory-cards",
    "sudoku-mini",
    "hit-blow",
    "slide-puzzle"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "area": "ミニゲーム パズル",
   "current": "puzzle（不採用）",
   "candidates": [
    "poyo-1",
    "card-1"
   ],
   "keepExisting": "不可（不採用。統合までは 保護）",
   "reuse": "なおぽよ。の 採用曲の 流用（独立ゲームの 個性が うすれる 点に 注意）",
   "needNew": "流用しない なら 追加作曲（E に 変わる）",
   "length": "ゲーム中 ループ（数分）",
   "status": "未確定（流用するか 判断が 必要）"
  },
  {
   "id": "mg-board",
   "scene": "12本: オセロ・ビリヤード・どうぶつしょうぎ・コネクトフォー・五目ならべ・ブラックジャック・ヨット・チェッカー・マンカラ・ソリティア・上海・すごろく",
   "minigames": 12,
   "gameIds": [
    "reversi-6",
    "billiards-6",
    "animal-shogi",
    "connect-four",
    "gomoku-9",
    "blackjack-21",
    "yacht-dice",
    "checkers-6",
    "mancala-kalah",
    "solitaire-klondike",
    "shanghai-tiles",
    "sugoroku-race"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "area": "ミニゲーム ボード・テーブル",
   "current": "puzzle（不採用）",
   "candidates": [
    "card-1",
    "poyo-1"
   ],
   "keepExisting": "不可（不採用。統合までは 保護）",
   "reuse": "CARD GAME の 採用曲の 流用（同上の 注意）",
   "needNew": "流用しない なら 追加作曲（E に 変わる）",
   "length": "ゲーム中 ループ（数分）",
   "status": "未確定（流用するか 判断が 必要）"
  },
  {
   "id": "mg-sports",
   "scene": "17本: ボウリング・アーチェリー・ミニゴルフ・バスケ3D・卓球3D・フリーキック・やきゅう・スキージャンプ・エアホッケー・テニス・ダーツ・りくじょう・カーリング・ビーチバレー・やまの岩場のぼり・ゆきのゲレンデ・ふゆのカーリング大会",
   "minigames": 17,
   "gameIds": [
    "bowling-3d",
    "archery-3d",
    "mini-golf-physics",
    "basketball-3d",
    "pingpong-3d",
    "free-kick-3d",
    "baseball-batting",
    "ski-jump",
    "air-hockey",
    "tennis-rally",
    "darts-board",
    "track-field",
    "curling-ice",
    "beach-volley",
    "downhill-mountain",
    "downhill-snow",
    "curling-winter"
   ],
   "timeOfDay": "不要",
   "cls": "E",
   "area": "ミニゲーム スポーツ",
   "current": "sports（不採用）",
   "candidates": [
    "sports-1",
    "sports-2"
   ],
   "keepExisting": "不可（不採用。統合までは 保護）",
   "reuse": "ミニゲーム汎用の 採用曲も 候補に できる",
   "needNew": "必要 → 追加作曲 2案（はれのひグラウンド・かぜをきって）の 評価待ち",
   "length": "ゲーム中 ループ（30〜90秒）",
   "status": "不足 → 追加作曲済み、評価待ち"
  },
  {
   "id": "mg-fishing",
   "scene": "4本: ほんかくさかなつり・うみのさかなつり・しんかいフィッシング・みずべのさかなつり",
   "minigames": 4,
   "gameIds": [
    "real-fishing",
    "fishing-sea",
    "fishing-deepsea",
    "fishing-river"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "area": "ミニゲーム 釣り",
   "current": "sports（不採用）",
   "candidates": [
    "explore-2",
    "sports-2"
   ],
   "keepExisting": "不可（不採用。統合までは 保護）",
   "reuse": "3D の「そらとうみのさんぽ」が 採用なら その 流用",
   "needNew": "不要（流用候補あり）",
   "length": "待つ 時間が 長い。ゆっくり ループ",
   "status": "未確定"
  },
  {
   "id": "mg-race",
   "scene": "5本: ハイウェイ3D・カーレース3D・リズムハイウェイ・スペースガンナー・グランプリ",
   "minigames": 5,
   "gameIds": [
    "p3-drive",
    "race-3d",
    "rhythm-highway-3d",
    "space-gunner-3d",
    "grand-prix-3d"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "area": "ミニゲーム 3D レース・シューティング",
   "current": "race（未確定）",
   "candidates": [
    "bgm-race",
    "game-1",
    "game-2"
   ],
   "keepExisting": "未確定（疾走感は 合う）",
   "reuse": "ミニゲーム汎用の 採用曲",
   "needNew": "不要",
   "length": "ゲーム中 ループ。いまの race は 1周 13秒",
   "status": "未確定（既存 race を 残すか）"
  },
  {
   "id": "mg-explore",
   "scene": "4本: おばけやしき3D・ダンジョン3D・たまころがし迷路・ボクセルマイニング",
   "minigames": 4,
   "gameIds": [
    "haunted-house-3d",
    "fp-dungeon",
    "tilt-maze-3d",
    "voxel-mine"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "confirm": true,
   "area": "ミニゲーム 3D 探検",
   "current": "race（未確定。探検には 速すぎる）",
   "candidates": [
    "explore-1",
    "explore-2"
   ],
   "keepExisting": "既存 race は レースで 比較",
   "reuse": "—",
   "needNew": "不要",
   "length": "ゲーム中 ループ",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら ここは ふしぎのちか"
  },
  {
   "id": "mg-flight",
   "scene": "7本: うちゅうフライト3D・リングフライト3D・サブマリン3D・ハンググライダー3D・ひこうき着陸・ルナランダー・なつのうみフライト",
   "minigames": 7,
   "gameIds": [
    "p3-space",
    "ring-flight-3d",
    "submarine-3d",
    "hang-glider-3d",
    "plane-landing",
    "lunar-lander",
    "ring-flight-summer"
   ],
   "timeOfDay": "不要",
   "cls": "D",
   "confirm": true,
   "area": "ミニゲーム 3D 飛行・海",
   "current": "race（未確定。飛行には 速すぎる）",
   "candidates": [
    "explore-2",
    "explore-1"
   ],
   "keepExisting": "既存 race は レースで 比較",
   "reuse": "—",
   "needNew": "不要",
   "length": "ゲーム中 ループ",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら ここは そらとうみのさんぽ"
  }
 ],
 "INDEPENDENT_ROWS": [
  {
   "id": "naopoyo-ch1",
   "cls": "D",
   "area": "なおぽよ。（公開入口）",
   "scene": "時の手 第1章「地下牢」10ステージ（1〜3 牢屋・4〜6 苔・7〜9 冷たい広間・10 夜明けの光）、ステージ選択、おてほん、説明",
   "current": "なし（音そのものが ない）",
   "candidates": [
    "poyo-1",
    "poyo-2"
   ],
   "keepExisting": "—（既存曲なし）",
   "reuse": "—",
   "needNew": "不要",
   "length": "ゲーム中（ステージを 遊ぶ 間）ループ（1ステージ 数分）",
   "timeOfDay": "不要（地下・ステージの 雰囲気で）",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら 遊ぶ 間＝ぽよぽよこもれび、選択・クリア・森＝みんなでかえろう",
   "confirm": true
  },
  {
   "id": "naopoyo-clear",
   "cls": "D",
   "area": "なおぽよ。",
   "scene": "ステージクリア「みんな、おかえり。」・第1章クリア",
   "current": "なし",
   "candidates": [
    "poyo-1",
    "poyo-2"
   ],
   "keepExisting": "—",
   "reuse": "—",
   "needNew": "不要",
   "length": "数秒の ジングル",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。決まった 曲の 動機を 短い ジングルに",
   "confirm": true
  },
  {
   "id": "naopoyo-old",
   "cls": "D",
   "area": "なおぽよ。（旧ページ・URL で 公開中）",
   "scene": "chapter1「ひかりの牢屋」10・chapter2「こもれびの森」11〜20・rescue 12（洞窟牢屋・地下洞窟・古城の地下通路）",
   "current": "なし",
   "candidates": [
    "poyo-1",
    "poyo-2"
   ],
   "keepExisting": "—",
   "reuse": "—",
   "needNew": "不要",
   "length": "ゲーム中（ステージを 遊ぶ 間）ループ",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら 遊ぶ 間＝ぽよぽよこもれび、選択・クリア・森＝みんなでかえろう",
   "confirm": true
  },
  {
   "id": "naokoro-title",
   "cls": "D",
   "area": "なおころ。",
   "scene": "タイトル（人数・ラウンド・むずかしさ）・キャラクター選択・ひとやすみ・対戦コード",
   "current": "なし（BGM を コードで オフ）",
   "candidates": [
    "koro-1",
    "koro-2"
   ],
   "keepExisting": "—",
   "reuse": "—",
   "needNew": "不要",
   "length": "メニューの 間 ループ",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら 盤＝ころころじんせい、タイトル・選択＝いつかのゴール",
   "confirm": true
  },
  {
   "id": "naokoro-board",
   "cls": "D",
   "area": "なおころ。",
   "scene": "すごろく盤（48マス: お店・できごと 46種・なかま・こいびと・とき・へんしん・アイテム・数字）",
   "current": "なし（BGM オフ。効果音と 声は 鳴る）",
   "candidates": [
    "koro-1",
    "koro-2"
   ],
   "keepExisting": "—",
   "reuse": "—",
   "needNew": "不要（候補 2曲）",
   "length": "1人生 15ラウンド前後を ループ（数分〜十数分）",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら 盤＝ころころじんせい、タイトル・選択＝いつかのゴール",
   "confirm": true
  },
  {
   "id": "naokoro-minigames",
   "cls": "D",
   "area": "なおころ。",
   "scene": "盤の クイック 4マス（45種）・ゲーム 2マス（通常 15本）",
   "current": "なし（本編と 同じ ミニゲームを 埋めこみ。BGM オフ）",
   "candidates": [
    "game-1",
    "game-2"
   ],
   "keepExisting": "クイック 4マスは 本編の クイックモードの 判断に そろえる",
   "reuse": "本編の ミニゲーム汎用と 同じ 曲",
   "needNew": "不要",
   "length": "1ゲーム 数十秒",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）（本編の ミニゲーム汎用と 同じ）",
   "confirm": true
  },
  {
   "id": "naokoro-result",
   "cls": "D",
   "area": "なおころ。",
   "scene": "結果「こんな人生に、なりました。」（人生アルバム）・過去の アルバム",
   "current": "なし",
   "candidates": [
    "koro-2",
    "kisetsu",
    "event-2"
   ],
   "keepExisting": "—",
   "reuse": "なおころ。の 採用曲（いつかのゴール なら 合う）・きせつのきおく（保留）・ふたりのきねんび（採用）",
   "needNew": "不要",
   "length": "アルバムを 見る 間 ループ",
   "timeOfDay": "不要",
   "status": "未確定"
  },
  {
   "id": "card-menu",
   "cls": "D",
   "area": "CARD GAME",
   "scene": "はじめの メニュー・対戦の 準備・マイデッキ（40枚）・コレクション・戦績・あそびかた・ルールブック・練習の さそい",
   "current": "なし（音そのものが ない）",
   "candidates": [
    "card-1",
    "card-2"
   ],
   "keepExisting": "—",
   "reuse": "—",
   "needNew": "不要",
   "length": "メニューの 間 ループ",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら メニュー・デッキ＝カードをひらいて",
   "confirm": true
  },
  {
   "id": "card-battle",
   "cls": "D",
   "area": "CARD GAME",
   "scene": "対戦（10ラウンド。そだち100 で 早く 終わる ことも）・人生の時計・ふたりで 遊ぶ ときの 受けわたし幕・対戦メニュー",
   "current": "なし",
   "candidates": [
    "card-1",
    "card-2"
   ],
   "keepExisting": "—",
   "reuse": "ふだんは「カードをひらいて」、9〜10ラウンドや そだち100 目前で「デュエル・スタート」に 切りかえる 案（コードに 終盤画面は ない。提案）",
   "needNew": "不要（候補 2曲）",
   "length": "1対戦 数分〜十数分を ループ",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。両方なら ふだん＝カードをひらいて、勝負どころ＝デュエル・スタート",
   "confirm": true
  },
  {
   "id": "card-result",
   "cls": "D",
   "area": "CARD GAME",
   "scene": "結果「A/B の勝利」「引き分け」・対戦中の お知らせ（けっこん・おわかれ・たんじょう・成長）",
   "current": "なし",
   "candidates": [
    "card-1",
    "card-2"
   ],
   "keepExisting": "—",
   "reuse": "採用曲の 動機を 短い ジングルに。お知らせは 効果音で 十分",
   "needNew": "不要",
   "length": "数秒",
   "timeOfDay": "不要",
   "status": "採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）。決まった 曲の 動機を 短い ジングルに",
   "confirm": true
  }
 ]
};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NAOTOCCHI_BGM_INVENTORY = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
