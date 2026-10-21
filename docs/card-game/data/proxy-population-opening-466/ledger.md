# 466 ledger
Base a514b4663b3eb71660e1e8810908f49351493f9a / tree cd1588de2f1ff428c38b8bd833112fa42fd89b30。remote一致、PR Draft/open/unmerged。
Pre-flight: loaderの107完全初期stateを開始bridgeが消費。465のafter_normal_draw入口へ通常draw適用直後のstateを渡す。追加draw後stateから渡す二重drawを禁止。bridge原記録をvalidatorが全再構成する。
Ruling: まず初回開始を独立したsource-bound接続として実装する。現行runnerが135保存prefixを前提にしているため、そのprefixの記録改名では新policyを適用できない。後続runtimeとの接続を別途要するコストを明示する。
Task1 complete: loader3件RED→GREEN。Task2 complete: opening3件RED→GREEN、計6。Task3 complete: audit3+CLI1件RED→GREEN、計10。
追加response工程: 5件RED確認後実装。初回duplicate testは107同ownerにG-hit-blowが複数あるというfixture誤認で失敗。実際は各owner全40名1枚ずつ。テストは明示した合成lookupで同名別現物を置き、局所列挙の非縮約だけ検証するよう訂正。真正107inventoryはbundle wrapperが別に検査し、local helperはentry_authenticated=false。

Final: related187 / npm406 PASS, design errors=[]; 3,688 protected blobs match (README only permitted existing change). Independent review once: C0/I0/M1. Minor readiness field/document mismatch resolved by explicitly scoping documentation to each API, no code change or second review. Packaging and README outside review scope. No actual seeds/input lock/matches.
