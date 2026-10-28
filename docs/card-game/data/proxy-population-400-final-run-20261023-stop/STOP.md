# 固定400戦 本番 第4回（2026-10-23）：環境消失による停止

本番出力先 `proxy-population-400-final-run-20261023/` は supervisor が書いたままの状態で保存した（追記・修正なし）。この文書は別ディレクトリに置いた停止記録である。

## 起動
- 承認：PR #408 コメント `6356164698`（Naoto214）。request sha256 `8ff741ec1c54aac25a45c1fc00827c33424a63702a37dfa0cf823aa639fdd2f7`。
- 事前照合（read-only）：本人・本文完全一致・未編集・未取消・PR Draft/open/未マージ・remote HEAD `609d525a` 一致 → 合格。1回限りの消費を実施し、claim を `babd88f7`（`609d525a` の直接の子、claim 1ファイルのみ）として保存・push。
- edition `33cb2f85`（tested `f1025fdd`、preflight_ready true）、binding/manifest 公開 `609d525a`。
- supervisor 起動 2026-10-23T02:53:48Z。`start.json` の launch_authorization_bound=true、errors=[]。

## 結果
| 行 | match | 状態 |
|---|---|---|
| 1 | group-001-A-first | **completed**（241 decision・307 event、R10最終比較で B 勝利 30–35、record sha256 `f7b0947f…`） |
| 2 | group-001-B-first | 開始（`request-0002.json` 03:16Z）直後にコンテナ再起動で supervisor・worker が消失。`result-0002.json`・`attempt-0002/`・`supervisor.json` なし |
| 3–400 | — | 未実施 |

- 第1行の record は診断（`44d54844`、diag31）と play digest（決定列・event骨格・最終盤面）が一致。
- 1行あたりの実時間は約22分（worker 事前照合 約2分、対局 約9分、record 検証 約10分）。400行の直列実行では約6日かかる。

## 扱い
- 既存の契約どおり、環境消失は停止とし、自動 resume・retry はしない。保存 checkpoint を理由に別 attempt へ切り替えない。承認 `6356164698` は消費済みで再利用しない。
- 本番累計：完走1・未完了1（第2行、記録なし）・未実施398。固定400戦の完了条件は未達。
