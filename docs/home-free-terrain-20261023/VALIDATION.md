# 最終検証

- 正式 `package.json scripts.test` の全8グループを順番に実行。Node test concurrencyのみ8に設定。
- **3,468/3,468 PASS・0 FAIL**（64 + 26 + 24 + 3,217 + 137）。smoke / dialogue / visual checksも同コマンド内で完走。`logs/full-suite-release.log` 末尾 `ALL_OFFICIAL_GROUPS_PASSED 8`。
- Python `tests/pages/test_*.py`: **15/15 PASS**。
- 配布allowlist: runtime 4,050ファイル、static参照1,669 / dynamic参照2,954を検証。試遊変換後4,056ファイルのSite source照合不一致0。
- `git diff --check` 成功。最新remote main acd4ece1がPR baselineの祖先であることを再確認。
- 最初の全体実行はキャッシュhash不一致2件を検出。修正後に対象群257件を再実行し成功、その後最終の全8グループを再実行して上記全件green。途中の追加実行はユーザーの再送時に中断され、最終記録には数えない。
- fresh reviewの重要指摘3件（非表示通知消失、mask枠外切れ、古い投影cache）を修正。RED/GREENログと実画面を保存。
- Cloud Chrome、Canvas 3D、約1fps制限。iPhone Safari/WebGL実機QAは未実施。最終採用は本人判断。
- 320/375/390/430×844の情報/通知/会話/操作を確認。追加の320×568でもボタン下端555pxで画面内、stage高さ175.56px。低い画面では活動空間が小さくなる。
- 生きた6体fixtureの自律行動を記録。city: clock51.4、移動43、距離724.94px。forest時点: 累積移動186、距離2550.50px。river時点: 累積移動235、距離3372.63px。地域別の件数に読み替えない。各JSONに描画・環境life・個体位置を保存。
