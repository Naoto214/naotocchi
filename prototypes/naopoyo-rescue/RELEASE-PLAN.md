# 「なおぽよ」レスキュー中心への段階的移行
2026-10-21 / 今回は計画のみ。mainマージ・本番Pages変更は未承認。

## 現在の正本と公開導線
- Repository Naoto214/naotocchi、PR412 feat/naopoyo-rescue-20261021。
- 調査時main a037b3abe4f97b6e9bfb4838e854161c53ece6ba。
- 本編index.htmlのゲーム選択 → prototypes/naopoyo/。説明は「スライド・ドロップ」。
- prototypes/naopoyo/index.html → slide08/player.html と growth-clear/player.html。旧記録からgrowth-chain/player.html?series=1へのリンクもある。
- series.mjsは旧ゲームのSettings/SlideStore/PlayerStoreをimportする。単に旧カードをCSS非表示にするだけでは旧データ処理が残るため、正式版の入口ではこのスクリプトを読み込まない。
- tools/pages/allowlist.jsonは正確なfile/entrypoint列挙。現在はgrowth-chain/growth-clear/slide08も公開対象。
- .github/workflows/pages-runtime.yml: PRはbuildだけ、main pushはdeploy。マージと本番公開を別物と思い込まないこと。

## 最小PR構成
### A: PR412 — レスキュー本体の採用
本人の今回最終iPhone QA合格と明示的なマージ承認後、最新mainとの差分・CIを確認。変更はレスキューの独立ディレクトリのみ。現在のallowlistには未登録なので、このPR単独のマージでは本番導線を切り替えない。

### B: 小さな公開導線切替PR — 正式公開の実施単位
PR412を取り込んだ最新mainから作る。必要ならAをbaseとするDraftで先にレビュー可能。今回作成・マージはしない。
1. root index.htmlのゲーム説明を「合体・分裂でみんなを救出」へ。名称は「なおぽよ」。入口URL prototypes/naopoyo/は維持。
2. 旧prototypes/naopoyo/index.htmlはlegacy-index.htmlとしてソース保存。index.htmlはレスキューだけへの短い入口/転送に置換し、旧series.mjsを読み込まない。favorites/recordsの旧導線も通常画面から外す。旧series.mjs・settings.mjs・CSSは保存。
3. レスキュー画面の見出し/titleを正式名称「なおぽよ」にし、「なおとっちへ戻る」導線を追加。本編から起動/復帰を確認。
4. allowlistにレスキューの実行11ファイルを追加: index.html/style.css/app.mjs/render.mjs/fixtures.mjs/conditions.mjs/engine.mjs/input.mjs/store.mjs/stages.mjs/solutions.json。entrypointにも登録。変更した動的実行ソースのreviewed_runtime_sourcesハッシュと必要な動的契約も更新し、梱包ガードを満たす。
5. growth-chain/growth-clear/slide08の旧ゲームentrypointsと専用公開ファイルをallowlistから除外。旧hubのlegacy-index.html/series.mjsは配信しない。共有資産は本編依存を検査して必要分を維持。コードそのものはGitHubに残す。
6. 通常画面/ヘルプ/記録/直リンクを点検。旧URLは静的404または保存を書き換えない「公開休止・なおぽよへ」案内とする（最小案は404）。旧ゲームを実行する隠し導線は作らない。
7. パッケージ・HTTP検証で本編、カードゲーム、なおぽよが正常、旧ゲーム実行ページが非公開であることを確認。1回の本番デプロイで新作入口と旧作非表示を同時反映。

## 保存データ保護（移行コードを作らない）
|領域|キー|扱い|
|レスキュー|naopoyo-rescue-v1|現行互換を維持。既存試遊Sitesと本番Pagesは別オリジンなので自動転送しない|
|スライド|naopoyo-slide-player-v1|読み書き・削除・初期化しない|
|現ドロップ|naopoyo-growth-clear-phone-v1|同上|
|旧ドロップ|naopoyo-player-v1 / naopoyo-player-owner-v1|同上|
|シリーズ設定|naopoyo-series-settings-v1|同上|
|入れ替え型|naopoyo-swap-prototype-v1|同上。PR405を保存し新規開発停止|

旧ゲームのコード・テスト・記録・実績定義・GitHub履歴は削除しない。公開除外とソース削除を混同しない。新入口の読み込みで旧Storeコンストラクタも実行しない。

## マージ条件と確認
- 本人iPhone QA: 07/10面の扉と出口、条件札の読める大きさ、犬/魚アイコン、開門後の通過、救出時だけ消える、01〜08の凡例、通常ドラッグ/Undo/リトライ/再読込、09面階段。
- A/B各PRの固定HEADに対して新規テスト+10面解答+旧パズル回帰、CIを確認。CI進行中を成功と扱わない。
- BではPages梱包テスト、実行11ファイルの依存到達性、旧URL除外、既存保存を番兵値で保護する独立テスト、主要本編リンクを確認。
- 本人がA/Bの対象HEADと本番公開を承認した場合のみ順にマージ。main push後のPages deploy成功と実配信を確認する。
- ロールバックはBをrevertして旧導線/allowlistを戻す。保存データ変換は行っていないので復元処理不要。Aは独立なので保持可能。

## その後
新ステージは10面程度ずつ、小さな独立PR。水中・回転・変身はまず少数実験面。旧ドロップ/スライド/入れ替え型の開発は停止し、成果再利用は個別に判断。
