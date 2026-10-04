# 447 — 公開確定結果・残存効果の同値証明パイロット

2026-10-03。446承認に基づき、445案Aの保守的な別版証明器を逐次TDDで実装した。114正本は維持し、新方式は採用していない。比較規則・カード価値・期待値・誕生優遇・有限先読み・同名別現物の同値化は追加していない。結果が削減0件でも規則を足していない。

## 同一入力313件の結果

440/443/444のsource decisionと選択前snapshotを結合し、既存114・414・新別版を比較。基準はremote446 HEAD `81f5a31e48cf1a4e7bf4ccb986bdc998a70cf8df`、tree `f5ffcb7d937559cd909f43795c4d49c5576f1304`。

|群|件数|旧114 fallback|414 fallback|447別版 fallback|414からの選択変更|
|---|---:|---:|---:|---:|---:|
|旧時間優先128|128|0|128|128|0|
|旧安全無料配置46|46|0|46|46|0|
|旧でもseed基準群8|8|8|8|8|0|
|その他対照59|59|0|0|0|0|
|比較成立の計|241|8|182|182|0|
|旧適用限界・別枠|72|適用外|72|72|0|

**fallback削減0、frontier変更0、新たな候補間同値証明0。** 72件を比較成立へ変換していない。443の47/21/4分類、440の適用限界51/21という別軸の記録を維持し、実ゲームの停止・敗北に数えない。

## 証明器の範囲と限界

新入力は許可公開情報とactor既知情報だけを投影し、カードの現物・系譜、手札/盤面/捨て札/たまご、予約、runtime効果、権利、公開履歴、priority/連続pass/return/終了義務を保持する。下流証明器はfull stateを受け取らない。候補ID・実行descriptor・114候補表・正本hashを結合し、構造不正をseedで救済しない。

同値判定は、完全な公開contextを保守的な依存の上位集合として保持する。同一現物・対象・期限・回数・順序・境界・文脈が完全一致し、未解決義務が相殺可能な同じresponse operatorだけなら同値を証明できる。依存が残る要素を0/equalにしない。部分的に似ている盤面を同価値とせず、独立性の証明がない依存辺は除去しない。

この実装は**細粒度の非干渉証明を列挙する一般証明器ではない**。全context閉包により部分相殺のcoverageを狭くしている。削減0は今回実装・固定入力での結果であり、445の考え方全体で削減不能と証明したものではない。

1,222候補の内訳は公開prefix証明925、generator未対応297。公開prefixにも未解決の後続処理を残す。

|候補の未解決理由|候補数|
|---|---:|
|response/終了へ進む義務|407|
|配置後の登場・退場等|496|
|効果解決|22|
|generator未対応|297|

未対応297はchallenge146、relationship86、既存mainがあるplay_main59、未証明のcompanion配置2、partner配置4。個別カード/軌跡のパッチはない。支払・zone移動のprefixは実行可能なpost-stateとは主張せず、未解決actionを丸ごと残す。実エンジンは既存契約で進行するため、この証明器の未対応はゲーム停止ではない。

2,637候補pairすべてで残存identity/state差と依存未証明が残った。境界差1,363、generator未対応を含むpair928、登場・退場義務を含むpair1,815、効果義務153は重複するreason集計。旧安全無料配置46もこの同じ枠組みで扱い、無料という理由だけで他の有料候補より上位にしていない。既存116安全配置対passの限定証明は範囲を広げず維持した。

## 三方式12軌跡

既存114/414の8runを対照再実行し、別版4runを追加。12/12 R10完走、真正停止0、各run独立再生12/12一致、既存8は439の保存payloadと完全一致。新4は414と全normalized観測指標が一致した。NORMAL母数は実軌跡固有であり、上のshadow241と混ぜない。

|固定経路|旧114 最終成長A/B|414・447 最終成長A/B|414・447 NORMAL fallback|414・447 盤面流入 main/companion/partner/world/prepared|
|---|---|---|---|---|
|01-A先行|25/20|70/40|40/58|7/5/2/4/1|
|01-B先行|25/20|50/30|33/45|5/5/2/3/1|
|02-A先行|25/20|50/65|41/56|6/5/2/3/3|
|02-B先行|25/20|45/35|37/46|4/5/2/2/3|

旧114は4/108、新414・447は151/205のNORMAL fallback。盤面流入はsnapshotに現れた配置回数であり、main流入を誕生回数とは同一視しない。予約・runtime効果・期限終了・response・mandatoryも443と同じ定義で集計し、保存summaryに保持した。固定4組の結果で、独立balance標本0、旧/新の直接対戦ではない。盤面形成・成長の観測結果は維持されたが、新方式の強さ・採用根拠としない。

## 検証と保存

この中間保存では全proxy回帰は実行中。比較・12軌跡・二重生成・レビュー修正は検証済みだが、全回帰の最終PASSはまだ主張しない。最終集計後にこの段落を更新する。

- 専用47件、選択/比較/fallback結合58件PASS。RED/GREENのログを保存。
- 全proxy回帰の最終集計は `data/proxy-equivalence-pilot-447/verification/full/summary.json` に保存する。
- npm test成功（smoke/dialogue/visual QAとNodeテスト38ファイル）。設計データ検査・差分空白検査を実施。
- 同じ公開入力・証明・選択を保つ秘密領域検査: 相手手札313/313、山札途中313/313、裏向き準備の非公開本文identity40/40。計666件の実変更が不変。準備領域は313入力で検査し、変更対象なし273を40へ足していない。
- source固定後、空の別ディレクトリへ別processで全9成果物を2回生成し、保存byte一致。各runの独立再生とは別検査。保存validatorも元snapshot・入力・choice/action・source manifest・秘密領域件数を再計算して一致。
- 独立レビュー1回: 初回Critical0/Important1/Minor3。入力IDとdescriptorの結合、入れ子型、保存provenance、秘密領域分類、意味上の残差試験を同じ修正工程で補った。修正後専用47件PASS。再レビューは依頼していない。詳細は[review.md](data/proxy-equivalence-pilot-447/verification/review.md)。

全回帰は全モジュールを隔離processで実行し、レビュー後に変更した専用moduleは最終版で再実行して集計する。途中終了した旧serial実行と、source修正を跨いでbyte不一致になった初期生成は最終PASS実績へ含めない。

変更範囲はdocs/card-gameのみ。114/505/414/443/444/445/446、全過去data1,024ファイルを維持。既存実行系は実際の439呼出経路に合わせた明示opt-in接続2箇所のみ。歴史manifestの350 sourceは基準git内容で一致、現行は348一致＋当該2接続変更。歴史manifestは変更していない。旧440のreproduceを現行350 source一致として実行したとは主張しない。

成果物: [summary.json](data/proxy-equivalence-pilot-447/summary.json)、[manifest.json](data/proxy-equivalence-pilot-447/manifest.json)、[12軌跡summary](data/proxy-equivalence-pilot-447/trajectories/summary.json)、[再生成script](data/proxy-equivalence-pilot-447/reproduce.py)、[保護検査](data/proxy-equivalence-pilot-447/verification/protection.json)。再生成はrepo rootから `python docs/card-game/data/proxy-equivalence-pilot-447/reproduce.py --output /tmp/<新しい空ディレクトリ>`。

policy_promoted=false、新方式未採用、114維持。PR259はDraft/open/unmergedを維持し、mainへmergeしない。
