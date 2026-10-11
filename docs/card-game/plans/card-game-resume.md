# CARD GAME 最小再開メモ

最新の正本はGitHubの `design/card-pool-master-20260914` のfresh exact-ref。本文中の固定SHAよりremoteが進んでいればremoteを優先する。

## このメモ作成時の検証済み実装

- HEAD: f38d620908de3cd0b6757276f9ef2fe76f1ec2a5
- tree: 8338758bd7bda6a769296dc91bfae3f180a66f25
- PR259: Draft/open/unmerged。変更対象docs/card-game/のみ。
- 通常/response predicateの不完全被覆停止、4source事象窓の閉包、非fallback選択計算/全候補支払/response比較前提を実入口へ接続済み。再実装しない。
- 関連41件PASS。保存115/零rootの完全入口143step/181event、ordinary118件・選択計算監査108件、connected監査errors=[]、実行中source1068件不変。全proxy回帰完了ではない。
- 検証要約: data/proxy-population-effective-application/verification/ordinary-entry-verification-summary.json
- 完全条件付きrecord: 同verification/ordinary-entry-restored-record.json.gz
- 環境整理と証拠欠落の経緯: 同verification/ordinary-entry-review.md、session-stop-2026-10-11.md

## 再開手順

1. fresh remote HEAD/tree・PR259を確認する。checkoutが消失した場合だけこのブランチから復元し、local HEAD/tree/cleanを照合する。既存差分があれば消さずに確認する。
2. このメモとstatus.mdの最新追補を先に読む。過去の長大な履歴・関連41件・完全入口検証を、環境を復元したという理由だけで全てやり直さない。
3. P10実read経路の確認はverification/public-read-boundary-review.mdの表から再開する。runtimeで過去比較borrowが無効なことは確認済み。C-chameleon公開適用証拠のfull hashをpublic_board_sha256へ分離済み（関連19PASS、独立4PASS）。通常UNIT/ADMITTED/MAIN_TRANSITIONとresponse hand/boardのfield対応、P11その他operand、P09機会対応が次。有限検査や同じ実行器の再現を全情報利用の証明へ昇格しない。
4. 手札G-air-hockeyの発生機会別導出/実入口・coverage接続も完了（verification/hand-occurrence-independent-review.md、関連29PASS、独立15PASS）。3bundle後の旧115/零root全入口結合は完了（verification/three-bundle-connected-98a62f1-*）：143step/181event、7監査errors=[]、114.713s/exit0、docs再帰Python1068前後一致。再実行不要。開始時producer/replay同時省略の拒否も追加済み（verification/start-collection-review.md、関連34PASS、独立10PASS）。次はP09残りarrival/end/自動機会、P10 full-envelope adapterの許可field、P11上位operand根拠と最終gate合成。ちょうせん宣言delta0と比較operandの混同は現行unproved_priorityで遮断済み（challenge-unknown-review.md、32PASS/独立10PASS）。合法候補/宣言は保持、未知は116除外。上位比較唯一winnerの比較記録/支払gate接続も完了（verification/upper-comparison-entry-review.md、関連36PASS、独立19PASS）。再実装しない。P07–12の全source機会/情報/他operandとP14–18の最終合成・版固定検証を既存22項目台帳で続行する。常時閉鎖の本番gateを、局所PASSだけで開かない。

## 保存の区切り

- 一つの共通責務の修正を検証したら、次の大きな検査/別責務へ進む前にGitHub commit/refまで確定する。原本log、実exit、source指紋、未完了点を同じ単位にまとめる。
- 大きな検証前に保存する場合はpendingと明記する。プロセス参照不能・log欠落は結果不明として保持し、結果不明の処理だけ必要最小限で再検証する。
- Git Data APIでexpected_shaを指定、force=false。remote HEAD/treeとPR状態を確認し、localを一致させる。blobのみの退避はcheckpoint完了ではない。
- 各保存でこのメモの検証対象と次の一手を更新する。新commit自身のSHAを本文へ自己参照させる必要はなく、最新保存位置はremote exact-refから取得する。
- セッション終了時は実行中の有無・最後の保存HEAD・未保存差分・未完了検証を明示する。バックグラウンド継続を確認していない場合、継続中とは言わない。

## 保護と承認

preflight-ready=false。seed生成/本番入力固定/400戦開始は未実施。このメモは生成・開始の承認ではない。A裁定475・B裁定474・指定mandatory1/N・旧116除外・114/116/119/過去結果の保護を維持。未知を0/同価値にしない。全体結論null、policy promotion=false、独立balance標本0。main/フロントエンド/World/Character3Dには触れない。
