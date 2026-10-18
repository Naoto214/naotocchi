# 143 新seed次機会の横断監査

142保存JSON raw SHA `162f4de66bc0352b80e215f48a6651d00019c2897904c78d50023deda885b64b` から4状態を独立検証した。142以前のstate/hash、停止原本、カード本文・数値・登録区分を変更しない。新decision/event/snapshotは各0、completed 0、独立balance標本0。

| 経路 | 最終event | 現在機会・優先者 | 候補監査 | 完全性 |
| --- | ---: | --- | --- | --- |
| `probe-01-a-first` | 5 | C-chicken配置後response・A | 手札部分は`response-pass`のみ。盤上源`A-015#1`を保持 | 盤上誘発familyの列挙未証明 |
| `probe-01-b-first` | 5 | C-bat配置後response・B | 手札部分は`response-pass`のみ。盤上源`B-011#1`を保持 | 盤上誘発familyの列挙未証明 |
| `probe-02-a-first` | 6 | G-hit-blow解決後の通常行動・A | `candidate-place-partner-A-016#1`、`candidate-place-partner-A-018#1`、`candidate-place-partner-A-019#1`、`pass` | 125/127/128/132の12条件すべて真 |
| `probe-02-b-first` | 5 | Bの通常pass後response・A | `response-pass`のみ。Aの時0、盤上源・しかけ0 | 現在優先者について完全 |

01の手札候補を求める際は、138の開始時用列挙器へ一時的なphase投影を渡し、盤上なかまを投影から除いた。これを全候補の証明とは扱わず、保存JSONには実際の盤上源と`candidate_set_complete=false`を記録した。72本文のC-chickenは自分のターン開始時限定で配置後の過去の開始へ遡らない。C-batは相手ターンに自分がすぐつかうカードをプレイした時だけ任意発動し、今回の本人の配置では条件が成立しない。これらの具体例を根拠に、盤上誘発familyの一般列挙・除外証明を次の契約責務とする。特定経路・現物の例外実装は加えていない。

02-BのAは時0でE-first-date等を使えず、盤上源もない。手札候補監査の投影を元の`after_normal_action`窓へ戻し、119の後続遷移は未実行。BのI-c_coin2はBの手札に残るが、現在優先者Aの候補ではない。Bが先にpassした保存事実は変えない。

02-Aは公開情報とAの手札だけから現時点の3種の時0こいびと配置とpassを証明した。`A-019#1`は142解決時に公開・取得済みのカードで、非公開山札上の先読みはない。候補間比較と116の選択、配置後responseはまだ実行していない。

## 検証

専用2件のRED→GREEN、保存JSON `--check` 再生成一致（raw SHA `19a2a21d45d9304a8c1cdd1a98859254d5cdda4973dded2b67b6e3d72c4cd8b4`）、設計データ検査`errors=[]`。全proxy回帰は39ファイル・428件中427件PASS、FAIL1件、ERROR0件。唯一のFAILは既知117旧テストの歴史的件数期待190・実測263で、新規失敗0件。全件GREENとは扱わない。142原本raw SHAとそれ以前の保存証拠は変更せず、`git diff --check`を通過した。
