# PR #382 — 自由生活と3D表情の実イベント統合

2026-10-16。ユーザー承認: PR #382の変更・commit・push。mainへのマージは禁止。Draft/openを維持。iPhone Human QA未完了、視覚品質の最終完成判定なし。

## 正本と統合範囲

- 開始時remote main HEAD: `2cf0570ab801d389c42af560d323ff643c69a220`
- main tree: `33c851c361c524e509a0ed8cd80a058d2566ae3d`
- 開始時PR #382 HEAD: `6a56ce9ecba6b5c17ee898b2b98808d51b8ab8b9`
- PR #382 tree: `e239bfe7771a70793c03440a22f821e0bd5633d2`
- PR #389のマージ済み12表情と#382の既存自由生活/任意同行を再利用。mergeでmainを取り込み、両parentを保持。rebase/force-pushなし。
- index.html / meguru.js / script.js / package.json / protected-source fixtureの競合を両側の追加内容を保持して解決。
- 最終HEAD/treeはこのファイルの自己参照を避け、PR本文・会話記録に記載する。

## 共通契約と実イベント

`meguruMod.socialSession` (AI側) → `expressionEvents.subscribe` (表示側)。version 1、セッション有効秒`at`、actorKey/context/regionId/reasonを維持。任意の`targetKey`を追加。現在の対プレイヤーイベントは`player`。対象座標をイベントに固定せず、表示中のviewから現在位置を解決する。ターゲット不在/非有限座標では向き演出なし。未知actorや古い地域のイベントは持ち越さない。表示に登録済みのactorへ配送する契約は継続。

| 実イベント/操作 | 表示 |
|---|---|
| reunion / greeting | positive＋短い挨拶、相手方向を見る |
| affection_interaction | positive＋挨拶、既存の短い接近AIはそのまま |
| visit (Home) | 既存2D Relationship Expressionのpositiveと短い既存反応。Homeに新しい3D世界は作らない |
| プレイヤーの明示会話 | 既存talk判定を使用し、通常会話をgreeting/reunionへ。同行中も配送。連続会話のdislikeを保護 |
| accompany_start:walk/adventure | 現在の生活/関係性表情を維持し、相手への挨拶 |
| accompany_start:date | 開始時positive＋相手への挨拶。既存デート報酬/関係値処理は不変 |
| accompany_end | positiveの短い別れ。直後のreturn_to_free_lifeと二重発火しない |
| return_to_free_life | 同時刻の別れ以外は解除。region_change/exit/relationship_changedは即解除 |

- 身体は停止時最大約60度、歩行時最大約20度の表示補正。頭は残りの角度を最大約26度補正。actorのheading/位置/経路は書き換えない。
- 相手方向を見る期間は最大2.5秒、入り/戻りをなめらかにする。短いgreet動作は既存0.9秒、4秒の動作間隔を再利用。表情は既存world10秒/Home2.5秒。
- 毎frameで現在の生活状態・親密度を再評価。睡眠/critical/dislike優先。演出終了後はnormal固定ではなく、現在の状態へ戻る。
- Homeの自発反応は育成/関係回復の反応managerと分離。非表示・訪問終了時は専用タイマーも取り消し、古いcallbackで再描画しない。
- reduced-motionは追加の身体回転・頭の追従・挨拶動作を抑制し、表情は維持。
- 住人同士の既存AI会話の向き合い/生活動作は維持。今回の新しい意味イベントは既存#382の対プレイヤー交流経路と明示会話に接続した。住人同士の全AI行動を新イベントへ置換していない。

## 保護対象

293体のモデル定義/geometry/rig/成長段階、12表情パラメータ、World geometry、Motion System v2、save/schema、ゲーム報酬・親密度更新に追加変更なし。Character runtime/animateの差分は表示上の方向補正と依存キャッシュ更新のみ。meguru-3dはキャッシュ更新用の説明コメントのみで描画ロジック不変。自由生活の頻度・上限・同行時間・生活AIを再設計していない。テストの多人数fixtureを継承。

## 今回の検証

- 統合専用7件: 実session→表示、デート開始/別れ、同一actor移管、現在値への復帰、3D方向とreduced-motion、Home訪問/背景解除、明示会話/同行中会話、連続会話dislike、対象消失。
- 専用7件＋既存自由生活runtime10件: **17 PASS / 0 FAIL** (`focused.log`)。
- 最終キャッシュ更新後の専用7件＋asset version2件: **9 PASS / 0 FAIL** (`cache-and-social.log`)。
- 初回全体コマンド: Home訪問表情の2.5秒後の再描画で有効時間が進むため、旧「時計不変」assertが1件失敗。実際に自発予算は消費されずイベント0件。期待値を2.5秒の表示時間として更新。初回ログは`full-suite-first-attempt.log`に保存し成功扱いしない。
- 全体コマンド `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" npm test`: **3,265 PASS / 0 FAIL、exit 0**。内訳: 専用/自由生活24、主回帰3,161、末尾Relationship群80。smoke/dialogue/visual QA scriptも成功。`full-suite.log`。保存済みの旧3,241件とは別の今回の実行結果。
- この全体実行後の変更は、下記のブラウザテスト用在席fixture・QA補助ツール・記録のみ。本番コードの追加変更なし。
- 最終runtime依存更新後の12表情/2D保護/Relationship Expression: **101 PASS / 0 FAIL** (`protection.log`)。
- 実シミュレーションの自発reunion/greeting/affection_interactionから表示bridgeまで: **3経路成功** (`producer-events.json`)。イベントを直接注入せず、近接住人と有効時間をQA fixtureとして設定してstepを実行。
- 旧#382のGitHub Home layout失敗(run `38566378418`)を調査し、small-full/small-large-textの全員常駐前提による`undefined.x`をローカルで再現。`tests/helpers/home-cast-fixture.cjs`でテスト専用の全員在席を明示し、既存の幾何/話者assertは維持。修正後の既存focused Home会話4ケースはChromiumで全成功 (`home-layout-before.log` / `home-layout-after.log`)。本番の訪問者のみ表示は変更せず、実UI8ケースと専用テストで別途検証。
- 独立コードレビュー: 同行中会話のイベント欠落、Home廃棄timerの2件を修正。再レビューで両方解消、追加重大指摘なし。

## 今回の画像/ブラウザQA

Chromium Headless Shell 131 / software WebGL。iPhone/Safari実機の代替ではない。

- `gallery/browser.json`: **293体 / 3,516表情適用**、pageerror 0。代表11形態×6状態＝66枚を再撮影。`gallery-sheet.png`を目視確認。モデル消失なし。魚・黒い小顔は通常距離での識別性を実機へ残す。
- `direction-browser.json`: 代表7モデル×通常/挨拶/別れ/終了後/reduced-motion。実際のsessionとpresenterを使う決定的fixture。5枚を保存。actor heading不変、復帰後lonely、reduced追加首振り0をassert。pageerror 0。
- `mobile/browser.json`: 実UIの同行開始→解散→Home。375×667 / 390×844 / 430×932 / 844×390、3D、通常motion。4/4成功、overflow 0、pageerror 0、操作領域44px以上。
- `fallback/browser.json`: 同じ4サイズを明示2D＋reduced-motionで実行。4/4成功、overflow 0、pageerror 0。
- 通常Chromiumはこの実行環境のsocket制約で起動不可。利用可能なHeadless Shellで上記を完了。方向fixtureの初回はgallery画面の継続更新と競合したため、独立した空のQAページに修正して再実行しpageerror 0。

## 引き継ぎとiPhone Human QA

- PR #382はDraft/open/未マージのまま。main公開サイトの配信更新は今回の対象外。
- iPhone Safariで、再会→会話→任意同行/デート→別れ→各自の生活への復帰を通して確認する。
- 首/身体の回転幅・速度・歩きながら相手を見る自然さ。魚/植物/黒い小顔、カメラ旋回、狭路、遮蔽で確認。
- 29↔30、positive終了直前の状態変化、睡眠/critical/連続会話の優先順位。
- アプリ背景化→復帰、地域移動、関係解除、訪問中のメニュー、2D fallback、WebGL context復帰、Reduce Motion。
- 2体同行と多人数住人、縦横回転・safe area、30〜60分利用時のFPS/メモリ/発熱/電池。
- 既存#382の出会い/誘い頻度は控えめな設定を維持。体感調整は別判断。新モデル、新AI、大規模表情再設計は行っていない。
