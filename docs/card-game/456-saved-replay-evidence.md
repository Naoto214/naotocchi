# 456 — 保存対戦の候補・選択・判断機会の再検証

2026-10-04。455 HEAD `647e4af24c10879aea6e79c1441e559cece256d7` / tree `9b23574e3a2d635f6bfec9b7b2bd4a1babaae633` をremoteから復元し照合。PR259 Draft/open/unmerged。454承認範囲を継続し、対象docs/card-gameのみ。

## 455から追加する確認

455は供給された記録の投影一致を確認する第一段階だった。456は固定447保存群の各runについて、**保存された判断・選択・行動を実行器へ入力せず**、既存のsource検証付き初期入力loaderから439/447実行器を再実行し、元run全体のcanonical byteと照合するadapterを追加した。

比較対象は判断一覧だけではない。候補・公開情報・選択根拠・seed証拠を含むdecision、全event、全snapshot、runtime、予約/期限、end evidence、初期/最終状態、結果、stop、その他runの全fieldを比較する。欠落・追加・順序変更・flag差・bool/int差も不一致とする。初期順/デッキ/policyを変える新対戦ではなく、保存対戦の独立再生である。

各経路は同じ初期入力から旧114・414・A初版を再生する。実行器のscopeが共有moduleへ一時接続するため、経路間は別processで実行する。threadで共有scopeを混ぜない。

## 根拠と限界

|454の層|追加の根拠|そのまま残す限界|
|---|---|---|
|合法候補・情報制約|既存実行器がsourceを検証し、初期入力から各判断の候補/公開情報を再生成。それらを含む元記録全体と一致|既存実行契約の対象範囲内の再現性。全カード/全局面の合法性、既存実行器自体から独立した意味検証ではない|
|選択根拠|既存policyと116/119による選択・seed proofを再生成し一致。Aは既存447経路のまま|seededが再現できても戦略的未解決は解消しない。優越の最適性、Aの採用、追加価値意味論を証明しない|
|判断機会|初期状態からの独立実行で生成されたdecision配列・event・snapshotが全体一致。既存実行器内での記録漏れ/余分/順序違いを検出|元実行器と再生器に共通する未実装の機会はこの方法だけで発見できない。`opportunity_scope=existing_executor_only`。全ゲーム意味論上の網羅性は未証明|
|対戦・標本|保存結果と新たな独立再生の一致を追加証拠として保存|116除外、独立入力/標本設計、policy採用は別審査。balance_admittedはnull、独立balance0|

同じ実行器の再使用なので「独立した別実装によるゲームルール検証」とは称さない。再生成候補に既存契約上の盲点があれば、この一致だけで完全合法とは断定できない。455の未検証値を遡及更新せず、456の別証拠として保存する。

## 機械契約

- `load_saved_path(path_id)`：447manifest固定SHA、対象4path、各gzip SHA、当該3policy/run ID集合を検証。外部pathや別版manifestを拒否。
- `compare_replayed(saved, replayed)`：供給された2runの正準比較。これ単体はreplayの真正性を証明しない。完了・stopなし、identity/配列形を確認し、全field一致の場合だけ比較証拠を返す。
- `audit_saved_path(path_id)`：上記source loaderと既存実行器を自分で呼ぶ。保存decisionを入力しない。455の除外判定を保持し、実行前後の全tools source fingerprintも一致確認する。
- 生成証跡：各runおよびdecision/event/snapshotのhash、件数、scope、元の116除外、source file SHA、全tools fingerprintを保存。値不明をfalse/0にしない。判定をcallerの成功flagだけで通さない。

同じファイルに保存された複数policyや鏡像を独立標本数に数えない。再生不能・不一致は検証失敗として残し、敗北/0点・新たなfallback・適格標本に変換しない。

## TDD・保存

[実装計画](plans/2026-10-04-replay-evidence-456.md)。新専用テストは一致の限定意味、decision欠落/追加/選択/候補/flag変更、順序変更、その他run全field、bool/int差、停止/不正入力、固定source inventory、source改変拒否の8件。未実装RED→GREENを確認。

実行結果と検証ログは [data/proxy-replay-evidence-456](data/proxy-replay-evidence-456/) に追加保存した。新対戦・新policy・balance算入0。114/A初版/116/505/過去結果、72件別扱いを維持。実行engine/既存テスト/カード本文・数値・登録区分は変更しない。

この段階でも実際の算入条件は確定していない。未承認の標本設計、既存正本にない比較意味論、未知のゲーム裁定は実装しない。次の判断では、今回の既存実行契約内の再現証拠を、一般的合法性や戦略解決の証拠へ無断で昇格させない。

## 保存結果

- 固定4経路×旧114/414/A初版の12保存runを独立再実行し、全runのcanonical一致。2,378判断・3,129イベント・3,141スナップショット。新対戦0。
- 12runすべて既存116除外を維持。balance_admitted=null、独立balance標本0、新方式未採用。
- 専用8件RED→GREEN、455関連15件・116関連36件・119関連31件PASS。npm test 406件PASS。設計データ検査errors=[]。全proxy回帰の再実行は行っていない。
- 完了した4経路の証拠から集計を独立2回生成しbyte一致。12run再実行自体を2回行ったという意味ではない。
- 独立レビュー1回：Critical/Important/Minor各0。adapter・テスト・報告・4経路再実行出力が対象。最終集計と検証ログの梱包はレビュー後に追加。
- 既存追跡ファイルをgit blob単位で保護検査し、README索引以外はすべて保存一致。既存実行器・policy・テストは変更なし。

ここで機械的に確認できたのは既存実行器の範囲内での再現証拠であり、実際のbalance算入条件の確定ではない。既存保存群の戦略的未解決を解消した扱いにはしない。
