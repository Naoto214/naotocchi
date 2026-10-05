# 468 — 通常入口から複数turnまでの共通runtime接続bundle

Base467 HEAD b2d56949ceb02a94e1ed1b4d2f84585917e3c835 / tree d1510879753a9b491b21eba603addae006a98d81。開始時remote/local一致、PR259 Draft/open/unmerged。対象docs/card-gameのみ。

## 接続

既存 `proxy_continuation_batch_runner` の9個のscopeとforced dispatcherをそのまま使う。135保存経路限定のdriverだけを新しいserialized operationへ差し替え、呼出し終了時に全hookを戻す。履歴比較証拠の借用は無効化し、新入力を旧135経路へ偽装しない。通常114/116、response119/120、chain/効果/装備/条件/世界/挑戦/終了監査の既存handlerを再利用する。

- 初期responseは466/467の全107 inventoryへ接続。候補が複数でも既存119を適用し、旧seededは除外として残す。
- 指定5 mandatoryは465の候補・途中state・選択適用と464の1/N算術を使用。盤面能力と406最終時間のcallbackを実際の中間stateへ結合する。通常/response/指定外へMRPを拡張しない。
- rule occurrence台帳は明示turn開始と各効果解決からOを作る。自動効果もordinalへ数え、履歴再検証callbackは既登録のoriginを再使用する。hidden stateのhashは監査上の同定専用で、乱数材料へ入れない。
- ターン終了は124の6段階履歴証拠を再利用。405のR10分岐について135からfirst_playerを検索する部分を明示入力へ接続する。R10比較は405比較関数。早期100維持・未対応予約等をこの接続で証明済みにしない。
- 次手番・通常draw・たまご交換・response再開をevent/snapshot連鎖として返す。山札不足時は01/02/64の可能な部分だけ行う。追加の価値点・優先順位はない。
- 400行の供給bundleを465/466で構造検査し、行から初期state・root・鏡像側・policyを結合するbounded offline入口を追加。供給choiceは実行へ渡さない。全recordのcanonical再構成比較で、lookupを含む差替え・欠落・型差を拒否する。

新規入口は実験dispatcherではなく、入力生成・lock・実行承認を持たない。`ready_for_execution=false`、`policy_eligible=null`、`balance_admitted=null`。再構成一致から機会完全網羅や全対戦適格へ昇格させない。`opportunity_scope=existing_executor_only`。

## 合成結合検証と残る境界

履歴115由来の供給順序とall-zero test rootを使う合成結合testで、40 bounded stepは50新規test event、39後続判断、R3両者開始まで到達した。さらに256上限の同じ合成probeはR9両者開始まで進み、152 event・115後続判断で `placement certain-effect proof unavailable` に停止した。これは新しい独立入力・実験対戦・balance結果ではない。probeは完走していない。テストに合わせたカード/経路別分岐は追加していない。

当該限界は、空き枠への安全無料配置証拠を、交代が必要な配置へ転用できないことと関係する。既存batchの交代処理もshared departure proofを要求する。116の「選んだ候補を解決継続できる」条件を省略してseedへ投げない。通常候補・選択・効果/離脱の各証拠を引き続き分離する。旧72件を遡及変更しない。

残作業：未対応の離脱/予約/100維持等の共通契約範囲確認、ルール由来の全判断/自動処理機会台帳、対戦→鏡像→400行の真正な算入審査、独立入力生成来歴/歴史入力台帳/lock認証、最終preflight。source pin・再現一致だけでこれらを完了扱いにしない。

seed生成0、予定400入力固定0、本番対戦0、独立balance標本0、新方式未採用。過去正本・結果は不変。実行準備完了後に生成/固定/実行の最終確認を行う。本bundle保存だけを理由に本線作業を終了しない。

## 検証証拠

[計画](plans/2026-10-06-population-runtime-468.md)、[証拠](data/proxy-population-runtime-468/verification/)、[source版](data/proxy-population-runtime-468/sources.json)。専用23件を含むpopulation関連68件PASS、npm406件PASS、設計検査errors=[]。source853件を固定。独立レビュー1回はCritical0 / Important0 / Minor1（test直接実行時の配置を修正）。レビュー後にR10実proof/replay/chain検証と最終hash出力欄を補完した。全proxy回帰は6独立process・378 module・1,406件PASS（failure/error/skip各0）をtool出力で確認した。ただし完了後の作業環境置換で未保存のraw log/worker JSONが失われた。再実行やraw log保存済みとは扱わず、観測できた完了集計とこの限界をverification/completion-observed-before-environment-replacement.jsonへ記録する。後続469追加testはこの件数に含まない。保護検査では既存3,731 blobが一致（README索引追加前）。
