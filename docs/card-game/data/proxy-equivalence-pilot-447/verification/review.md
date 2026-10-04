# 447 独立レビューと修正記録

446承認に従い、実装本人の逐次TDD後に独立レビューを1回実施。レビュー対象は81f5a31..8834b7e、初回313比較・12軌跡・当時の専用38件。最終再生成・全回帰・GitHub保存はレビュー時点では未完了であり、レビューの保証対象に含めない。以下の修正は本人が行い、再レビューは依頼していない。

## 初回指摘

Critical 0 / Important 1 / Minor 3。

- Important: placement IDを残してpass descriptorを移植すると入力APIが受理し、偽の同値証明が成立する。実実行側の再列挙と保存auditには保護があるが、公開証明APIの契約不備。候補ID・現物・canonical action template・variant・target・enumeration unitの結合、権利等の入れ子型検証を追加。3本の回帰テストがRED→GREEN。
- Minor: target/期限/回数/順序・依存cycle・共通世界のテストは主に改ざん拒否で、意味上の残差検証が不足。公開API改ざん試験を維持し、実在する世界/mainの公開台帳を使うkernel試験、効果属性、閉包の不完全性、捨て札/たまご差の4試験を追加。kernel fixtureは抽象比較器の受入検査であり、新たな合法対戦の実績ではない。
- Minor: 保存validatorがcanonical_sources/tools_sha256を照合せず、hidden_order_checksを再計算していない。manifest改ざん拒否テストをRED→GREENとし、fresh source検証・全新実装6module＋既存接続2moduleのhash照合・元snapshotからの秘密領域検査再計算を追加。
- Minor: 秘密領域検査が相手手札・山札の2分類のみ。裏向き準備札を加え、attempted/changed/passedを領域別に保存。実際に変更できなかった入力を変更実績に含めない。独立保存再検証でも再計算する。

判定: 入力改ざんは修正必須。保存provenanceと秘密領域件数は軽微という名称でも446の保存検証条件なので修正必須と扱った。意味検査は仕様拡大なしで補った。未解決指摘を採用根拠へ転用しない。

## 設計上の保守性と費用

- 全公開contextを依存の保守的上位集合とする。相互作用辺を消せるという正本結合の非干渉証明は実装していない。このため台帳の一部が一致しても、全context・境界・現物・不明義務が閉じなければ相殺しない。意味上の全同値を探索し尽くしたとは扱わず、証明coverageの狭さを結果に明記する。
- 446の接続予定ファイルは433前のrunner。実際の439はcontinuation_batch_runner経由なので、continuation_candidates/runnerの2箇所へ明示policy IDのopt-inを追加した。旧default出力8件は保存439と完全一致を別検査する。過去350 sourceのmanifestは書き換えず、基準git内容で350、現在内容で348を照合する。
- descriptor改ざん拒否の追加に伴い、不正actionを合法unknownと呼んでいたテストを構造error試験へ訂正。合法use_playの未解決効果試験は別に維持。未知を救済する変更ではない。
- レビュー修正中に走った旧二重生成はsource manifest差で不一致となったため、最終証拠に使わない。source固定後の別空ディレクトリ2回を最終証拠とする。

削減0件を理由とする比較規則・価値・優遇の追加なし。114/505/過去結果維持、新方式未採用、独立balance0。
