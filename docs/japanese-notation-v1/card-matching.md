# 本編とカードの名称照合（main 9539e462）

459枚を現行のエンジンが読む full-catalog.mjs に固定し、種類別の出典IDと正式表示名を比較した。カード面のたまごはコレクション専用の状態表示（special-egg）で459枚の外。旧452枚の監査・過去の設計書・固定hashは現行の表示名マスターの代用にしない。

## 結果

メイン248・なかま26・こいびと18・あいてむ26・地域のセカイ13は全件一致。あそび100のうち90一致・10相違。以上で421一致。残る38枚は、あそび10、意図的な作者表記1、題材が交代した旧伝説5、本編の処理・台詞を題材にしたカード12、承認済みのカード固有名で本編の処理を題材にしたもの3、承認済みのカード固有7。合計459、同一カードIDの重複0。

## あそび10枚の表記差

本編一覧・記録が参照する script.js MINIGAME_INFO とカード名の相違。games.js の mg(id, …) と設計時の stable ID 対応でも同じ遊びであることを確認した。初回操作ガイド・プレイ中のタイトル・ランダムテーマはそれぞれ別の用途を持つ。たとえば pingpong-3d は一覧「卓球3D」、プレイ開始「3D卓球!ラリーで相手をぬけ」、カード「ピンポンラリー」。

|カードID|CARD GAME名|本編一覧名|本編|カード|
|---|---|---|---|---|
|G-dragDecorate-cake|ケーキのかざりつけ|ケーキデコレーション|script.js:16220|prototypes/card-game/full-catalog.mjs:882|
|G-fp-dungeon|たからさがしダンジョン|ダンジョン3D|script.js:16224|prototypes/card-game/full-catalog.mjs:937|
|G-haunted-house-3d|おばけやしき|おばけやしき3D|script.js:16228|prototypes/card-game/full-catalog.mjs:1025|
|G-p3-drive|ハイウェイドライブ|ハイウェイ3D|script.js:16223|prototypes/card-game/full-catalog.mjs:1168|
|G-p3-space|うちゅうフライト|うちゅうフライト3D|script.js:16222|prototypes/card-game/full-catalog.mjs:1179|
|G-pingpong-3d|ピンポンラリー|卓球3D|script.js:16236|prototypes/card-game/full-catalog.mjs:1212|
|G-race-3d|ゴールをめざして|カーレース3D|script.js:16229|prototypes/card-game/full-catalog.mjs:1267|
|G-road-themed|よけてキャッチ|ロードラン|script.js:16214|prototypes/card-game/full-catalog.mjs:1366|
|G-stack-themed|つみかさねタワー|つみあげタワー|script.js:16215|prototypes/card-game/full-catalog.mjs:1520|
|G-tilt-maze-3d|たまころがしめいろ|たまころがし迷路|script.js:16231|prototypes/card-game/full-catalog.mjs:1619|
## 作者と旧伝説

|カードID|CARD GAME名|本編の現在表示|根拠|
|---|---|---|---|
|E-boss|謝りにきた大王イカ|むかしのぼく|script.js:10199|
|E-gate|そらにうかぶとりい|むこうのまど|script.js:10189|
|E-lamp|よなかのあかり|100のむこう|script.js:10204|
|E-mirror|としをとったじぶん|みているひと|script.js:10209|
|E-naoto|なおと|ナオト|character-world-master.v1.js:87|
|E-stairs|どこにもつながらない階段|たまごのないところ|script.js:10194|
E-naoto は非プレイアブルの同一人物。設計91でカード上の「なおと」を明記。現在の本編はマスターラベルに加え「ナオトにはなしかける」ボタンがある（script.js:13998）。作者のアイテム名「なおとの〜」の4点はカード・本編双方一致。作者の個人名を機械的に置換するとこれらの別項目も巻き込む。
5伝説は旧マスターの label とカードが一致し、出典IDは保たれる。ただし script.js:10187 の LEGEND_ENCOUNTERS では物語が交代している。現行ムービーの場所見出し（10238）、登場者の声「むこうの声」「だれか」（10249）、人生ログ（10272）は用途が違う。カードに現行見出しを一括転記すると旧題材の絵・本文と矛盾する。#571はstairs/bossの旧メタデータのみ対象。docs/content-provenance-20261021/SUPPORT-ORIGINS.md:20 と docs/card-game/kanji-names-v17-20261119.md:14 に区別を記載。
## 進化名・種族名・個体表記
本編は character-world-master.v1.js の31種×8段階を script.js:453 の installMasterSpecies で使用。プロフィールの種族名は script.js:499。カード face.mjs:6 では form が表面見出し、labels.mjs:6 では種族名を補助表示。全248枚で form==対応段階名、正式カード名 name==種族ラベル＋丸数字を個別に検証。例 M-starfish-06 は正式カード名「ヒトデ⑥」、見出しと本編の段階名はともに「若いヒトデ」。
本編ではメスになったカクレクマノミの⑥と⑦に、個体状態に応じた表示「卵を見守るメス」「群れを見守るメス」がある（script.js:12512）。標準段階名「卵を守るオス」「メスへ変わる途中」はカードと現行図鑑マスターで一致。表情プレビューツールだけに現れる人間12段階の補助表記「（男）」「（女）」も本編の正式名とは別（tools/expression-stage-names.json、tools/cat-expression-preview.cjs:104）。
## カード固有見出し・本編に独立した同名マスターがない出来事
出来事の出典は docs/card-game/data/event-source-20260917.json と設計91、記載された処理は現行 script.js で確認。特に中年イベントの本編定義は独立した title を持たず、年齢・solo/pair・効果を持つ。例 E-midlife-album「昔のアルバム」は56歳の場面でソロ「昔のアルバムを開いた。笑っている自分がいた」、恋人同行「昔のアルバムをふたりで開いた。笑っている自分たちがいた」。会話文とカード表題の全文一致は求めない。

|カードID|カード名|区分|本編出典・意味|
|---|---|---|---|
|E-big-illness|大きな病気|カード固有（本編題材）|SICKNESS_TYPES（script.js:71）|
|E-fateful-transform|運命の変身|カード固有（本編題材）|offerTransformIfReady / rerollIdentityAndBreakupIfNeeded（script.js:11600）|
|E-final-time|さいごのじかん|関連|enterFarewell / GOAL_AGE（script.js:10904）|
|E-first-date|はじめてのデート|関連|datesThisLife === 1 / rememberSpecialDate（script.js:10164）|
|E-hayajimai|早じまい|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:36）|
|E-midlife-50th|50さいのお祝い|関連|MIDLIFE_EVENTS / age: 50（script.js:10695）|
|E-midlife-album|昔のアルバム|関連|MIDLIFE_EVENTS / age: 56（script.js:10696）|
|E-midlife-flower|庭に小さな花を植えた|関連|MIDLIFE_EVENTS / age: 62（script.js:10697）|
|E-midlife-hobby|趣味を見つけた|関連|MIDLIFE_EVENTS / age: 44（script.js:10694）|
|E-midlife-travel-plan|小さな旅の計画|関連|MIDLIFE_EVENTS / age: 66（script.js:10698）|
|E-misunderstanding|すれちがい|関連|recheckRelationship / MISMATCH_REPAIR_NEEDED（script.js:7741）|
|E-nagaiki|長生きの秘訣|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:40）|
|E-new-encounter|あたらしいであい|関連|PARTNER_FIRST_ENCOUNTERS / playFirstPartnerEncounter（script.js:18774）|
|E-omoide-photo|思い出の写真|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:44）|
|E-reconciliation|なかなおり|関連|courtBtn / MISMATCH_REPAIR_NEEDED（script.js:18795）|
|E-special-trip-memory|特別な旅の思い出|カード固有（本編題材）|travelToRegion / firstVisit / specialRegionsVisited（script.js:19184）|
|E-sudden-trip|とつぜんのたび|関連|travelToRegion / state.regionId / firstVisit（script.js:19120）|
|E-wedding-anniversary|けっこんきねんび|関連|MARRIAGE_MILESTONES / checkMarriageMilestones（script.js:10069）|
|W-time-ix|時のカード IX|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:18）|
|W-time-x|時のカード X|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:22）|
|W-time-xi|時のカード XI|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:26）|
|W-time-xii|時のカード XII|カード固有|カード設計482（docs/card-game/482-time-reversal-cards.md:30）|
## 承認・生成・検索・保存への影響
1. #564の19件は tools/evolution-display-names-v13-20261119.json が表示名・旧検索名の正本。31種の本編マスター・表情用の該当19・カード form が一致。種族＋段階のカード正式名 name は別。固定した設計本文・source hash と current form の名が違っても、歴史資料の一括変更は行わない。
2. #571の11件は tools/kanji-display-names-v17-20261119.json の cards。6件 shared、3件 card-only、2件 legacy-metadata-only。E-special-trip-memory はカード固有名で、効果中に特殊地域名「星空の停留所」「記憶の湖」を持つ。単語を一律に変えると能力中の参照や歴史資料も変わる。
3. #573の7枚は tools/card459-adoption-v18-20261120.json。4枚はセカイ型の対戦用の時のカード、3枚は逆転カード。旧11件の設定中にある deferredCards 3件はこの7枚に含まれ、別の3件として足さない。旧名・ローマ数字はIDに対する検索別名。
4. 調査スクリプトは本番の collectionCards／filterCards／cardMarkup を読み、承認37IDの現行名のカード面描画と旧名検索がコレクション・デッキ編集両方で同じIDを返すことを照合した。collection.mjs:9 と my-decks.mjs:48 は name/form/searchAliases/id/text を検索。戦績のカード検索 records-ui.mjs:20 は name/id のみで、form・旧名検索とは動作が異なる。
5. engine.mjs:34 の操作文・公開ログは name、カード表面は form 優先。name の改名はゲームログ・ルールブック例・能力中の自他名・CPU/戦績UIにも横断確認が要る。デッキの上限や支持IDは my-decks.mjs:10、保存と復元は engine.mjs:240 の version/seed/decks/commands、戦績はデッキID・カードIDと作成時のデッキ名を保存。旧人生ログ・恋人snapshot・デッキ名を現行表示文字列で上書きしない。
6. 既存検査には evolution-names.test.mjs（19名・旧リプレイ）、kanji-names.test.mjs（11件＋別名・参照地域・旧ログ）、card459-catalog.test.mjs（追加7と既存452の不変）、card-name-display.test.mjs と collection.test.mjs がある。今回の18個の表示・コレクション既存テストは18成功。459行の独立照合＋37件の実表示・検索検査を実施。本番端末の画面収まり・全テストはこの比較では未実施。将来承認された別表記を導入する際は変更前セーブの復元、カード名の枠／改行、デッキ・戦績の検索範囲も個別確認する。
