# 魔法岩 version 6 実装計画・設計

承認: 2026-10-25のユーザー仕様。一括承認に従い途中承認なしで実行。
Goal: 数字一致の時だけ透過し、不一致なら通常岩と同じ支持・障壁になる。
Architecture: 既存contact-v1/supported-v1を保持しterrainRules: magic-rock-v1で角判定を追加。terrainBlocks(s,a,x,y)を通行・支持・角に共用。第1章はopt-inしない。JS Canvas既存石描画を再利用する。

## 制約
mainマージ・本番Pages・第1章直接変更・正式画像変更は禁止。解答存在と最短性は分ける。

## 比較・採用方針
A 自然石に刻印: 岩としての支持が明確。大きい明るい数字と細い青緑の縁を追加して採用。
B 発光数字: 暗い背景では良いが常時発光は出口と競合。通過時のみ採用。
C 透明紋章: 岩の厚みが曖昧。比較資料のみ。
新画像は不要。第2章renderの正式な岩のCanvas形状・陰影を関数に抽出し双方で使用。

## Review Focus
- 逆方向交換者の条件が異なる場合の角判定
- 分裂子は親の数字ではなく1で角を判定
- 魔法岩上の合体・余剰・分裂による不正占有
- 旧保存の盤面・Undoを新ルールで復元しない
- 連続ドラッグ／落下で通過光が入力を止めない

## Tasks
- [x] 1. engine.mjs: terrainBlocksを共用、actorをcornerBlockedに渡す。条件一致／不一致、落下、空中上昇、双方交換、子配置、保存のRED→GREEN。旧ルール保持。
- [x] 2. 第2章stages revision4、terrainRules opt-in。progress新keyでcontact-v1進捗のみread-only移行。render自然石＋刻印、通過eventに短い光。A/B/C比較ページ。
- [x] 3. 全10面新規探索・実エンジン再生、旧19の42手監査、20新規探索。必要なら最小地形変更。全解答をsession保存/Undo/Retryで検査。
- [ ] 4. 合同パズル、本編npm test、CARD、Pages。独立レビュー、GitHub commit/push・Draft更新、本人限定v6配信hash照合。

## 監査の出発点
main=0b3bb1fe77f7b9829e94f2284ce2b56eb3fe1e0e、PR436=6e7521c39b9ec1a15d0351cd009f1f3688aa5020、435 merged。
既存supportsAtは不一致gateを支持、一致gateを非支持にしていた。cornerBlockedはwallのみ。canAscendは出発直下と到着直下の支持を両方要求。空中で門だけを根拠に登る仕様は存在しないため、再現fixtureと19の具体経路で評価する。

## 実行台帳
1〜3完了。追加承認不要の指示を優先しnative実装。19/20は解なしの根拠を得て各岩1個だけ除去。19旧42手、20旧85手の失敗を保持し新探索解を採用。重大なルール逸脱なし。レビューの未判定事項はsession全手監査・配信照合で補完し、最短性/本人実機は未確認として報告する。
