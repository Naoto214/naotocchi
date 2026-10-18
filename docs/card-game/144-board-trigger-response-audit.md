# 144 盤上誘発responseの現在機会監査

143保存JSON raw SHA `19a2a21d45d9304a8c1cdd1a98859254d5cdda4973dded2b67b6e3d72c4cd8b4` を再生成照合し、143で残した盤上誘発familyを現在の配置eventと72本文から照合した。01-A/Bの手札部分候補`response-pass`、準備枠0、相手盤上源0を保持する。

| 経路 | 盤上源 | 現在の起点 | 本文上の発動条件 | 結果 |
| --- | --- | --- | --- | --- |
| `probe-01-a-first` | C-chicken | 自分の配置 | 自分のターン開始時。配置後に過去の開始へ遡らない | 現在は不成立、`response-pass`のみ |
| `probe-01-b-first` | C-bat | 自分の配置 | 相手ターンに自分がすぐつかうカードをプレイした時 | 現在は不成立、`response-pass`のみ |
| `probe-02-a-first` | なし | 解決後通常行動 | 143の通常行動4候補を保持 | 完全 |
| `probe-02-b-first` | なし | 通常pass後response | 143の優先者Aの候補`response-pass`を保持 | 完全 |

盤上源はカードIDに結び付く本文のtiming条件で分類し、経路名・特定copyによる分岐を設けない。今の局面では発動条件が成立しないため、response用stable IDや効果解決を先取りしない。条件が成立する将来の局面では、この除外を流用せず候補を改めて証明する。全4経路の現在機会は候補集合完全となったが、144はdecision/event/snapshotを追加しない。completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。

## 143検査器の保存形式差

143のPython監査器は01の`board_sources`をtupleとして作る。保存JSONでは配列となるため、143の行比較`validate_result`を保存JSONを読み込んだ行へ直接呼ぶと01-A/Bが不一致になる。一方、143の固定raw bytesは143 builderが独立再生成した正準bytesと一致する。144はその原本raw SHA・正準bytesを照合し、143を変更せずに引き継ぐ。この形式差をゲームstate/hash破損または新裁定とは扱わない。

## 検証

144専用2件PASS、保存JSON再生成一致（raw SHA `1df03987c5645ae3f3d1e13318c2a10e1abeda6e753cb76c8b7d855cd996dd7b`）、設計データ`errors=[]`。全proxy40ファイル・430件中429件PASS、FAIL1件、ERROR0件。唯一のFAILは既知117旧テストの期待190・実測263で、新規失敗0件。全件GREENやCI成功とは扱わない。143以前の保護対象を変更せず`git diff --check`を通過した。
