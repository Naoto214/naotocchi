# 第1戦の履歴ID参照障害：共通修正

対象は PR #259 / design/card-pool-master-20260914。調査開始正本は `08744087a6d361624f135d1d28212d7668dddcef`、tree `e52a3518f1d386b49e1f6daadf5a6c4b878714cd`。開始時にremote・local一致、clean、Draft/open/unmergedを確認した。修正コードの保存地点は `2ec0c668af76d43e6c6fcd2af0a7ba6697da63d3`、tree `84a3b9cf6c2e022c85e45e55bbddd872346f8435`。最終監査保存commitはこの報告の後続commitである。

## 原因と証明範囲

停止原本 `../proxy-population-effective-application/verification/launch-6162350238-20261014/worker-stderr.txt` の完全なtracebackを再利用した。経路は attempt_runner → connected_entry → challenge/incarnation/positive/trigger window → runtime._step → end.forced → end_scope → 複数の履歴検証層 → quick.verify。最後は旧 `proxy_continuation_quick.py` の `g['cards'][source]`、`KeyError: 'A-035#2'` である。

この検証器はイベント種別を確定する前に、イベント直前snapshotのカード辞書からイベントsourceを参照していた。現行の `Connection.finish` / `rebind_entry` は物理カードの再入場時に後継IDをafter側へ登録し、入場eventのsourceを後継IDへ変更する。一方、選択されたcandidateはbefore側の前身IDを保持する。過去snapshotへ将来IDを加えず、旧IDのmetadataを保持すること自体は既存のincarnation契約に一致する。これを知らない旧履歴分類器の事前参照が契約不整合である。

固定material上の A-035 は I-sleepboost1。合成unit fixtureで、同じネイティブ装備再入場処理から A-035#2 を生成し、before辞書には存在せずafter辞書に存在すること、および旧quick/trigger分類器で同じ参照障害が発生することをREDで確認した。I-poop1の準備再入場でも再現した。person placementとbirthの旧履歴再生には、前身candidateの復元後にincarnation finisherを経由しない同種の不整合があった。

**限界：** 保存された本番停止証拠には完成したrecord/transcriptがない。元の第1戦での正確な生成seq、選択action、停止stepは確定できない。unit fixtureは共通欠陥の再現であり、失われた本番履歴の復元や400戦完走の証明ではない。不明な履歴を補完していない。

## 修正契約

現行専用 `proxy_population_history_replay.py` を追加し、incarnation windowでruntime scope構築前に導入した。旧464–468の凍結ソース、認証契約、catalogは元のbytesを保持する。

- quick/board分類器は、担当するevent種別・source zoneを確認してからbefore側IDを参照する。適用対象の未知IDは引き続き拒否する。
- legacy person/birth履歴は、before状態の完全な合法候補集合からselected_candidateを解決し、既存native placementと同じincarnation finisherで再生する。eventとafter-envelopeを完全比較する。
- 既存のsnapshot coverage、state/hash、runtime遷移分類、終了判定、response/chainの検証を維持する。旧scopeの列挙・実行・分類処理は再利用し、履歴検証器のみ差し替える。
- scopeは非再入で、正常終了と例外時に復元する。特定IDの例外、KeyErrorの握りつぶし、推定metadataの注入、ゲーム裁定変更はない。

最終差分で既存ファイルの変更は incarnation_runtime と incarnation_window の2点のみ。新adapter・テスト・監査資料を追加した。すべての既存data 3,325ファイルのtree entryは開始正本と同一。固定200組×鏡像400戦、seed、初期順、予定集合、512step上限、旧停止原本、消費済み承認は変更していない。

## TDD・回帰・レビュー

REDログは verification/history-red.log と history-placement-red.log。重点7テストは adapter-focused.log。装備・準備・人物・出生の再入場と第1世代、receipt/snapshot/hash改ざん拒否、適用対象未知IDの拒否、旧464認証のscope内外一致、例外・再入時復元を確認した。

修正adapterを有効にしたまま既存end/quick/triggers/state/actions/preparation/challenge/batchの100テストもPASS（adapter-legacy-regression.log）。全体回帰は **214モジュール／1149テスト、全件PASS**。初回4ログの完了行欠落を検知し、その4件だけを再実施して48テストの完了を確認した（重複計上なし）。初回ログ欠落の原因は未確定。結果は verification/final-regression-summary.json を参照。対象は既存192モジュールにcontinuation全体と今回テストを加えたもの。実行中の全toolsソースhashが不変であることも記録する。

途中の直接修正・派生catalog方式は旧認証source pinの回帰失敗で棄却した。checkpoint `493fda7c` は最終方式ではない。初回と派生catalog試行の失敗summary/logも監査として保持し、成功扱いしない。認証464を変える方式や固定入力の再生成は採用していない。

独立レビュー `/root/history_contract_review` は最終adapter差分を確認し、重大・重要な未解決問題なし。独立に重点7テストを実施しPASS。詳細は independent-review.md、レビュー済みsource hashは reviewed-sources.json。

## 他カードと次工程

修正は物理カード再入場と履歴参照の共通境界に適用される。I-sleepboost1専用ではなく、準備・人物・出生の同種経路を保護する。カード効果、値、終了条件を変えず、未対応・未証明経路はunknown/fail-closedのまま。policy適格、戦略優劣、カードバランスは今回のテストから証明されない。

今回の本番実行数は0。以前の累計は着手1、完走0、未実行399のまま。supervisor再起動、worker起動、承認消費、対戦retry/resumeは実施していない。既存unit testsは合成fixtureとテスト用一時出力であり本番batchではない。

次段階は別判断の下で修正済み新editionを準備し、既存固定materialを変更せず再結合・hash/来歴/manifest整合性を証明し、preflightと新request公開へ進む。その後に新しい本人承認とfresh開始前検証が必要。消費済み6162350238（および6159857990）は再利用不可。今回新edition・request・本人承認は作成していない。
