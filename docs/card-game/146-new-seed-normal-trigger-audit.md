# 146 新seed通常行動の盤上誘発分類

145保存JSON raw SHA `724f12b4bd38dc11bb2d4d672abf5cd753fca8daa110697e4f89499f087a9a8d` の4状態を独立再生成し、通常行動へ戻った01-A/Bを134の`response_triggered`一般分類に接続した。C-chickenは72の自分の開始時、C-batは72の相手ターンの本人quick-useにだけ誘発する。いずれも通常行動中に盤上から独立起動する能力ではない。114候補表には手札からの配置templateだけがある。134本体と過去の保存証拠は変更しない。

| 経路 | 145の最終event | 今の合法通常候補 | 盤上分類 |
| --- | ---: | --- | --- |
| `probe-01-a-first` | 7 | `pass` | C-chickenを`timing_not_normal_action`で除外 |
| `probe-01-b-first` | 7 | `candidate-play-main-B-001#1-birth`、`pass` | C-batを同じく除外 |
| `probe-02-a-first` | 6 | `candidate-place-partner-A-016#1`、`candidate-place-partner-A-018#1`、`candidate-place-partner-A-019#1`、`pass` | 盤上源なし |
| `probe-02-b-first` | 6 | ターン終了入口のため通常候補を列挙しない | 盤上源なし |

最初の3件は現在stateで125/127/128/132の12条件すべて真。盤上誘発には通常行動用candidate IDを発行しない。02-Aの3人は142で既に公開・手札取得済みの現物を含み、山札上を先読みしない。候補間比較と選択、ターン終了処理は次の独立再開で行う。146は新decision/event/snapshot 0、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。

## 検証

専用2件RED→GREEN、保存JSON再生成一致（raw SHA `d21dff526e1c699ee8fb3ccb2717355421c8a0d2bdccc78e37ba42d6869213da`）、設計データ`errors=[]`。全proxy42ファイル・434件中433件PASS、FAIL1件、ERROR0件。唯一のFAILは既知117旧テストの期待190・実測263で、新規失敗0件。全件GREENとは扱わない。145以前の保護対象を変更せず`git diff --check`を通過した。
