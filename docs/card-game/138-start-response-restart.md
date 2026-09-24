# 138 新seed開始時responseの候補列挙・独立再開

基準: 137保存HEAD `38bbc77b37d55afcc15070d4943705396649a0fb`、tree `cc0e125f437fe450b9df9a40a0d6d0449e4b700d`。135の保存JSON raw SHAは`1a497209d56f605e474f136777c06a3260b731417ca7940bc361f72850457a6c`。保存済み4経路のraw・game state hash・event seq2・snapshot連鎖を検査してから、それぞれ独立に開始時responseへ接続した。135以前の記録は変更しない。

## 承認済みIDと候補境界

137のA案を採用。`response-use-{play|item|event}-{source_instance_id}`を対象なしのresponse専用IDとし、宣言variantが必要な場合だけ`-variant-{114登録値}`を付ける。119の対象あり`-target-{target_instance_id}`と`response-pass`を保つ。通常行動の`candidate-`名前空間は使用しない。ID規則はcard IDや特定copyを含まず、未到達のtargetとvariantの複合などは定義しない。

開始時adapterは両者のboard・準備・予約・捨て札の空を保存stateで確認する。119の通常行動後専用adapterを変更しない。手札の114 actionと正本カード本文で発動可能性を分類し、未証明の条件や未知の有償quick-useはpass-onlyとせず停止する。G-hit-blowの7宣言は当該プレイヤーの山札上を見ずに候補へ加える。相手の非公開手札は本人の応答機会でだけ評価する。

| 135経路 | 最初のresponse候補 | 再開結果 | 最終有効event |
| --- | --- | --- | --- |
| `probe-01-a-first` | `response-pass` | A→Bが連続pass。121検査の`missing_exclusion_reason`で通常行動候補未完成と停止 | 4 |
| `probe-01-b-first` | `response-pass` | B→Aが連続pass。同じく121の`missing_exclusion_reason`で停止 | 4 |
| `probe-02-a-first` | G-hit-blowの7宣言＋`response-pass` | response seedで`partner`宣言を選択。発動・解決が未証明なので支払い・発動eventなしで停止 | 2 |
| `probe-02-b-first` | I-c_coin2＋`response-pass` | response seedでpassを選び、B→Aが連続pass。121の`missing_exclusion_reason`で停止 | 4 |

02-Aの宣言選択は非公開の山札上の的中情報を使わない。02-Bの選択はカードの効果が不適法という判定ではなく、証拠付きseeded fallbackの結果。通常行動入口に到達した3件は121の現在state監査を独立再計算し、`candidate_set_complete=false`と`missing_exclusion_reason`を保存した。未証明の発動や通常行動を実行したとは扱わない。

集計: planned 4／completed 0／rules stop 4／新decision 7／新event 6／新snapshot 10（各再開入口を含む）／winner 0／独立balance標本0。135のR1交換で全経路がseeded fallback使用済み。新eventはgameとcontinuationの両hashを連鎖させ、保存済み最初のgame hashから開始する。結果は`data/proxy-start-response-138-20260924.json`へ正準保存する。

## 検証

- TDDのRED→GREEN: 専用6件。保存JSONの`--check`、source raw SHAと初回before hash、各event/snapshotのseq・game/continuation hash・canonical bytesを確認。
- 119/120の歴史的proxy件数から138専用テストだけを除外する検査境界変更を加え、当時の件数・119/120の保存データは変更しない。
- 全proxy実測件数・PASS/FAIL、設計データ検査、保存後のGitHub workflow/status件数は検査結果が揃ってから確定する。117旧テスト期待190／実際263は既知の独立した件数差として分離する。

カード本文・数値・登録区分変更0。次の接続対象は、通常行動の新初期順候補完全性と、実際に選択されたquick-useの支払い・発動・逆順解決の証明。
