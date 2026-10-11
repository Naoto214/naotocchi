# 全実traceの107現物保存とsupervisor中断保存

基準 b5e18191209e2acb578a91805f2b586693ec1b05。2026-10-11。475/Aを再実装・再裁定せず、P06/P08の物理集合結合とP17の中断保存を進めた。対象はdocs/card-game/のみ。

## 実装

既存start source catalogのpinと107 fixture、opening.load_match、100/105 lifecycleのcreate/observeを再利用。初期入力の80現物・41種類を実runtime起点へ結び、全実event/envelopeの連続性、再登場metadata、所有者、全lifecycle journal/final、空legacy reservationsを照合する。connected_entryの実出力に監査を保存し、不一致は拒否。別のカード生成器・世代管理器は作らない。

これは供給された全traceの保存則であり、同じlife処理の利用を別実装による完全ルール証明へ昇格しない。observed_legacy_reservations_absentとlegacy_reservation_unreachable_provenを分離。外部起点認証、全handler到達、全判断機会、policy/balanceはfalse/nullのまま。未観測分岐の非到達は証明しない。

supervisorはKeyboardInterrupt/SystemExitを含め、request保存・子process呼出/結果検査・result保存中の中断を記録し、固定400行/200群を保持したsupervisor.jsonを保存後に中断を再送する。該当行はrecord_unverified、未着手行はnot_executed、後続childは起動しない。既に完了した行と部分ファイルを消さず、再実行・上書き・再試行はしない。

最終報告の書込み自体の再中断、電源断、SIGKILL、書込み不能はPythonで保存を保証できない。既存start/request/部分ファイルを残すが、それを完了報告と読み替えない。中断したresultファイルは不完全な可能性を保ったまま、最終summaryの当該行をrecord_unverifiedとする。

## 逐次TDD・独立レビュー

- source新4件: 不在4FAIL→4PASS13.060s。供給初期・metadata・現物追加欠落・所有者移動・journal改変・event/step欠落重複・世代receiptを拒否。
- supervisor新1件: KeyboardInterrupt/SystemExitでsupervisor.json欠落、2ERROR→PASS。完了済み1行の次で中断する試験も追加し、既存ファイル保持と398未着手を確認。
- 独立review1回、修正推奨2件。request/result書込みがcatch外で最終reportへ届かないこと、不明activation actorが所有者検査をすり抜けることを再現。レビュー側の変更なし。
- review RED: 新2件、1FAIL/2ERROR4.260s。actorとphysical ownerの明示照合、request/result保存の保護範囲を修正。再レビューは依頼せず、実装者の否定試験と固定結合で検証する。
- 最終関連22件: source-and-interrupt-confirmed-related.log、36.261s、OK、別exit JSONも0。模擬childの400予定行と、隔離processでの既存115/零rootの短い条件付きprefixだけを使用。本番400戦ではない。

## 不完全・失敗ログの扱い

source-and-interrupt-related.logは19件中1FAIL（隔離childが非zero終了）。当該子stderrはtemporary directory削除後に回収できず、原因は確定しない。診断用の同じ隔離試験は単独1PASS7.599sとなった。原因を推測で修正済みとはしない。

source-and-interrupt-final-related.logは20件目開始で途切れ、Ran/OKがない。tool sessionのexit0だけでは完了とせず、結果不明のまま保存。先に22PASSとした進捗報告は訂正済み。別subprocess wrapperで上記confirmed関連を実行し、終了コードを独立保存した。

初回の2件目テスト追加はcwdを誤った相対pathのため不成立。その後、絶対pathで適用した。旧ログを最終結果へ読み替えない。

固定結合、Python fingerprint、設計検査、保護番号付き正本、保存照合の最終値はsummary JSONを参照する。過去の全proxy/npm PASSを現行全回帰とは扱わない。
