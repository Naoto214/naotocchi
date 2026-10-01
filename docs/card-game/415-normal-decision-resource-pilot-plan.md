# 415 — 別版パイロット実装計画

414詳細仕様を人間が承認したため、[実装計画](plans/2026-10-01-normal-decision-resource-pilot-implementation.md)を作成した。開始remote HEAD `5b11164bfae326b8b282b24fbc18bb494a1eaa9c`、tree `8ab477fed68c88e0399457e7cb140ff45d853b1c`、PR259 Draft/open/unmerged。

7工程は、純粋比較器→116選択wrapper→可視情報と候補証跡→110局面shadow→同一初期入力8軌跡→指標評価→統合検査と全proxy回帰。各工程の新file・関数signature・RED→GREEN・保存地点を固定した。既存方式の再現不備があるままpaired比較へ進めない。

414の初期入力を実装で参照する際は、138が検査する135probeの実JSON `proxy-independent-seed-probe-20260924.json`を使う。137はそのsourceに対する応答ID設計の承認地点であり、架空の137入力JSONは作らない。

原本505 JSON、既存保存結果、114正本、112未実施6fixtureを保持。新方式は明示選択する別版で、比較結果を人間が確認するまで正本化しない。誕生への加点・強制、任意点数表、未公開情報依存、cacheは導入しない。

計画を414と突き合わせて自己レビューし、各仕様要求の担当工程、signatureの一致、5つのreview focusのtest、率の母数/欠測、証拠欠落とincomparableの境界を確認した。推奨実行方法はNative：主担当が逐次実装し、最後に独立レビュー。計画の書面確認と実行方法選択は未実施。

今回のproduction code/test変更0、新規対戦/event/decision0、独立balance標本0。実装・shadow・paired比較・専用テスト・npm test・全proxyを今回実行したとは記録しない。PR259 Ready化・main mergeなし。

保存前検査：catalog／既定設計検査exit0・errors0、原本505 JSONと承認済み414仕様不変、差分の空白検査成功。
