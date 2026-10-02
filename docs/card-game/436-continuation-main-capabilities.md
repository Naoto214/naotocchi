# 436 — メイン能力の共通分類・即時結果証拠

435保存地点a1dd45ae994cc1401ac6554f0e48b6684c4d3464 / tree a5604044afe66d754b05a7b461b62c617c2b1773をremoteからfresh確認して継続した。432承認設計の能力分類・比較証拠へ限定してinline実装。新しいゲーム裁定や114/414の選択仕様は追加していない。

## 共通契約と接続

- M-beetle-02は任意の自分ターン終了時能力、M-antlion-06は自分のすぐつかう効果適用後の任意誘発能力として、本文・source SHA・表示段階へ分類を結合。独立した通常発動や配置直後の誘発として扱わない。未実装の将来発動を実行済みにしない。
- 即時メイン結果証拠は共有系譜/支払判定と完全合法集合へ結合する。改変action/source/card/paymentは拒否。未知の離脱・旧メインへの装備・世界誘発・未処理効果では停止。非公開山札順・相手手札順を価値根拠にしない。
- 通常比較の残るactionは元のscorerへ委譲し、最終候補から新しいmain候補を削らない。新証拠は誕生への加点やsafe free development認定ではない。新旧policyとも同じscopeを使用する。
- 到達した盤上C-chicken発動で、旧envelope validatorが盤上のカードと連鎖中の能力参照を二重所在と誤認していた。01/06/72の既存仕様に従い、所有盤面・card/copy identity・盤上link IDを検査するopt-in共有validatorを接続。参照自体はenvelope/hash/replayから消さず、物理カードの二重所在・不正装備等の検査も維持する。
- 新coverage `continuation_future_main_capabilities_v1`。435の条件証拠/完全state照合を継承し、scopeは入れ子・例外でも復元。旧435/434 defaultsと保存結果は維持する。過去結果を新版結果に書き換えない。

## fresh検証

- 専用20件を含む結合217/217 PASS、failure/error/skip0。continuation197＋capability12＋board reference5＋new runner3。全proxy1004件の実行結果とは主張しない。
- npm test406/406 PASS、fail/skip0。design/catalog errors0。
- 同じ135入力から旧/new8実行＋8独立再生を検証。別出力への再生成もpaired.json.gz/manifest.jsonがbyte完全一致。completed0 / stopped8 / not_executed0。欠測winnerはnull、独立balance0、採用false。
- 即時メイン結果証拠5件、条件証拠127件を完全snapshotから再検証。固定歴史scope21/21を維持。同じcoverage内の比較可能な公開判断10件、選択差5件。旧実行版との差はcoverage差であり、policy改善の証拠に加算しない。
- 505原本のhash一致。114/414を変更せず、過去tracked data789ファイルは435保存HEADとbyte一致。manifestの実行source26件をSHA照合。
- 盤上参照修正前の中間run/回帰は最終PASSに使用しない。最終独立レビュー1回はCritical0 / Important0 / Minor1。重要指摘の追加修正は不要で、再レビューを行わない。

## 到達点（435 → 436）

|経路|旧policy|pilot|今回の停止境界|
|---|---|---|---|
|01-A|31 → 53|27 → 27|世界配置の確定結果証拠／世界配置の実行adapter|
|01-B|24 → 43|26 → 26|世界配置の確定結果証拠／mainありpartner登場処理|
|02-A|51 → 51|41 → 41|世界配置の確定結果証拠／relationship確定結果|
|02-B|79 → 103|33 → 33|M-antlion-05の能力分類／relationship確定結果|

この接続は3旧policy経路の到達を広げたが、完走・勝敗・強さの比較はまだできない。M-beetle-02の終了時到達条件・山札操作、M-antlion-06の実際の誘発解決、main遷移の実行、I-bowtie開始能力・対象離脱等を対応済みとしない。

## 軽微な残件

盤上参照と手札発動が同一link IDを持つ外部作成の不正状態に対して、混在domainのID重複検査は未追加。現在の生成IDと署名付き初期入力からの独立再生はこの不正状態を生成/採用しない。実際の8軌跡の結果へ影響する問題は独立レビューで見つからなかった。任意の外部stateを受け入れる範囲を広げる前に、全activation IDでの一意性検査を追加する。

## 次工程

世界配置の確定結果/実行/応答、mainありpartner登場処理、relationship確定結果、M-antlion-05分類のうち、既存正本から一意に接続できる共通契約を次checkpointで監査する。新しいゲーム裁定が必要な場合だけ確認する。112未実行、balance0、採用保留、PR259 Draft/open/unmergedを維持。Ready化/main mergeは行わない。

[実装範囲](plans/2026-10-02-continuation-capabilities-436.md) / [最終証跡](data/proxy-continuation-capabilities-436/verification/) / [独立レビュー](data/proxy-continuation-capabilities-436/verification/independent-review.md) / [manifest](data/proxy-continuation-capabilities-436/manifest.json)
