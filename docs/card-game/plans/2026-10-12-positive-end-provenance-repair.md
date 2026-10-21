# Positive誘発から終了履歴への証明接続修正

基点: ed131ade7fad0a49301ce675b95fbc8f1d8210cc。2026-10-12ユーザー承認の6項目をspecとする。実装はinline、bundle末尾に独立レビュー1回。PR259 Draft/open/unmerged。docs/card-game/のみ。

原本: proxy-population-400-run-20261012の初回未完了1/未実施399、固定入力proxy-population-400-20261012、旧edition、承認消費は変更しない。再実行/resume/seed生成は対象外。

## 計画と作業台帳

1. RED: 実handlerの発動/解決から証明を生成する共通契約。4source、回収、無成長、一時補正、不適用、対象退場、期限終了、100履歴、改ざん・未証明の拒否。
2. GREEN: 現行positive replayで既存遷移検証に追加して終了用証明を接続。時間幅・選択policy・カード本文を変更しない。
3. 固定sourceで関連回帰、現行population/mandatory全回帰、保存停止履歴の証明診断（対戦の再開ではない）。Python実行中編集禁止、PIPE/実exit/ログ/再帰指紋を保持。
4. 独立レビュー、必要修正のRED/GREEN、Git Data API expected_sha/force=false保存、remote/local/tree/clean確認。
5. 新editionと旧固定入力の結合方法を整理。旧manifest source_versionsが旧editionを固定するため、旧承認の流用・旧manifest上書きは不可。準備gateの再証明と真正な新requestが成立するまでは実行不可。

Pre-flight: positive runtime verifierは遷移boolean、end.verify_new_eventsはevent単位の分類/growth/durationを消費する。両インターフェースを証明builderで結合する。寿命の消滅確認は既存の全履歴遷移監査を前提とし、最終状態が空だけで証明しない。

Ruling: 既存107のpositive4sourceで本文・handlerに裏付けた機構を登録し共通builderを用いる。未知sourceや未定義機構を推測で登録しない。誤った登録なら誤通過を生むためsource拘束と改ざん負例で検証する。

進行: 共通builder、positive replayへの接続、4sourceの実handlerテストと保存停止履歴診断を実装。builder不在・接続不在・保存履歴の未解決188/194をREDとして確認後GREEN。保存履歴診断は終了監査で例外停止し、次ターン処理・対戦driverには入らない。保存capture/境界の利用は診断限定で、新edition admissionの証明ではない。

初回関連回帰: 11モジュール47件、実exit0/Ran47/OK、20.648秒、Python1093ファイルの前後指紋一致。独立read-onlyレビューはCritical0/Important0/Minor1。Minorは寿命identity変更・再出現拒否、旧duration委譲/復元、source拘束の恒久テスト不足で、テストを追加した。修正後再査読とは扱わない。固定sourceの全回帰は後続証拠に記録する。保存された876PASSは旧sourceの検証であり、この修正後のPASSへ流用しない。

## 新editionと固定入力の結合方針

既存launch_requestはedition、入力manifest、公開receipt、packageの7成果物、実行順400行、512step、retry/resume禁止を結合する。旧承認は消費済みで、新sourceへ転用できない。旧packageのedition/manifest.source_versions/generation operationは旧sourceを一体として固定しており、新editionの差替えだけでは既存auditに合格しない。

提案は旧7成果物を不変に保つappend-onlyのexecution binding証明である。元packageの公開commit/treeと全blob/hash、旧生成承認・消費履歴、旧editionを検証し、別に新実行editionと検証証拠を検証する。その間で200初期順・鏡像400行・全policy roots・デッキ・入力hash・実行順の完全一致を要求する。新OS乱数の取得や新generationとしての偽装はしない。新承認requestは両edition、旧package、binding証明、新実行保存先を一体として拘束し、旧attemptを置換しないことを明記する。

このedition間再結合の認可・検証schemaは現行契約に存在しない。今回の共通修正だけでは実行準備完了とはならず、新request hashを先に捏造しない。再結合契約とその検証、現行preflight再証明が成立してから、ユーザー本人が投稿する新launch承認本文を構成する。旧manifest・停止原本・旧承認は履歴のまま保持する。
